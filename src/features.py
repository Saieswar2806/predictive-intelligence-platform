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

def engineer_single_row(
    raw_dict: dict,
    history_df: Optional[pd.DataFrame] = None,
    cols_schema: Optional[List[str]] = None
) -> pd.DataFrame:
    """
    Produce engineered feature row from a single raw sensor dictionary.
    If historical records exist, computes exact rolling stats;
    otherwise uses single-point approximations.
    """
    row_df = pd.DataFrame([raw_dict])
    if "engine_id" not in row_df.columns:
        row_df["engine_id"] = 1
    if "cycle" not in row_df.columns:
        row_df["cycle"] = 1
        
    if history_df is not None and not history_df.empty:
        combined = pd.concat([history_df, row_df], ignore_index=True)
        feat = build_features(combined)
        engineered_row = feat.iloc[[-1]].copy()
    else:
        feat = build_features(row_df)
        engineered_row = feat.iloc[[-1]].copy()
        
    if cols_schema is not None:
        for c in cols_schema:
            if c not in engineered_row.columns:
                engineered_row[c] = 0.0
        engineered_row = engineered_row[cols_schema]
        
    return engineered_row
