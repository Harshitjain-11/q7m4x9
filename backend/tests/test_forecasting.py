import pytest
import pandas as pd
from app.forecasting import get_forecast_vintages, align_forecast_and_actuals
from app.data_loader import loader

def test_anti_lookahead_synthetic_proof():
    """
    Constructs a controlled synthetic forecast dataset with two vintages:
    - Vintage 1: Published at D-1 10:00 (value 5000) -> before D-1 12:00 cutoff
    - Vintage 2: Published at D-1 13:00 (value 8000) -> AFTER D-1 12:00 cutoff
    Proves that Vintage 2 is NEVER selected under D-1 12:00 cutoff.
    """
    target_time = "2026-01-10 14:00:00+00:00"
    df_synthetic = pd.DataFrame([
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-09T10:00:00Z",
            "startTime": target_time,
            "generation": 5000.0,
            "publishTime_dt": pd.to_datetime("2026-01-09 10:00:00+00:00"),
            "startTime_dt": pd.to_datetime(target_time),
        },
        {
            "dataset": "WINDFOR",
            "publishTime": "2026-01-09T13:00:00Z",
            "startTime": target_time,
            "generation": 8000.0,
            "publishTime_dt": pd.to_datetime("2026-01-09 13:00:00+00:00"),
            "startTime_dt": pd.to_datetime(target_time),
        },
    ])

    vintages, _ = get_forecast_vintages(df_synthetic, cutoff_strategy="da_dminus1_12")
    assert len(vintages) == 1
    selected = vintages.iloc[0]
    
    # Must select the 10:00 publication (5000 MW), NOT the 13:00 publication (8000 MW)
    assert selected["generation"] == 5000.0
    assert selected["publishTime_dt"] == pd.to_datetime("2026-01-09 10:00:00+00:00")
    assert selected["publishTime_dt"] <= pd.to_datetime("2026-01-09 12:00:00+00:00")

def test_day_ahead_dminus1_excludes_unforecasted_jan1():
    """
    Verifies that for Jan 1st 2026, since no forecast exists prior to 2025-12-31 12:00,
    the model does NOT fabricate values or use later vintages.
    """
    df_aligned, report = align_forecast_and_actuals(loader, cutoff_strategy="da_dminus1_12", alignment_method="exact")
    
    # Target hours for Jan 1st
    jan1_mask = df_aligned["startTime_dt"].dt.strftime("%Y-%m-%d") == "2026-01-01"
    jan1_rows = df_aligned[jan1_mask]
    
    # All Jan 1st rows must be marked as missing_forecast under DA D-1 12:00
    assert (jan1_rows["status"] == "missing_forecast").all()
    assert len(jan1_rows) == 24
    
    # Days Jan 2 to Jan 31 must be matched (30 days * 24 hours = 720 hours)
    jan2_31_mask = df_aligned["startTime_dt"].dt.strftime("%Y-%m-%d") > "2026-01-01"
    jan2_31_rows = df_aligned[jan2_31_mask]
    assert (jan2_31_rows["status"] == "matched").all()
    assert len(jan2_31_rows) == 720
    assert report.matched_observations == 720
    assert report.coverage_pct == pytest.approx(96.77, 0.01)

def test_hourly_mean_alignment_averages_half_hours():
    df_aligned, report = align_forecast_and_actuals(loader, cutoff_strategy="da_dminus1_12", alignment_method="hourly_mean")
    assert report.alignment_method == "hourly_mean"
    assert report.matched_observations == 720
