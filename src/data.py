from pathlib import Path
import numpy as np
import pandas as pd
from typing import List, Tuple, Optional

COLS = (
    ["engine_id", "cycle"]
    + [f"op_setting_{i}" for i in range(1, 4)]
    + [f"sensor_{i}" for i in range(1, 22)]
)

# In FD001, these sensors remain virtually constant and provide no degradation signal
CONSTANT_SENSORS = ["sensor_1", "sensor_5", "sensor_6", "sensor_10", "sensor_16", "sensor_18", "sensor_19", "op_setting_3"]

# Informative sensor list
INFORMATIVE_SENSORS = [
    "sensor_2", "sensor_3", "sensor_4", "sensor_7", "sensor_8", "sensor_9",
    "sensor_11", "sensor_12", "sensor_13", "sensor_14", "sensor_15", "sensor_17",
    "sensor_20", "sensor_21"
]

def load_train(path: str, rul_cap: int = 125) -> pd.DataFrame:
    """Load C-MAPSS training set and compute piece-wise linear RUL."""
    df = pd.read_csv(path, sep=r"\s+", header=None)
    df = df.iloc[:, :len(COLS)]
    df.columns = COLS
    max_cycle = df.groupby("engine_id")["cycle"].transform("max")
    df["RUL"] = max_cycle - df["cycle"]
    if rul_cap is not None:
        df["RUL"] = df["RUL"].clip(upper=rul_cap)
    return df

def load_test(path: str, rul_path: str, rul_cap: int = 125) -> pd.DataFrame:
    """Load C-MAPSS test set and attach NASA ground-truth RUL."""
    df = pd.read_csv(path, sep=r"\s+", header=None)
    df = df.iloc[:, :len(COLS)]
    df.columns = COLS
    true_rul = pd.read_csv(rul_path, sep=r"\s+", header=None).iloc[:, 0].to_numpy()
    last_cycles = df.groupby("engine_id")["cycle"].max().sort_index()
    if len(true_rul) != len(last_cycles):
        raise ValueError("RUL label count does not match the number of test engines.")
    mapping = dict(zip(last_cycles.index, true_rul))
    df["RUL"] = df.apply(
        lambda row: mapping[row["engine_id"]] + (last_cycles[row["engine_id"]] - row["cycle"]),
        axis=1
    )
    if rul_cap is not None:
        df["RUL"] = df["RUL"].clip(upper=rul_cap)
    return df

def create_sequences(
    df: pd.DataFrame,
    seq_len: int = 30,
    feature_cols: Optional[List[str]] = None
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Generate sliding sequences of shape (N, seq_len, num_features) for sequence models (LSTM).
    Padding with replicate or zero is applied for initial cycles < seq_len.
    Returns: (X_seq, y_seq, engine_ids)
    """
    if feature_cols is None:
        feature_cols = [c for c in df.columns if c not in ("engine_id", "cycle", "RUL")]
    
    X_list, y_list, eng_list = [], [], []
    
    for engine_id, group in df.groupby("engine_id"):
        group = group.sort_values("cycle").reset_index(drop=True)
        feat_vals = group[feature_cols].to_numpy()
        rul_vals = group["RUL"].to_numpy() if "RUL" in group else np.zeros(len(group))
        
        n_rows = len(group)
        for i in range(n_rows):
            if i < seq_len:
                # Pad earlier cycles by repeating the initial cycle
                pad_count = seq_len - (i + 1)
                pad_block = np.repeat(feat_vals[0:1], pad_count, axis=0)
                seq = np.vstack([pad_block, feat_vals[:i+1]])
            else:
                seq = feat_vals[i - seq_len + 1 : i + 1]
            
            X_list.append(seq)
            y_list.append(rul_vals[i])
            eng_list.append(engine_id)
            
    return np.array(X_list, dtype=np.float32), np.array(y_list, dtype=np.float32), np.array(eng_list)

def get_last_sequences(
    df: pd.DataFrame,
    seq_len: int = 30,
    feature_cols: Optional[List[str]] = None
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Extract the final sequence of length `seq_len` for each engine in the test set.
    Used for final-cycle evaluation of sequence models.
    """
    if feature_cols is None:
        feature_cols = [c for c in df.columns if c not in ("engine_id", "cycle", "RUL")]
        
    X_list, y_list, eng_list = [], [], []
    for engine_id, group in df.groupby("engine_id"):
        group = group.sort_values("cycle").reset_index(drop=True)
        feat_vals = group[feature_cols].to_numpy()
        rul_vals = group["RUL"].to_numpy() if "RUL" in group else np.zeros(len(group))
        
        n_rows = len(group)
        if n_rows < seq_len:
            pad_count = seq_len - n_rows
            pad_block = np.repeat(feat_vals[0:1], pad_count, axis=0)
            seq = np.vstack([pad_block, feat_vals])
        else:
            seq = feat_vals[-seq_len:]
            
        X_list.append(seq)
        y_list.append(rul_vals[-1])
        eng_list.append(engine_id)
        
    return np.array(X_list, dtype=np.float32), np.array(y_list, dtype=np.float32), np.array(eng_list)
