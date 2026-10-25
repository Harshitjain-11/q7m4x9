import os
import json
from pathlib import Path
from typing import Tuple, List, Dict, Any, Optional
import pandas as pd

# Expected thresholds
EXPECTED_FUELHH_MIN_RECORDS = 1400  # Full file has 1536 (1488 in Jan + 48 in Feb 1)
INCOMPLETE_FUELHH_THRESHOLD = 100    # Guard against the 64-record incomplete file
EXPECTED_WINDFOR_MIN_RECORDS = 18000 # Full file has ~18,104

class DataLoader:
    def __init__(self, base_dir: Optional[Path] = None):
        if base_dir is None:
            # Current file is backend/app/data_loader.py -> backend is parent
            self.backend_dir = Path(__file__).resolve().parent.parent
        else:
            self.backend_dir = Path(base_dir)
        
        self.raw_data_dir = self.backend_dir / "data" / "raw"
        self._fuelhh_df: Optional[pd.DataFrame] = None
        self._windfor_df: Optional[pd.DataFrame] = None
        self._fuelhh_path: Optional[Path] = None
        self._windfor_path: Optional[Path] = None

    def find_file(self, primary_name: str, candidate_extensions: List[str] = [".json", ".json.json"]) -> Path:
        """
        Locates the dataset file robustly without assuming a single fixed path.
        Checks backend/data/raw, data/raw, and relative paths.
        """
        stem = primary_name.replace(".json.json", "").replace(".json", "")
        search_dirs = [
            self.raw_data_dir,
            self.backend_dir / "data",
            self.backend_dir.parent / "backend" / "data" / "raw",
            self.backend_dir.parent / "data" / "raw",
            Path.cwd() / "backend" / "data" / "raw",
            Path.cwd() / "data" / "raw",
            Path.cwd()
        ]

        for directory in search_dirs:
            if not directory.exists():
                continue
            for ext in candidate_extensions:
                candidate = directory / f"{stem}{ext}"
                if candidate.is_file() and candidate.stat().st_size > 0:
                    return candidate

        raise FileNotFoundError(
            f"Could not locate dataset '{primary_name}' in any searched directory: "
            f"{[str(d) for d in search_dirs if d.exists()]}"
        )

    def load_fuelhh(self, force_reload: bool = False) -> pd.DataFrame:
        """
        Loads and validates the FUELHH actual generation dataset.
        Rejects incomplete files (< 100 records) and ensures correct schema.
        """
        if self._fuelhh_df is not None and not force_reload:
            return self._fuelhh_df

        file_path = self.find_file("fuelhh_wind_jan_2026.json")
        self._fuelhh_path = file_path

        with open(file_path, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError as e:
                raise ValueError(f"Malformed JSON in FUELHH file {file_path}: {e}")

        if not isinstance(data, list):
            raise ValueError(f"FUELHH expected a JSON list of objects, got {type(data)}")

        record_count = len(data)
        if record_count < INCOMPLETE_FUELHH_THRESHOLD:
            raise ValueError(
                f"Incomplete FUELHH dataset detected ({record_count} records). "
                f"Expected complete file with ~1536 records. Aborting to prevent invalid actuals."
            )

        df = pd.DataFrame(data)
        required_cols = {"dataset", "publishTime", "startTime", "settlementDate", "settlementPeriod", "fuelType", "generation"}
        missing_cols = required_cols - set(df.columns)
        if missing_cols:
            raise ValueError(f"FUELHH missing required columns: {missing_cols}")

        # Ensure UTC datetime conversions
        df["startTime_dt"] = pd.to_datetime(df["startTime"], utc=True)
        df["publishTime_dt"] = pd.to_datetime(df["publishTime"], utc=True)
        df["generation"] = pd.to_numeric(df["generation"], errors="coerce")

        self._fuelhh_df = df
        return df

    def load_windfor(self, force_reload: bool = False) -> pd.DataFrame:
        """
        Loads and validates the WINDFOR wind forecast dataset.
        Ensures correct schema and minimum record count.
        """
        if self._windfor_df is not None and not force_reload:
            return self._windfor_df

        file_path = self.find_file("windfor_jan_2026.json")
        self._windfor_path = file_path

        with open(file_path, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError as e:
                raise ValueError(f"Malformed JSON in WINDFOR file {file_path}: {e}")

        if not isinstance(data, list):
            raise ValueError(f"WINDFOR expected a JSON list of objects, got {type(data)}")

        record_count = len(data)
        if record_count < EXPECTED_WINDFOR_MIN_RECORDS:
            raise ValueError(
                f"WINDFOR record count ({record_count}) is below expected minimum ({EXPECTED_WINDFOR_MIN_RECORDS})."
            )

        df = pd.DataFrame(data)
        required_cols = {"dataset", "publishTime", "startTime", "generation"}
        missing_cols = required_cols - set(df.columns)
        if missing_cols:
            raise ValueError(f"WINDFOR missing required columns: {missing_cols}")

        # Ensure UTC datetime conversions
        df["startTime_dt"] = pd.to_datetime(df["startTime"], utc=True)
        df["publishTime_dt"] = pd.to_datetime(df["publishTime"], utc=True)
        df["generation"] = pd.to_numeric(df["generation"], errors="coerce")

        self._windfor_df = df
        return df

    def get_loaded_paths(self) -> Dict[str, str]:
        return {
            "fuelhh": str(self._fuelhh_path) if self._fuelhh_path else "Not loaded",
            "windfor": str(self._windfor_path) if self._windfor_path else "Not loaded",
        }

# Global singleton loader instance
loader = DataLoader()
