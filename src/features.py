import numpy as np
import pandas as pd
from typing import List, Optional
from src.data import CONSTANT_SENSORS, INFORMATIVE_SENSORS

ID_COLS = ["engine_id", "cycle", "RUL"]
SENSOR_COLS = [f"sensor_{i}" for i in range(1, 22)]
SETTING_COLS = [f"op_setting_{i}" for i in range(1, 4)]

def build_features(df: pd.DataFrame, drop_constants: bool = True) -> pd.DataFrame:
    """
    Optimized high-performance feature engineering for turbofan telemetry:
    1. Rolling statistical moments (mean, std) over windows (5, 10, 20).
    2. Rate of change (short and medium term differentials).
    3. Baseline relative deviation: difference from initial engine baseline (cycles 1-5).
    4. Domain-specific physical cross-sensor ratios (temperature & pressure margins).
    Constructs columns in dictionary format to avoid DataFrame fragmentation.
    """
    parts = []
    
    active_sensors = [s for s in SENSOR_COLS if not (drop_constants and s in CONSTANT_SENSORS)]
    active_settings = [s for s in SETTING_COLS if not (drop_constants and s in CONSTANT_SENSORS)]
    active_cols = active_settings + active_sensors

    for _, group in df.groupby("engine_id", sort=False):
        group = group.sort_values("cycle").copy()
        data = {
            "engine_id": group["engine_id"].to_numpy(),
            "cycle": group["cycle"].to_numpy()
        }
        
        # Initial baseline per engine (mean of first 5 cycles, representing initial healthy state)
        init_baseline = group.iloc[:5][active_cols].mean()

        for col in active_cols:
            vals = group[col].to_numpy()
            data[col] = vals
            
            # Baseline deviation (healthy baseline drift)
            base_val = init_baseline[col]
            data[f"{col}_drift"] = vals - base_val

            # Rolling windows
            for window in (5, 10, 20):
                roll = group[col].rolling(window=window, min_periods=1)
                data[f"{col}_mean_{window}"] = roll.mean().to_numpy()
                data[f"{col}_std_{window}"] = roll.std().fillna(0.0).to_numpy()
                
            # Rate of change (differential features)
            data[f"{col}_diff1"] = group[col].diff(1).fillna(0.0).to_numpy()
            data[f"{col}_diff5"] = group[col].diff(5).fillna(0.0).to_numpy()
        
        # Thermodynamic ratios
        if "sensor_9" in group and "sensor_2" in group:
            data["ratio_temp_lpt_fan"] = (group["sensor_9"] / (group["sensor_2"] + 1e-5)).to_numpy()
        
        if "sensor_4" in group and "sensor_3" in group:
            data["ratio_temp_lpt_hpc"] = (group["sensor_4"] / (group["sensor_3"] + 1e-5)).to_numpy()
            
        if "sensor_11" in group and "sensor_12" in group:
            data["ratio_fuel_pressure"] = (group["sensor_11"] / (group["sensor_12"] + 1e-5)).to_numpy()

        if "sensor_14" in group and "sensor_8" in group:
            data["ratio_core_fan_speed"] = (group["sensor_14"] / (group["sensor_8"] + 1e-5)).to_numpy()

        if "RUL" in group:
            data["RUL"] = group["RUL"].to_numpy()
            
        parts.append(pd.DataFrame(data))

    feature_df = pd.concat(parts, ignore_index=True)
    return feature_df

def feature_columns(feature_df: pd.DataFrame) -> List[str]:
    """Return all predictor feature column names (excluding identifiers and target)."""
    return [c for c in feature_df.columns if c not in ("engine_id", "cycle", "RUL")]

class EngineTelemetryBuffer:
    """
    Stateful ring-buffer maintaining historical sensor telemetry per engine.
    Ensures online single-cycle inference computes genuine rolling statistics,
    baseline drift, and lag differentials with parity to the batch training pipeline.
    """
    def __init__(self, max_history_per_engine: int = 100):
        self.max_history = max_history_per_engine
        self._history: Dict[int, List[Dict[str, Any]]] = {}

    def append(self, engine_id: int, reading: Dict[str, Any]) -> int:
        if engine_id not in self._history:
            self._history[engine_id] = []
        
        # Deduplicate or replace if cycle already exists
        cycle = reading.get("cycle", 1)
        existing_idx = None
        for idx, item in enumerate(self._history[engine_id]):
            if item.get("cycle") == cycle:
                existing_idx = idx
                break
                
        if existing_idx is not None:
            self._history[engine_id][existing_idx] = dict(reading)
        else:
            self._history[engine_id].append(dict(reading))
            
        # Keep sorted by cycle
        self._history[engine_id].sort(key=lambda x: x.get("cycle", 1))
        
        # Retain last max_history cycles
        if len(self._history[engine_id]) > self.max_history:
            self._history[engine_id] = self._history[engine_id][-self.max_history:]
            
        return len(self._history[engine_id])

    def get_history_df(self, engine_id: int) -> pd.DataFrame:
        if engine_id not in self._history or not self._history[engine_id]:
            return pd.DataFrame()
        return pd.DataFrame(self._history[engine_id])

    def clear(self, engine_id: Optional[int] = None):
        if engine_id is None:
            self._history.clear()
        elif engine_id in self._history:
            del self._history[engine_id]

