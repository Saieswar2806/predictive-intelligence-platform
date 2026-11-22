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
from sklearn.model_selection import GroupShuffleSplit

from src.data import load_train, load_test, create_sequences, get_last_sequences, INFORMATIVE_SENSORS
from src.features import build_features, feature_columns
from src.evaluation import evaluate_predictions
from src.models.baseline import make_ridge_baseline, make_random_forest, make_extra_trees
from src.models.xgboost_model import make_xgboost
from src.models.lstm_model import PyTorchLSTMRUL
from src.models.anomaly import EnhancedAnomalyDetector
from src.mlflow_utils import MLflowTracker

ART = ROOT / "artifacts"
DATA = ROOT / "data" / "CMAPSSData"

def main(subset: str = "FD001", rul_cap: int = 125):
    print(f"\n=======================================================")
    print(f"🚀 NASA Turbofan Predictive Intelligence Pipeline ({subset})")
    print(f"=======================================================\n")
    ART.mkdir(exist_ok=True)

    # 1. Ingest Data and Engineer Industrial Domain Features
    print("[1/6] Ingesting telemetry and computing rolling degradation features...")
    raw_train = load_train(str(DATA / f"train_{subset}.txt"), rul_cap=rul_cap)
    raw_test = load_test(str(DATA / f"test_{subset}.txt"), str(DATA / f"RUL_{subset}.txt"), rul_cap=rul_cap)

    feat_train = build_features(raw_train)
    feat_test = build_features(raw_test)

    cols = feature_columns(feat_train)
    X = feat_train[cols]
    y = feat_train["RUL"]
    groups = feat_train["engine_id"]

    # Extract official test set evaluation points (last recorded cycle per engine)
    test_last_rows = feat_test.sort_values("cycle").groupby("engine_id").tail(1).reset_index(drop=True)
    X_test = test_last_rows[cols]
    y_test = test_last_rows["RUL"].to_numpy()

    print(f"  • Training observations: {len(X)} across {feat_train['engine_id'].nunique()} engines")
    print(f"  • Feature dimension: {len(cols)} engineered features")
    print(f"  • Held-out official NASA test engines: {len(test_last_rows)}")

    # 2. Engine-Wise Cross-Validation Split (Zero Data Leakage)
    # Strictly split training engines so validation engines are never seen during training
    splitter = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)
    tr_idx, val_idx = next(splitter.split(X, y, groups))
    X_tr, y_tr = X.iloc[tr_idx], y.iloc[tr_idx]
    X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]
    y_val_arr = y_val.to_numpy()

    print(f"  • Cross-Validation Split: {len(X_tr)} train rows ({feat_train.iloc[tr_idx]['engine_id'].nunique()} engines) | "
          f"{len(X_val)} validation rows ({feat_train.iloc[val_idx]['engine_id'].nunique()} engines)")

    # 3. Model Benchmark Candidate Evaluation (Strictly Validation-Only)
    print("\n[2/6] Evaluating candidate architectures on Engine-Wise validation (Zero Test-Set Leakage)...")
    tracker = MLflowTracker()
    
    candidate_factories = [
        make_ridge_baseline,
        make_random_forest,
        make_extra_trees,
        make_xgboost
    ]

    candidate_val_results = {}
    candidate_models_trained = {}

    for factory in candidate_factories:
        model, name = factory()
        print(f"\n  ▶ Training {name} on engine-wise training partition...")
        tracker.start_run(run_name=f"Benchmark_{name.replace(' ', '_')}")
        tracker.log_params({"model_architecture": name, "subset": subset, "rul_cap": rul_cap})

        # Fit strictly on train partition
        model.fit(X_tr, y_tr)
        val_pred = np.clip(model.predict(X_val), 0, rul_cap)
        val_metrics = evaluate_predictions(y_val_arr, val_pred)

        candidate_val_results[name] = val_metrics
        candidate_models_trained[name] = model
        tracker.log_validation_metrics(val_metrics)
        tracker.end_run()

        print(f"    Validation: RMSE = {val_metrics['RMSE']:.2f} | MAE = {val_metrics['MAE']:.2f} | R² = {val_metrics['R2']:.3f} | NASA Score = {val_metrics['NASA_PHM_Score']}")

    # 4. Train Deep Learning LSTM Sequence Model
    print("\n[3/6] Training Deep Learning LSTM Sequence Model on validation split...")
    seq_len = 25
    lstm_tracker = MLflowTracker()
    lstm_tracker.start_run(run_name="Benchmark_LSTM_Deep_Learning")

    lstm_features = [s for s in INFORMATIVE_SENSORS if s in raw_train.columns]
    X_seq_all, y_seq_all, eng_seq_all = create_sequences(raw_train, seq_len=seq_len, feature_cols=lstm_features)
    
    val_engs = set(feat_train.iloc[val_idx]["engine_id"].unique())
    is_val_seq = np.isin(eng_seq_all, list(val_engs))
    
    X_seq_tr, y_seq_tr = X_seq_all[~is_val_seq], y_seq_all[~is_val_seq]
    X_seq_val, y_seq_val = X_seq_all[is_val_seq], y_seq_all[is_val_seq]

    lstm_model = PyTorchLSTMRUL(input_dim=len(lstm_features), hidden_dim=64, num_layers=2)
    lstm_model.fit(X_seq_tr, y_seq_tr, X_seq_val, y_seq_val, epochs=25, batch_size=128)

    val_lstm_pred = np.clip(lstm_model.predict(X_seq_val), 0, rul_cap)
    val_lstm_metrics = evaluate_predictions(y_seq_val, val_lstm_pred)
    candidate_val_results["LSTM Deep Learning"] = val_lstm_metrics

    print(f"    LSTM Validation: RMSE = {val_lstm_metrics['RMSE']:.2f} | MAE = {val_lstm_metrics['MAE']:.2f} | NASA Score = {val_lstm_metrics['NASA_PHM_Score']}")
    lstm_tracker.log_validation_metrics(val_lstm_metrics)

    # 5. STRICT MODEL SELECTION: Select Architecture on Validation Performance ONLY
    print("\n[4/6] Executing Model Selection based strictly on Validation RMSE (Zero Test Leakage)...")
    best_name = min(candidate_val_results, key=lambda k: candidate_val_results[k]["RMSE"])
    best_val_rmse = candidate_val_results[best_name]["RMSE"]
    best_val_metrics = candidate_val_results[best_name]

    print(f"  🏆 Selected Model Architecture: {best_name}")
    print(f"     Validation RMSE = {best_val_rmse:.2f} | MAE = {best_val_metrics['MAE']:.2f} | R² = {best_val_metrics.get('R2', 0):.3f}")
    print("     [VERIFIED] Official NASA test set was NOT evaluated during model selection.")

    # 6. Post-Selection Refit & Held-Out Test Set Evaluation
    print("\n[5/6] Refitting selected model on all training engines and evaluating official NASA test set...")
    benchmark_results = {}

    # Refit candidate models on 100% of training data for final benchmark report
    for factory in candidate_factories:
        m, name = factory()
        m.fit(X, y)
        test_pred = np.clip(m.predict(X_test), 0, rul_cap)
        test_metrics = evaluate_predictions(y_test, test_pred)
        benchmark_results[name] = {
            "validation": candidate_val_results[name],
            "test": test_metrics
        }
        if name == best_name:
            best_production_model = m
            best_test_metrics = test_metrics

    # Evaluate LSTM on official test set
    X_seq_test, y_seq_test, _ = get_last_sequences(raw_test, seq_len=seq_len, feature_cols=lstm_features)
    test_lstm_pred = np.clip(lstm_model.predict(X_seq_test), 0, rul_cap)
    test_lstm_metrics = evaluate_predictions(y_seq_test, test_lstm_pred)

    benchmark_results["LSTM Deep Learning"] = {
        "validation": val_lstm_metrics,
        "test": test_lstm_metrics
    }
    lstm_model.save(ART / "lstm_model.pt", ART / "lstm_scaler.joblib")
    with open(ART / "lstm_features.json", "w") as f:
        json.dump(lstm_features, f, indent=2)
    lstm_tracker.log_test_metrics(test_lstm_metrics)
    lstm_tracker.end_run()

    # 7. Fit Industrial Enhanced Anomaly Detector & Health Index
    print("\n[6/6] Calibrating Enhanced Anomaly Detector & Health Index on healthy baseline...")
    healthy_mask = feat_train["cycle"] <= 25
    anomaly_detector = EnhancedAnomalyDetector(contamination=0.03, random_state=42)
    anomaly_detector.fit(feat_train[healthy_mask], feature_names=cols)
    joblib.dump(anomaly_detector, ART / "anomaly_model.joblib")
    joblib.dump(anomaly_detector.scaler, ART / "anomaly_scaler.joblib")
    print(f"  • Anomaly warning threshold calibrated at {anomaly_detector.threshold_warning:.4f}")
    print(f"  • Critical threshold calibrated at {anomaly_detector.threshold_critical:.4f}")

    # 8. Save Best Production Model & Audit Artifacts
    joblib.dump(best_production_model, ART / "rul_model.joblib")
    with open(ART / "feature_columns.json", "w") as f:
        json.dump(cols, f, indent=2)

    with open(ART / "model_comparison.json", "w") as f:
        json.dump(benchmark_results, f, indent=2)

    final_metrics = {
        "subset": subset,
        "selected_model": best_name,
        "selection_strategy": "Validation RMSE (Zero Test Leakage)",
        "rul_cap": rul_cap,
        "validation_performance": best_val_metrics,
        "test_performance": best_test_metrics,
        "benchmark": benchmark_results,
        "best_val_rmse": best_val_rmse,
        "best_test_rmse": best_test_metrics["RMSE"],
        "best_test_mae": best_test_metrics["MAE"],
        "best_test_nasa_score": best_test_metrics["NASA_PHM_Score"]
    }
    with open(ART / "metrics.json", "w") as f:
        json.dump(final_metrics, f, indent=2)

    print("\n" + "=" * 78)
    print(f"{'Model Architecture':<24} | {'Val RMSE':<10} | {'Test RMSE':<10} | {'Test MAE':<10} | {'NASA Score':<10}")
    print("=" * 78)
    for name, res in benchmark_results.items():
        v = res["validation"]
        t = res["test"]
        print(f"{name:<24} | {v['RMSE']:<10.2f} | {t['RMSE']:<10.2f} | {t['MAE']:<10.2f} | {t['NASA_PHM_Score']:<10.1f}")
    print("=" * 78)
    print(f"✅ All artifacts and benchmarks successfully saved to: {ART}\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--subset", default="FD001", choices=["FD001", "FD002", "FD003", "FD004"])
    parser.add_argument("--rul-cap", default=125, type=int)
    args = parser.parse_args()
    main(args.subset, args.rul_cap)
