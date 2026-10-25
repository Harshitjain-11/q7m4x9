import os
from pathlib import Path
from typing import Optional
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
    allow_origins=["*"],
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
):
    """
    Computes summary forecast accuracy KPIs, daily error trends,
    alignment coverage, and data quality diagnostics.
    """
    try:
        df_aligned, alignment_report = align_forecast_and_actuals(
            data_loader=loader,
            cutoff_strategy=cutoff,
            alignment_method=alignment,
            custom_cutoff_hour=custom_cutoff_hour,
            custom_lead_hours=custom_lead_hours,
        )
        metrics, daily_metrics = compute_error_metrics(df_aligned)
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
    app.mount("/", StaticFiles(directory=str(frontend_dist_dir), html=True), name="frontend")