def validate_sensor_payload(sensors: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Validates incoming raw sensor readings.
    Rejects NaNs, infinities, non-numeric values, and out-of-physical-envelope anomalies.
    """
    if not sensors or not isinstance(sensors, dict):
        return False, "Sensors payload must be a non-empty dictionary."

    for k, v in sensors.items():
        if v is None:
            return False, f"Sensor reading for '{k}' cannot be None."
        try:
            val = float(v)
        except (ValueError, TypeError):
            return False, f"Sensor reading for '{k}' with value '{v}' is not a valid numeric float."

        if np.isnan(val) or np.isinf(val):
            return False, f"Sensor reading for '{k}' contains non-finite value ({val})."

        # Physical turbofan boundaries check for FD001 operating parameters
        if k == "sensor_2" and not (450.0 <= val <= 750.0):
            return False, f"Sensor 2 (T24) value {val:.2f} is outside physical bounds [450, 750] R."
        if k == "sensor_4" and not (1100.0 <= val <= 1700.0):
            return False, f"Sensor 4 (T50) value {val:.2f} is outside physical bounds [1100, 1700] R."
        if k == "sensor_7" and not (450.0 <= val <= 650.0):
            return False, f"Sensor 7 (P30) value {val:.2f} is outside physical bounds [450, 650] psia."
        if k == "sensor_11" and not (35.0 <= val <= 60.0):
            return False, f"Sensor 11 (Ps30) value {val:.2f} is outside physical bounds [35, 60] psia."

    return True, None

def engineer_features_with_provenance(
    raw_dict: dict,
    history_df: Optional[pd.DataFrame] = None,
    cols_schema: Optional[List[str]] = None
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Engineers a feature row with explicit inference provenance and historical context tracking.
    Never silently masks insufficient history:
    - If prior cycles < 5: flags is_cold_start=True and features_approximated=True.
    - If prior cycles >= 5: utilizes genuine rolling stats, baseline drift, and difference lags.
    """
    row_df = pd.DataFrame([raw_dict])
    if "engine_id" not in row_df.columns:
        row_df["engine_id"] = 1
    if "cycle" not in row_df.columns:
        row_df["cycle"] = 1

    eng_id = int(row_df["engine_id"].iloc[0])
    current_cycle = int(row_df["cycle"].iloc[0])

    if history_df is not None and not history_df.empty:
        # Filter history to only prior cycles for this engine
        prior = history_df[
            (history_df["engine_id"] == eng_id) & 
            (history_df["cycle"] < current_cycle)
        ].copy()
        combined = pd.concat([prior, row_df], ignore_index=True).sort_values("cycle").reset_index(drop=True)
        history_depth = len(prior)
    else:
        combined = row_df.copy()
        history_depth = 0

    # Build features on combined chronological sequence
    feat_df = build_features(combined)
    engineered_row = feat_df.iloc[[-1]].copy()

    # Align with expected feature schema
    if cols_schema is not None:
        missing_cols = [c for c in cols_schema if c not in engineered_row.columns]
        for c in missing_cols:
            engineered_row[c] = 0.0
        engineered_row = engineered_row[cols_schema]

    is_cold_start = history_depth < 5
    features_approximated = history_depth < 20

    warnings = []
    if is_cold_start:
        warnings.append(
            f"Cold start condition: Engine {eng_id} has only {history_depth} prior historical cycles. "
            "Baseline drift (first 5 cycles) and rolling statistics are approximated."
        )
    elif features_approximated:
        warnings.append(
            f"Partial history depth: {history_depth} prior cycles available. 20-cycle rolling windows "
            "use available depth rather than complete 20-point span."
        )

    provenance = {
        "engine_id": eng_id,
        "current_cycle": current_cycle,
        "history_depth": history_depth,
        "is_cold_start": is_cold_start,
        "features_approximated": features_approximated,
        "calculation_method": "cold_start_initialization" if is_cold_start else "full_history_rolling",
        "warnings": warnings,
        "feature_count": len(cols_schema) if cols_schema else len(feature_columns(feat_df))
    }

    return engineered_row, provenance

def engineer_single_row(
    raw_dict: dict,
    history_df: Optional[pd.DataFrame] = None,
    cols_schema: Optional[List[str]] = None
) -> pd.DataFrame:
    """
    Produce engineered feature row from a single raw sensor dictionary.
    Backwards-compatible convenience wrapper around engineer_features_with_provenance.
    """
    feat_row, _ = engineer_features_with_provenance(raw_dict, history_df=history_df, cols_schema=cols_schema)
    return feat_row
