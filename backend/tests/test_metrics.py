import pytest
import numpy as np
import pandas as pd
from app.metrics import compute_error_metrics

def test_metrics_calculation_hand_checked():
    # Synthetic test DataFrame with 3 points
    # Actual:   [100, 200, 300]
    # Forecast: [120, 190, 330]
    # Error (F - A): [+20, -10, +30]
    # Abs Error: [20, 10, 30]
    # MAE = (20 + 10 + 30) / 3 = 60 / 3 = 20.0
    # Squared Error: [400, 100, 900] -> Mean = 1400 / 3 = 466.6667 -> RMSE = sqrt(466.6667) = 21.6025
    # Bias = (20 - 10 + 30) / 3 = 40 / 3 = 13.3333
    # Sum Actual = 600, Sum Abs Error = 60 -> WAPE = (60 / 600) * 100 = 10.0%
    # Mean Actual = 200 -> nRMSE = (21.6025 / 200) * 100 = 10.80%
    
    dates = pd.to_datetime(["2026-01-05 10:00:00+00:00", "2026-01-05 11:00:00+00:00", "2026-01-05 12:00:00+00:00"])
    df = pd.DataFrame({
        "startTime_dt": dates,
        "actual_mw": [100.0, 200.0, 300.0],
        "forecast_mw": [120.0, 190.0, 330.0],
        "status": ["matched", "matched", "matched"],
    })
    
    metrics, daily = compute_error_metrics(df, total_target_hours=3)
    
    assert metrics.mae_mw == 20.0
    assert metrics.rmse_mw == pytest.approx(21.60, 0.01)
    assert metrics.bias_mw == pytest.approx(13.33, 0.01)
    assert metrics.wape_pct == 10.0
    assert metrics.nrmse_pct == pytest.approx(10.80, 0.01)
    assert metrics.max_overforecast_mw == 30.0
    assert metrics.max_underforecast_mw == -10.0
    assert metrics.matched_count == 3
    assert metrics.coverage_pct == 100.0
    assert len(daily) == 1
    assert daily[0].date == "2026-01-05"

def test_metrics_empty_dataframe():
    df = pd.DataFrame(columns=["startTime_dt", "actual_mw", "forecast_mw", "status"])
    metrics, daily = compute_error_metrics(df)
    assert metrics.matched_count == 0
    assert metrics.mae_mw == 0.0
    assert metrics.coverage_pct == 0.0
    assert len(daily) == 0
