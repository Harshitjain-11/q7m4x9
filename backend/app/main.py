import os
import sys
from datetime import date
from pathlib import Path
from typing import Optional

# Ensure backend root is in sys.path so 'app.*' imports work from project root or inside backend
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import pandas as pd

from app.data_loader import loader
from app.validation import run_data_diagnostics
from app.forecasting import align_forecast_and_actuals
from app.metrics import compute_error_metrics
from app.schemas import (
    HealthResponse,
    DataQualityReport,
    SummaryResponse,
    TimeSeriesResponse,
    TimeSeriesPoint,
)

app = FastAPI(
    title="WindLens API",
    description="Elexon BMRS Wind Generation Forecast vs Actuals Analytics for UK Electricity Market Purchasing",
    version="1.0.0",
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health", response_model=HealthResponse)
def get_health():
    """Returns application health and verifies dataset load state."""
    try:
        fuel_df = loader.load_fuelhh()
        wind_df = loader.load_windfor()
        return HealthResponse(
            status="healthy",
            version="1.0.0",
            datasets_loaded=True,
            windfor_records=len(wind_df),
            fuelhh_records=len(fuel_df),
            message="WindLens backend online. Datasets loaded and validated.",
        )
    except Exception as e:
        return HealthResponse(
            status="degraded",
            version="1.0.0",
            datasets_loaded=False,
            windfor_records=0,
            fuelhh_records=0,
            message=f"Error loading datasets: {str(e)}",
        )

@app.get("/api/quality", response_model=DataQualityReport)
def get_data_quality():
    """Returns exhaustive data quality diagnostics and cadence reports."""
    try:
        report = run_data_diagnostics(loader)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data quality diagnostics failed: {str(e)}")

@app.get("/api/summary", response_model=SummaryResponse)
def get_summary(
    cutoff: str = Query("da_dminus1_12", description="Cutoff strategy (e.g. da_dminus1_12, da_dminus1_11, da_dminus1_17, rolling_24h, latest_predelivery)"),
    alignment: str = Query("exact", description="Cadence alignment method: 'exact' (:00 only) or 'hourly_mean'"),
    custom_cutoff_hour: int = Query(12, ge=0, le=23, description="Hour on D-1 for da_custom cutoff (0-23 UTC)"),
    custom_lead_hours: float = Query(24.0, ge=0, le=72, description="Hours lead time for custom rolling cutoff"),
    start_date: Optional[date] = Query(None, description="Optional inclusive start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Optional inclusive end date (YYYY-MM-DD)"),
):
    """
    Computes summary forecast accuracy KPIs, daily error trends,
    alignment coverage, and data quality diagnostics.
    """
    january_start = date(2026, 1, 1)
    february_start = date(2026, 2, 1)
    start_date = start_date or january_start
    end_date = end_date or date(2026, 1, 31)
    if start_date > end_date:
        raise HTTPException(status_code=422, detail="start_date must be on or before end_date")
    if start_date < january_start or end_date >= february_start:
        raise HTTPException(status_code=422, detail="date range must stay within January 2026")

    try:
        df_aligned, alignment_report = align_forecast_and_actuals(
            data_loader=loader,
            cutoff_strategy=cutoff,
            alignment_method=alignment,
            custom_cutoff_hour=custom_cutoff_hour,
            custom_lead_hours=custom_lead_hours,
        )
        start = pd.Timestamp(start_date, tz="UTC")
        end = pd.Timestamp(end_date, tz="UTC")
        end_exclusive = end.normalize() + pd.Timedelta(days=1)
        df_aligned = df_aligned[
            (df_aligned["startTime_dt"] >= start.normalize()) &
            (df_aligned["startTime_dt"] < end_exclusive)
        ].copy()
        target_hours = int((end_exclusive - start.normalize()).total_seconds() // 3600)
        metrics, daily_metrics = compute_error_metrics(df_aligned, total_target_hours=target_hours)
        alignment_report.total_target_hours = target_hours
        alignment_report.matched_observations = metrics.matched_count
        alignment_report.unmatched_observations = target_hours - metrics.matched_count
        alignment_report.coverage_pct = round(metrics.coverage_pct, 2)
        alignment_report.excluded_target_hours = (
            df_aligned[df_aligned["status"] == "missing_forecast"]["startTime_dt"]
            .dt.strftime("%Y-%m-%dT%H:%M:%SZ").tolist()
        )
        alignment_report.notes.append(
            f"Summary metrics and coverage are scoped to {start_date.isoformat()} through {end_date.isoformat()} "
            f"({target_hours} target hours). Source quality diagnostics cover the full committed datasets."
        )
        quality = run_data_diagnostics(loader)

        return SummaryResponse(
            metrics=metrics,
            daily_metrics=daily_metrics,
            alignment=alignment_report,
            quality=quality,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute forecast summary: {str(e)}")

@app.get("/api/timeseries", response_model=TimeSeriesResponse)
def get_timeseries(
    cutoff: str = Query("da_dminus1_12", description="Cutoff strategy"),
    alignment: str = Query("exact", description="Cadence alignment: 'exact' or 'hourly_mean'"),
    custom_cutoff_hour: int = Query(12, ge=0, le=23),
    custom_lead_hours: float = Query(24.0, ge=0, le=72),
    start_date: Optional[str] = Query(None, description="Optional start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Optional end date filter (YYYY-MM-DD)"),
):
    """
    Returns time series records of paired actual vs forecast generation with errors.
    """
    try:
        df_aligned, _ = align_forecast_and_actuals(
            data_loader=loader,
            cutoff_strategy=cutoff,
            alignment_method=alignment,
            custom_cutoff_hour=custom_cutoff_hour,
            custom_lead_hours=custom_lead_hours,
        )

        # Date filtering if specified
        if start_date:
            df_aligned = df_aligned[df_aligned["startTime_dt"] >= pd.to_datetime(start_date, utc=True)]
        if end_date:
            # Include entire end_date (through 23:59:59)
            end_limit = pd.to_datetime(end_date, utc=True) + pd.Timedelta(days=1)
            df_aligned = df_aligned[df_aligned["startTime_dt"] < end_limit]

        points = []
        for _, row in df_aligned.iterrows():
            ts_str = row["startTime_dt"].strftime("%Y-%m-%dT%H:%M:%SZ")
            date_str = row["startTime_dt"].strftime("%Y-%m-%d")
            
            act_mw = None if pd.isna(row["actual_mw"]) else round(float(row["actual_mw"]), 1)
            fcst_mw = None if pd.isna(row["forecast_mw"]) else round(float(row["forecast_mw"]), 1)
            err_mw = None if pd.isna(row["error_mw"]) else round(float(row["error_mw"]), 1)
            abs_err = None if pd.isna(row["abs_error_mw"]) else round(float(row["abs_error_mw"]), 1)
            pub_str = None if pd.isna(row["vintage_publishTime"]) else row["vintage_publishTime"].strftime("%Y-%m-%dT%H:%M:%SZ")
            lead_h = None if pd.isna(row["lead_time_hours"]) else round(float(row["lead_time_hours"]), 1)

            points.append(
                TimeSeriesPoint(
                    timestamp=ts_str,
                    target_date=date_str,
                    actual_mw=act_mw,
                    forecast_mw=fcst_mw,
                    error_mw=err_mw,
                    abs_error_mw=abs_err,
                    vintage_publish_time=pub_str,
                    lead_time_hours=lead_h,
                    status=str(row["status"]),
                )
            )

        return TimeSeriesResponse(
            count=len(points),
            cutoff_strategy=cutoff,
            alignment_method=alignment,
            data=points,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate time series: {str(e)}")

# Mount frontend production build if available
frontend_dist_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist_dir.exists() and (frontend_dist_dir / "index.html").exists():
    from fastapi.responses import FileResponse

    # Mount assets directory for JS/CSS chunks
    assets_dir = frontend_dist_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # SPA catch-all fallback for client-side routing (/app, /app/analysis, etc.)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = frontend_dist_dir / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist_dir / "index.html")
