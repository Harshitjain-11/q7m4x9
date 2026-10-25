from typing import Tuple, List, Dict, Optional
import numpy as np
import pandas as pd
from app.schemas import ErrorMetrics, DailyMetricPoint

def compute_error_metrics(df_aligned: pd.DataFrame, total_target_hours: int = 744) -> Tuple[ErrorMetrics, List[DailyMetricPoint]]:
    """
    Computes statistical forecast accuracy metrics on strictly matched pairs.
    
    Sign convention for error:
      Error = Forecast - Actual (MW)
      Positive error (> 0): Over-forecast (utility over-purchased power)
      Negative error (< 0): Under-forecast (utility under-purchased power, exposed to system imbalance)
    """
    matched = df_aligned[df_aligned["status"] == "matched"].copy()
    matched_count = len(matched)

    if matched_count == 0:
        empty_metrics = ErrorMetrics(
            mae_mw=0.0,
            rmse_mw=0.0,
            bias_mw=0.0,
            wape_pct=0.0,
            nrmse_pct=0.0,
            correlation=0.0,
            max_overforecast_mw=0.0,
            max_underforecast_mw=0.0,
            total_actual_gwh=0.0,
            total_forecast_gwh=0.0,
            matched_count=0,
            coverage_pct=0.0,
        )
        return empty_metrics, []

    actual = matched["actual_mw"].to_numpy()
    forecast = matched["forecast_mw"].to_numpy()
    error = forecast - actual

    mae = float(np.mean(np.abs(error)))
    rmse = float(np.sqrt(np.mean(error ** 2)))
    bias = float(np.mean(error))

    sum_actual = float(np.sum(actual))
    wape = float((np.sum(np.abs(error)) / sum_actual) * 100) if sum_actual > 0 else 0.0
    mean_actual = float(np.mean(actual))
    nrmse = float((rmse / mean_actual) * 100) if mean_actual > 0 else 0.0

    # Pearson correlation
    if len(actual) > 1 and np.std(actual) > 0 and np.std(forecast) > 0:
        corr = float(np.corrcoef(actual, forecast)[0, 1])
    else:
        corr = 1.0

    max_over = float(np.max(error))
    max_under = float(np.min(error))

    # Energy totals: MW for 1-hour interval = MWh. Divided by 1,000 = GWh.
    total_actual_gwh = round(float(np.sum(actual)) / 1000.0, 2)
    total_forecast_gwh = round(float(np.sum(forecast)) / 1000.0, 2)

    coverage_pct = round((matched_count / total_target_hours) * 100.0, 2)

    metrics = ErrorMetrics(
        mae_mw=round(mae, 2),
        rmse_mw=round(rmse, 2),
        bias_mw=round(bias, 2),
        wape_pct=round(wape, 2),
        nrmse_pct=round(nrmse, 2),
        correlation=round(corr, 4),
        max_overforecast_mw=round(max_over, 2),
        max_underforecast_mw=round(max_under, 2),
        total_actual_gwh=total_actual_gwh,
        total_forecast_gwh=total_forecast_gwh,
        matched_count=matched_count,
        coverage_pct=coverage_pct,
    )

    # Compute daily breakdown
    matched["date_str"] = matched["startTime_dt"].dt.strftime("%Y-%m-%d")
    daily_records: List[DailyMetricPoint] = []

    for date_str, group in matched.groupby("date_str"):
        grp_act = group["actual_mw"].to_numpy()
        grp_fcst = group["forecast_mw"].to_numpy()
        grp_err = grp_fcst - grp_act
        
        daily_records.append(
            DailyMetricPoint(
                date=date_str,
                mae_mw=round(float(np.mean(np.abs(grp_err))), 2),
                rmse_mw=round(float(np.sqrt(np.mean(grp_err ** 2))), 2),
                bias_mw=round(float(np.mean(grp_err)), 2),
                actual_gwh=round(float(np.sum(grp_act)) / 1000.0, 2),
                forecast_gwh=round(float(np.sum(grp_fcst)) / 1000.0, 2),
                observations=len(group),
            )
        )

    return metrics, daily_records
