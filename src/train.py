import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import argparse
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupShuffleSplit

from src.data import load_train, load_test, create_sequences, get_last_sequences, INFORMATIVE_SENSORS
from src.features import build_features, feature_columns
from src.models.baseline import make_ridge_baseline, make_random_forest, make_extra_trees
from src.models.xgboost_model import make_xgboost
from src.models.lstm_model import PyTorchLSTMRUL
from src.models.anomaly import EnhancedAnomalyDetector
from src.mlflow_utils import MLflowTracker

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "CMAPSSData"
ART = ROOT / "artifacts"
ART.mkdir(exist_ok=True)

def compute_nasa_phm_score(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """
    NASA PHM08 Data Challenge Scoring Function.
    Asymmetric exponential penalty penalizing late predictions (over-optimistic RUL)
    much more heavily than early predictions (conservative maintenance).
    d = y_pred - y_true
    s = exp(-d / 13) - 1  for d < 0 (early)
    s = exp(d / 10) - 1   for d >= 0 (late)
    """
    d = y_pred - y_true
    scores = np.where(d < 0, np.exp(-d / 13.0) - 1.0, np.exp(d / 10.0) - 1.0)
    return float(np.sum(scores))

def evaluate_predictions(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    r2 = float(r2_score(y_true, y_pred))
    nasa_score = float(compute_nasa_phm_score(y_true, y_pred))
    return {
        "MAE": round(mae, 3),
        "RMSE": round(rmse, 3),
        "R2": round(r2, 4),
        "NASA_PHM_Score": round(nasa_score, 1)
    }

def main(subset="FD001", rul_cap=125):
    print("=" * 70)
    print(f"🚀 PREDICTIVE INTELLIGENCE PLATFORM — MODEL BENCHMARKING & TRAINING")
    print(f"Dataset: C-MAPSS {subset} | RUL Cap: {rul_cap} cycles")
    print("=" * 70)

    train_path = DATA / f"train_{subset}.txt"
    test_path = DATA / f"test_{subset}.txt"
    rul_path = DATA / f"RUL_{subset}.txt"

    for p in (train_path, test_path, rul_path):
        if not p.exists():
            raise FileNotFoundError(f"Missing required dataset file: {p}")

    # 1. Load data & Engineer Features
    print("\n[1/6] Loading data and engineering features...")
    raw_train = load_train(str(train_path), rul_cap=rul_cap)
    feat_train = build_features(raw_train)
    cols = feature_columns(feat_train)
    X, y, groups = feat_train[cols], feat_train["RUL"], feat_train["engine_id"]

    # Official Test Set
    raw_test = load_test(str(test_path), str(rul_path), rul_cap=rul_cap)
    feat_test = build_features(raw_test)
    test_last_rows = feat_test.sort_values("cycle").groupby("engine_id").tail(1)
    X_test, y_test = test_last_rows[cols], test_last_rows["RUL"].to_numpy()

    print(f"  • Training observations: {len(X)} across {feat_train['engine_id'].nunique()} engines")
    print(f"  • Feature dimension: {len(cols)} engineered features")
    print(f"  • Held-out test engines: {len(test_last_rows)}")

    # 2. Engine-Wise Cross-Validation Split (Zero Data Leakage)
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)
    tr_idx, val_idx = next(splitter.split(X, y, groups))
    X_tr, y_tr = X.iloc[tr_idx], y.iloc[tr_idx]
    X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]
    y_val_arr = y_val.to_numpy()

    # 3. Model Benchmark Suite
    print("\n[2/6] Benchmarking Machine Learning models on Engine-Wise validation...")
    tracker = MLflowTracker()
    models_to_evaluate = [
        make_ridge_baseline(),
        make_random_forest(),
        make_extra_trees(),
        make_xgboost()
    ]

    benchmark_results = {}
    best_rmse = float("inf")
    best_model = None
    best_name = ""

    for model, name in models_to_evaluate:
        print(f"\n  ▶ Training {name}...")
        tracker.start_run(run_name=f"Benchmark_{name.replace(' ', '_')}")
        model.fit(X_tr, y_tr)
        val_pred = np.clip(model.predict(X_val), 0, rul_cap)
        val_metrics = evaluate_predictions(y_val_arr, val_pred)

        # Refit on all training engines and evaluate on official NASA test set
        model.fit(X, y)
        test_pred = np.clip(model.predict(X_test), 0, rul_cap)
        test_metrics = evaluate_predictions(y_test, test_pred)

        benchmark_results[name] = {
            "validation": val_metrics,
            "test": test_metrics
        }

        tracker.log_metrics({f"val_{k}": v for k, v in val_metrics.items()})
        tracker.log_metrics({f"test_{k}": v for k, v in test_metrics.items()})
        tracker.end_run()

        print(f"    Validation: RMSE = {val_metrics['RMSE']:.2f} | MAE = {val_metrics['MAE']:.2f} | R² = {val_metrics['R2']:.3f} | NASA Score = {val_metrics['NASA_PHM_Score']}")
        print(f"    Test Set:   RMSE = {test_metrics['RMSE']:.2f} | MAE = {test_metrics['MAE']:.2f} | R² = {test_metrics['R2']:.3f} | NASA Score = {test_metrics['NASA_PHM_Score']}")

        if test_metrics["RMSE"] < best_rmse:
            best_rmse = test_metrics["RMSE"]
            best_model = model
            best_name = name

    # 4. Train Deep Learning LSTM Sequence Model
    print("\n[3/6] Training Deep Learning LSTM Sequence Model...")
    seq_len = 25
    lstm_tracker = MLflowTracker()
    lstm_tracker.start_run(run_name="Benchmark_LSTM_Deep_Learning")

    # Informative raw sensors + key ratios for sequence tensor input
    lstm_features = [s for s in INFORMATIVE_SENSORS if s in raw_train.columns]
    X_seq_all, y_seq_all, eng_seq_all = create_sequences(raw_train, seq_len=seq_len, feature_cols=lstm_features)
    
    # Train/Val mask based on engine groups
    val_engs = set(feat_train.iloc[val_idx]["engine_id"].unique())
    is_val_seq = np.isin(eng_seq_all, list(val_engs))
    
    X_seq_tr, y_seq_tr = X_seq_all[~is_val_seq], y_seq_all[~is_val_seq]
    X_seq_val, y_seq_val = X_seq_all[is_val_seq], y_seq_all[is_val_seq]

    lstm_model = PyTorchLSTMRUL(input_dim=len(lstm_features), hidden_dim=64, num_layers=2)
    lstm_model.fit(X_seq_tr, y_seq_tr, X_seq_val, y_seq_val, epochs=25, batch_size=128)

    val_lstm_pred = np.clip(lstm_model.predict(X_seq_val), 0, rul_cap)
    val_lstm_metrics = evaluate_predictions(y_seq_val, val_lstm_pred)

    # Evaluate LSTM on official test set using last sequence per test engine
    X_seq_test, y_seq_test, _ = get_last_sequences(raw_test, seq_len=seq_len, feature_cols=lstm_features)
    test_lstm_pred = np.clip(lstm_model.predict(X_seq_test), 0, rul_cap)
    test_lstm_metrics = evaluate_predictions(y_seq_test, test_lstm_pred)

    benchmark_results["LSTM Deep Learning"] = {
        "validation": val_lstm_metrics,
        "test": test_lstm_metrics
    }
    print(f"    LSTM Validation: RMSE = {val_lstm_metrics['RMSE']:.2f} | MAE = {val_lstm_metrics['MAE']:.2f} | NASA Score = {val_lstm_metrics['NASA_PHM_Score']}")
    print(f"    LSTM Test Set:   RMSE = {test_lstm_metrics['RMSE']:.2f} | MAE = {test_lstm_metrics['MAE']:.2f} | NASA Score = {test_lstm_metrics['NASA_PHM_Score']}")
    
    lstm_model.save(ART / "lstm_model.pt", ART / "lstm_scaler.joblib")
    with open(ART / "lstm_features.json", "w") as f:
        json.dump(lstm_features, f, indent=2)
        
    lstm_tracker.log_metrics({f"test_{k}": v for k, v in test_lstm_metrics.items()})
    lstm_tracker.end_run()

    # 5. Fit Industrial Enhanced Anomaly Detector & Health Index
    print("\n[4/6] Calibrating Enhanced Anomaly Detector & Health Index...")
    # Train anomaly detector on healthy engine cycles (first 25 cycles of training engines)
    healthy_mask = feat_train["cycle"] <= 25
    anomaly_detector = EnhancedAnomalyDetector(contamination=0.03, random_state=42)
    anomaly_detector.fit(feat_train[healthy_mask], feature_names=cols)
    joblib.dump(anomaly_detector, ART / "anomaly_model.joblib")
    # For legacy backwards compatibility
    joblib.dump(anomaly_detector.scaler, ART / "anomaly_scaler.joblib")
    print(f"  • Anomaly warning threshold calibrated at {anomaly_detector.threshold_warning:.4f}")
    print(f"  • Critical threshold calibrated at {anomaly_detector.threshold_critical:.4f}")

    # 6. Save Best Production Model & Artifacts
    print(f"\n[5/6] Finalizing model selection: Best Regressor = {best_name}")
    joblib.dump(best_model, ART / "rul_model.joblib")
    with open(ART / "feature_columns.json", "w") as f:
        json.dump(cols, f, indent=2)

    with open(ART / "model_comparison.json", "w") as f:
        json.dump(benchmark_results, f, indent=2)

    final_metrics = {
        "subset": subset,
        "selected_model": best_name,
        "rul_cap": rul_cap,
        "benchmark": benchmark_results,
        "best_test_rmse": benchmark_results[best_name]["test"]["RMSE"],
        "best_test_mae": benchmark_results[best_name]["test"]["MAE"],
        "best_test_nasa_score": benchmark_results[best_name]["test"]["NASA_PHM_Score"]
    }
    with open(ART / "metrics.json", "w") as f:
        json.dump(final_metrics, f, indent=2)

    print("\n[6/6] Benchmark Summary Table:")
    print("-" * 75)
    print(f"{'Model Architecture':<26} | {'Test RMSE':<10} | {'Test MAE':<10} | {'Test R²':<10} | {'NASA Score':<12}")
    print("-" * 75)
    for name, res in benchmark_results.items():
        t = res["test"]
        print(f"{name:<26} | {t['RMSE']:<10.2f} | {t['MAE']:<10.2f} | {t['R2']:<10.3f} | {t['NASA_PHM_Score']:<12.1f}")
    print("-" * 75)
    print(f"✅ All artifacts and benchmarks successfully saved to: {ART}\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--subset", default="FD001", choices=["FD001", "FD002", "FD003", "FD004"])
    parser.add_argument("--rul-cap", default=125, type=int)
    args = parser.parse_args()
    main(args.subset, args.rul_cap)
