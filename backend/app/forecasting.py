from typing import Any, Tuple, List, Dict, Optional, Literal
import pandas as pd
import numpy as np
from app.data_loader import DataLoader, loader
from app.schemas import AlignmentReport

def get_forecast_vintages(
    df_wind: pd.DataFrame,
    cutoff_strategy: str = "da_dminus1_12",
    custom_cutoff_hour: int = 12,
    custom_lead_hours: float = 24.0,
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Selects forecast vintages strictly avoiding look-ahead bias.
    
    Strategies:
    - 'da_dminus1_12': Day-Ahead cutoff at D-1 12:00 UTC (Noon benchmark)
    - 'da_dminus1_11': Day-Ahead auction cutoff at D-1 11:00 UTC (EPEX SPOT / Nord Pool GB)
    - 'da_dminus1_17': Day-Ahead Elexon indicative cutoff at D-1 17:00 UTC
    - 'da_custom': Custom hour (0-23) on D-1
    - 'rolling_24h': Published at least 24h prior to target startTime
    - 'rolling_12h': Published at least 12h prior to target startTime
    - 'rolling_4h': Published at least 4h prior to target startTime
    - 'latest_predelivery': Latest forecast published on or before target startTime (lead_time >= 0)
    """
    # Filter windfor to January 2026 target delivery dates
    df_w = df_wind[
        (df_wind["startTime_dt"] >= "2026-01-01 00:00:00+00:00") &
        (df_wind["startTime_dt"] < "2026-02-01 00:00:00+00:00")
    ].copy()

    if cutoff_strategy.startswith("da_"):
        if cutoff_strategy == "da_dminus1_11":
            hour = 11
        elif cutoff_strategy == "da_dminus1_17":
            hour = 17
        elif cutoff_strategy == "da_custom":
            hour = int(custom_cutoff_hour)
        else: # default da_dminus1_12
            hour = 12

        # Target delivery day D (floor to midnight)
        target_day = df_w["startTime_dt"].dt.floor("D")
        cutoff_series = target_day - pd.Timedelta(days=1) + pd.Timedelta(hours=hour)
        valid_mask = df_w["publishTime_dt"] <= cutoff_series
        strategy_desc = f"Day-Ahead D-1 at {hour:02d}:00 UTC cutoff"
    
    elif cutoff_strategy.startswith("rolling_"):
        if cutoff_strategy == "rolling_24h":
            lead = 24.0
        elif cutoff_strategy == "rolling_12h":
            lead = 12.0
        elif cutoff_strategy == "rolling_4h":
            lead = 4.0
        else:
            lead = float(custom_lead_hours)
        
        valid_mask = df_w["publishTime_dt"] <= (df_w["startTime_dt"] - pd.Timedelta(hours=lead))
        strategy_desc = f"Rolling {lead:.0f}-hour minimum lead time cutoff"
        
    elif cutoff_strategy == "latest_predelivery":
        valid_mask = df_w["publishTime_dt"] <= df_w["startTime_dt"]
        strategy_desc = "Latest pre-delivery forecast (lead time >= 0 hours)"
    
    else:
        # Fallback to default DA 12:00
        target_day = df_w["startTime_dt"].dt.floor("D")
        cutoff_series = target_day - pd.Timedelta(days=1) + pd.Timedelta(hours=12)
        valid_mask = df_w["publishTime_dt"] <= cutoff_series
        strategy_desc = "Day-Ahead D-1 at 12:00 UTC cutoff (default)"

    valid_forecasts = df_w[valid_mask].copy()

    # For each target startTime, select the latest vintage published at or before cutoff
    if not valid_forecasts.empty:
        selected_vintages = (
            valid_forecasts.sort_values("publishTime_dt")
            .groupby("startTime_dt")
            .last()
            .reset_index()
        )
    else:
        selected_vintages = pd.DataFrame(columns=df_w.columns)

    metadata = {
        "strategy": cutoff_strategy,
        "description": strategy_desc,
        "total_potential_hours": 744, # 31 days * 24 hours
        "matched_hours": len(selected_vintages),
    }

    return selected_vintages, metadata


def align_forecast_and_actuals(
    data_loader: DataLoader = loader,
    cutoff_strategy: str = "da_dminus1_12",
    alignment_method: str = "exact",
    custom_cutoff_hour: int = 12,
    custom_lead_hours: float = 24.0,
) -> Tuple[pd.DataFrame, AlignmentReport]:
    """
    Aligns WINDFOR forecast with FUELHH actual generation for January 2026.
    
    Alignment methods:
    - 'exact': Matches hourly WINDFOR directly to FUELHH records with startTime at :00:00Z.
               Reports half-hourly (:30:00Z) FUELHH records as unmatched without interpolating.
    - 'hourly_mean': Averages the two half-hourly periods (:00 and :30) in FUELHH for each clock hour.
    """
    df_fuel = data_loader.load_fuelhh()
    df_wind = data_loader.load_windfor()

    # Filter actuals strictly to January 2026
    df_fuel_jan = df_fuel[
        (df_fuel["startTime_dt"] >= "2026-01-01 00:00:00+00:00") &
        (df_fuel["startTime_dt"] < "2026-02-01 00:00:00+00:00")
    ].copy()

    # Obtain selected forecast vintages
    vintages, vintage_meta = get_forecast_vintages(
        df_wind,
        cutoff_strategy=cutoff_strategy,
        custom_cutoff_hour=custom_cutoff_hour,
        custom_lead_hours=custom_lead_hours,
    )

    if alignment_method == "hourly_mean":
        # Aggregate FUELHH into clock-hour arithmetic mean
        df_fuel_jan["clock_hour"] = df_fuel_jan["startTime_dt"].dt.floor("h")
        actual_aligned = (
            df_fuel_jan.groupby("clock_hour")["generation"]
            .mean()
            .reset_index()
            .rename(columns={"clock_hour": "startTime_dt", "generation": "actual_mw"})
        )
        alignment_desc = "Hourly arithmetic mean of FUELHH :00 and :30 settlement periods"
    else:
        # Exact matching: select :00:00Z actuals
        exact_mask = df_fuel_jan["startTime_dt"].dt.minute == 0
        actual_aligned = df_fuel_jan[exact_mask][["startTime_dt", "generation"]].rename(
            columns={"generation": "actual_mw"}
        )
        alignment_desc = "Exact timestamp matching on hourly start times (:00:00Z)"

    # Build reference series for all 744 January hours
    all_jan_hours = pd.date_range(
        start="2026-01-01 00:00:00+00:00",
        end="2026-01-31 23:00:00+00:00",
        freq="1h",
        tz="UTC"
    )
    df_ref = pd.DataFrame({"startTime_dt": all_jan_hours})

    # Merge actuals
    df_merged = pd.merge(df_ref, actual_aligned, on="startTime_dt", how="left")

    # Merge forecast vintages
    vintages_clean = vintages[["startTime_dt", "generation", "publishTime_dt"]].rename(
        columns={"generation": "forecast_mw", "publishTime_dt": "vintage_publishTime"}
    )
    df_merged = pd.merge(df_merged, vintages_clean, on="startTime_dt", how="left")

    # Add error calculations where both actual and forecast exist
    df_merged["error_mw"] = df_merged["forecast_mw"] - df_merged["actual_mw"]
    df_merged["abs_error_mw"] = df_merged["error_mw"].abs()
    
    # Lead time in hours
    df_merged["lead_time_hours"] = (
        (df_merged["startTime_dt"] - df_merged["vintage_publishTime"]).dt.total_seconds() / 3600.0
    )

    # Status tracking
    df_merged["status"] = "matched"
    df_merged.loc[df_merged["forecast_mw"].isnull(), "status"] = "missing_forecast"
    df_merged.loc[df_merged["actual_mw"].isnull(), "status"] = "missing_actual"

    # Coverage statistics
    matched_count = int((df_merged["status"] == "matched").sum())
    total_hours = 744
    coverage_pct = round((matched_count / total_hours) * 100, 2)
    unmatched_count = total_hours - matched_count

    excluded_hours = (
        df_merged[df_merged["status"] == "missing_forecast"]["startTime_dt"]
        .dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        .tolist()
    )

    notes = [
        f"Alignment method: {alignment_desc}.",
        f"Cutoff strategy: {vintage_meta['description']}.",
    ]

    if excluded_hours:
        notes.append(
            f"{len(excluded_hours)} January target hours had no forecast published before the chosen decision cutoff. "
            f"Specifically for Day-Ahead cutoffs, 2026-01-01 target hours have no prior D-1 forecast because "
            f"the provided WINDFOR dataset begins publications on 2026-01-01 02:30:00 UTC. "
            f"These hours are excluded from error metrics to strictly prevent look-ahead bias."
        )

    if alignment_method == "exact":
        notes.append(
            "744 half-hourly FUELHH observations (:30:00Z) had no corresponding hourly forecast row "
            "and were deliberately excluded rather than duplicating hourly forecasts into half-hours."
        )

    alignment_report = AlignmentReport(
        alignment_method=alignment_method,
        cutoff_strategy=cutoff_strategy,
        total_target_hours=total_hours,
        matched_observations=matched_count,
        unmatched_observations=unmatched_count,
        coverage_pct=coverage_pct,
        excluded_target_hours=excluded_hours,
        notes=notes,
    )

    return df_merged, alignment_report
