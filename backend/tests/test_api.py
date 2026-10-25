import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["datasets_loaded"] is True
    assert data["fuelhh_records"] == 1536
    assert data["windfor_records"] >= 18000

def test_api_quality_endpoint():
    response = client.get("/api/quality")
    assert response.status_code == 200
    data = response.json()
    assert data["data_correctness_verified"] is True
    assert data["fuelhh"]["cadence_minutes"] == 30
    assert data["fuelhh"]["january_records"] == 1488
    assert data["fuelhh"]["february_excluded_records"] == 48
    assert data["windfor"]["cadence_minutes"] == 60

def test_api_summary_endpoint():
    response = client.get("/api/summary?cutoff=da_dminus1_12&alignment=exact")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "alignment" in data
    assert "quality" in data
    assert data["alignment"]["matched_observations"] == 720
    assert data["metrics"]["matched_count"] == 720
    assert data["metrics"]["mae_mw"] > 0
    assert data["metrics"]["rmse_mw"] > 0
    assert len(data["daily_metrics"]) == 30

def test_api_timeseries_endpoint():
    response = client.get("/api/timeseries?cutoff=da_dminus1_12&alignment=exact&start_date=2026-01-05&end_date=2026-01-06")
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 48 # 2 days * 24 hours
    assert len(data["data"]) == 48
    assert data["data"][0]["status"] == "matched"
