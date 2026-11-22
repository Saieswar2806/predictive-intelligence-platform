import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from typing import Dict

def compute_nasa_phm_score(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """
    NASA PHM08 Data Challenge Scoring Function.
    Asymmetric exponential penalty function penalizing late predictions
    (over-optimistic RUL) much more severely than early predictions.
    d = y_pred - y_true
    s = exp(-d / 13) - 1  for d < 0 (early prediction)
    s = exp(d / 10) - 1   for d >= 0 (late prediction)
    """
    d = np.array(y_pred) - np.array(y_true)
    scores = np.where(d < 0, np.exp(-d / 13.0) - 1.0, np.exp(d / 10.0) - 1.0)
    return float(np.sum(scores))

def evaluate_predictions(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Compute standard regression metrics alongside official NASA PHM score."""
    y_true_arr = np.array(y_true, dtype=float)
    y_pred_arr = np.array(y_pred, dtype=float)
    
    mae = float(mean_absolute_error(y_true_arr, y_pred_arr))
    rmse = float(np.sqrt(mean_squared_error(y_true_arr, y_pred_arr)))
    r2 = float(r2_score(y_true_arr, y_pred_arr))
    nasa_score = float(compute_nasa_phm_score(y_true_arr, y_pred_arr))
    
    return {
        "MAE": round(mae, 3),
        "RMSE": round(rmse, 3),
        "R2": round(r2, 4),
        "NASA_PHM_Score": round(nasa_score, 1)
    }
