import pytest
import pandas as pd
from app.data_loader import DataLoader, loader

def test_loader_finds_and_loads_fuelhh():
    df = loader.load_fuelhh()
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 1536
    assert "settlementDate" in df.columns
    assert "fuelType" in df.columns
    assert "generation" in df.columns
    assert (df["fuelType"] == "WIND").all()

def test_loader_finds_and_loads_windfor():
    df = loader.load_windfor()
    assert isinstance(df, pd.DataFrame)
    assert len(df) >= 18000
    assert "publishTime" in df.columns
    assert "startTime" in df.columns
    assert "generation" in df.columns

def test_loader_rejects_incomplete_dataset(tmp_path):
    # Create fake loader pointing to an incomplete file
    dummy_fuel = tmp_path / "fuelhh_wind_jan_2026.json"
    dummy_fuel.write_text('[{"dataset": "FUELHH", "generation": 100}]', encoding="utf-8")
    
    custom_loader = DataLoader(base_dir=tmp_path)
    custom_loader.raw_data_dir = tmp_path
    
    with pytest.raises(ValueError, match="Incomplete FUELHH dataset detected"):
        custom_loader.load_fuelhh()
