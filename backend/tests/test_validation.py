import pytest
import pandas as pd
from app.validation import run_data_diagnostics
from app.data_loader import loader

def test_validation_detects_february_records_and_january_subset():
    report = run_data_diagnostics(loader)
    assert report.data_correctness_verified is True
    assert report.fuelhh.total_records == 1536
    assert report.fuelhh.january_records == 1488
    assert report.fuelhh.february_excluded_records == 48
    assert report.fuelhh.cadence_minutes == 30
    assert report.windfor.cadence_minutes == 60
    assert report.windfor.total_records == 18104
    assert report.fuelhh.null_counts["generation"] == 0
    assert report.windfor.null_counts["generation"] == 0
    assert report.fuelhh.min_generation_mw >= 0
    assert report.windfor.min_generation_mw >= 0
