from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class DatasetQualityStats(BaseModel):
    file_path: str
    total_records: int
    valid_records: int
    null_counts: Dict[str, int]
    cadence_minutes: int
    min_timestamp: str
    max_timestamp: str
    min_generation_mw: float
    max_generation_mw: float
    mean_generation_mw: float
    is_valid: bool
    notes: List[str]

class FuelHHQualityStats(DatasetQualityStats):
    january_records: int
    february_excluded_records: int
    settlement_dates_count: int
    fuel_types: List[str]

class WindforQualityStats(DatasetQualityStats):
    unique_vintages_count: int
    unique_target_hours: int
    min_publish_time: str
    max_publish_time: str
    negative_lead_time_records: int

class DataQualityReport(BaseModel):
    fuelhh: FuelHHQualityStats
    windfor: WindforQualityStats
    data_correctness_verified: bool
    summary_message: str

class AlignmentReport(BaseModel):
    alignment_method: str
    cutoff_strategy: str
    total_target_hours: int
    matched_observations: int
    unmatched_observations: int
    coverage_pct: float
    excluded_target_hours: List[str]
    notes: List[str]

class ErrorMetrics(BaseModel):
    mae_mw: float = Field(..., description="Mean Absolute Error in MW")
    rmse_mw: float = Field(..., description="Root Mean Squared Error in MW")
    bias_mw: float = Field(..., description="Mean Error (Forecast - Actual) in MW. Positive = Over-forecast, Negative = Under-forecast")
    wape_pct: float = Field(..., description="Weighted Absolute Percentage Error: (Sum(|F - A|) / Sum(A)) * 100")
    nrmse_pct: float = Field(..., description="Normalized RMSE: (RMSE / Mean(A)) * 100")
    correlation: float = Field(..., description="Pearson correlation coefficient r")
    max_overforecast_mw: float = Field(..., description="Maximum positive forecast error (F - A) in MW")
    max_underforecast_mw: float = Field(..., description="Maximum negative forecast error (F - A) in MW")
    total_actual_gwh: float = Field(..., description="Total actual energy generation in GWh for matched intervals")
    total_forecast_gwh: float = Field(..., description="Total forecasted energy generation in GWh for matched intervals")
    matched_count: int = Field(..., description="Number of evaluated paired observations")
    coverage_pct: float = Field(..., description="Percentage of January target hours matched")

class TimeSeriesPoint(BaseModel):
    timestamp: str
    target_date: str
    actual_mw: Optional[float] = None
    forecast_mw: Optional[float] = None
    error_mw: Optional[float] = None
    abs_error_mw: Optional[float] = None
    vintage_publish_time: Optional[str] = None
    lead_time_hours: Optional[float] = None
    status: str

class DailyMetricPoint(BaseModel):
    date: str
    mae_mw: float
    rmse_mw: float
    bias_mw: float
    actual_gwh: float
    forecast_gwh: float
    observations: int

class SummaryResponse(BaseModel):
    metrics: ErrorMetrics
    daily_metrics: List[DailyMetricPoint]
    alignment: AlignmentReport
    quality: DataQualityReport

class TimeSeriesResponse(BaseModel):
    count: int
    cutoff_strategy: str
    alignment_method: str
    data: List[TimeSeriesPoint]

class HealthResponse(BaseModel):
    status: str
    version: str
    datasets_loaded: bool
    windfor_records: int
    fuelhh_records: int
    message: str
