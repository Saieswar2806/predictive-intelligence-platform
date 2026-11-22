import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest
import numpy as np
import pandas as pd
from fastapi import HTTPException

from src.data import load_train, load_test, create_sequences, INFORMATIVE_SENSORS
from src.features import (
    build_features,
    feature_columns,
    engineer_single_row,
    engineer_features_with_provenance,
    validate_sensor_payload,
    EngineTelemetryBuffer
)
from src.models.baseline import make_ridge_baseline, make_random_forest, make_extra_trees
from src.models.xgboost_model import make_xgboost
from src.models.anomaly import EnhancedAnomalyDetector
from src.digital_twin import TurbofanDigitalTwin
from src.explain import get_feature_description, generate_diagnostic_summary
from src.api import (
    health,
    predict_raw,
    predict_features,
    simulate_twin,
    get_fleet_overview,
    get_engine_history,
    get_mlops_status,
    get_benchmarks,
    get_drift_status,
    RawTelemetryPayload,
    FeaturePayload,
    TwinSimulatePayload,
    ENGINE_HISTORY_STORE,
    PREDICTION_AUDIT_LOG
)

DATA_PATH = ROOT / "data" / "CMAPSSData"

# ============================================================================
# 1. Dataset & Data Ingestion Tests
# ============================================================================

def test_data_loading():
    train_file = DATA_PATH / "train_FD001.txt"
    if not train_file.exists():
        pytest.skip("Dataset file train_FD001.txt not found")
    df = load_train(str(train_file), rul_cap=125)
    assert not df.empty
    assert "RUL" in df.columns
    assert df["RUL"].max() <= 125
    assert df["engine_id"].nunique() == 100

def test_feature_engineering_batch():
    train_file = DATA_PATH / "train_FD001.txt"
    if not train_file.exists():
        pytest.skip("Dataset file train_FD001.txt not found")
    df = load_train(str(train_file), rul_cap=125)
    sample_df = df[df["engine_id"].isin([1, 2])]
    feats = build_features(sample_df)
    cols = feature_columns(feats)
    assert len(cols) > 30
    assert "sensor_4_mean_5" in cols
    assert "sensor_9_drift" in cols
    assert "ratio_temp_lpt_fan" in cols

# ============================================================================
# 2. Training / Inference Parity & History Buffer Tests (Phase 2)
# ============================================================================

def test_training_inference_feature_parity():
    """
    Verify feature calculation parity between batch pipeline and online streaming
    inference using the EngineTelemetryBuffer.
    """
    train_file = DATA_PATH / "train_FD001.txt"
    if not train_file.exists():
        pytest.skip("Dataset file train_FD001.txt not found")
    df = load_train(str(train_file), rul_cap=125)
    eng1_data = df[df["engine_id"] == 1].head(25)

    # 1. Compute batch features on full 25 cycles
    batch_feats = build_features(eng1_data)
    cols = feature_columns(batch_feats)
    batch_last_row = batch_feats.iloc[[-1]][cols].to_dict(orient="records")[0]

    # 2. Simulate streaming online arrival of cycles 1..25 into buffer
    buf = EngineTelemetryBuffer(max_history_per_engine=50)
    for idx, row in eng1_data.iloc[:-1].iterrows():
        buf.append(1, row.to_dict())

    latest_reading = eng1_data.iloc[-1].to_dict()
    stream_feat, prov = engineer_features_with_provenance(
        latest_reading,
        history_df=buf.get_history_df(1),
        cols_schema=cols
    )
    stream_row = stream_feat[cols].to_dict(orient="records")[0]

    # Verify parity on key rolling, ratio, and drift features
    key_features = ["sensor_4_mean_5", "sensor_4_mean_20", "ratio_temp_lpt_fan", "sensor_9_drift"]
    for k in key_features:
        if k in batch_last_row:
            assert np.isclose(batch_last_row[k], stream_row[k], atol=1e-3), (
                f"Feature parity mismatch for {k}: batch={batch_last_row[k]}, stream={stream_row[k]}"
            )
    assert prov["is_cold_start"] is False
    assert prov["features_approximated"] is False
    assert prov["history_depth"] == 24

def test_cold_start_explicit_handling():
    """Verify that insufficient history (<5 cycles) explicitly flags cold start."""
    single_reading = {
        "engine_id": 99,
        "cycle": 1,
        "op_setting_1": 0.0015, "op_setting_2": 0.0003, "op_setting_3": 100.0,
        "sensor_2": 642.15, "sensor_3": 1585.0, "sensor_4": 1400.5, "sensor_7": 554.2,
        "sensor_8": 2388.06, "sensor_9": 9050.0, "sensor_11": 47.15, "sensor_12": 521.8,
        "sensor_13": 2388.05, "sensor_14": 8138.5, "sensor_15": 8.41, "sensor_17": 391.0,
        "sensor_20": 38.9, "sensor_21": 23.35
    }
    feat_row, prov = engineer_features_with_provenance(single_reading)
    assert prov["is_cold_start"] is True
    assert prov["features_approximated"] is True
    assert prov["history_depth"] == 0
    assert len(prov["warnings"]) > 0
    assert "Cold start condition" in prov["warnings"][0]

def test_sensor_payload_validation():
    """Verify validation rejects NaN, infinite, non-numeric, or physical boundary violations."""
    # 1. Valid payload
    valid_sensors = {"sensor_2": 642.0, "sensor_4": 1405.0, "sensor_7": 553.0}
    is_valid, err = validate_sensor_payload(valid_sensors)
    assert is_valid is True
    assert err is None

    # 2. NaN reading
    nan_sensors = {"sensor_2": np.nan, "sensor_4": 1405.0}
    is_valid, err = validate_sensor_payload(nan_sensors)
    assert is_valid is False
    assert "non-finite" in err

    # 3. Non-numeric
    str_sensors = {"sensor_2": "invalid_reading", "sensor_4": 1405.0}
    is_valid, err = validate_sensor_payload(str_sensors)
    assert is_valid is False
    assert "not a valid numeric" in err

    # 4. Out-of-physical-envelope T50 (Sensor 4 > 1700 R)
    out_of_bounds = {"sensor_4": 2500.0}
    is_valid, err = validate_sensor_payload(out_of_bounds)
    assert is_valid is False
    assert "outside physical bounds" in err

# ============================================================================
# 3. Model Architecture & Anomaly Detector Tests (Phase 1)
# ============================================================================

def test_anomaly_detector_optional_import_and_scoring():
    np.random.seed(42)
    fake_data = pd.DataFrame(np.random.randn(100, 10), columns=[f"feat_{i}" for i in range(10)])
    detector = EnhancedAnomalyDetector(contamination=0.05, random_state=42)
    detector.fit(fake_data)
    
    test_row = fake_data.iloc[[0]]
    assessment = detector.assess_engine_state(test_row)
    assert "anomaly_score" in assessment
    assert "health_index" in assessment
    assert 0.0 <= assessment["health_index"] <= 1.0
    assert assessment["severity"] in ["Normal", "Warning Deviation", "Critical Anomaly"]

# ============================================================================
# 4. Digital Twin Improvements Tests (Phase 4)
# ============================================================================

def test_digital_twin_seed_reproducibility():
    """Verify that using the same seed produces identical deterministic states."""
    twin_a = TurbofanDigitalTwin(engine_id=10, initial_cycle=1, seed=42)
    twin_b = TurbofanDigitalTwin(engine_id=10, initial_cycle=1, seed=42)

    state_a = twin_a.step(cycles=10, seed=42)
    state_b = twin_b.step(cycles=10, seed=42)

    assert state_a["cycle"] == state_b["cycle"] == 11
    assert np.isclose(state_a["overall_health_index"], state_b["overall_health_index"])
    assert state_a["latest_telemetry"]["sensor_4"] == state_b["latest_telemetry"]["sensor_4"]

def test_digital_twin_synthetic_tagging_and_scenarios():
    """Verify digital twin tags synthetic telemetry and provides scenario tradeoffs."""
    twin = TurbofanDigitalTwin(engine_id=7, initial_cycle=20)
    state = twin.step(cycles=5)
    
    # Verify synthetic provenance
    assert state["provenance"]["is_synthetic"] is True
    assert state["provenance"]["telemetry_source"] == "physics_simulation_synthetic"
    assert state["latest_telemetry"]["is_synthetic"] is True

    # Verify scenario comparison
    scenarios = state["maintenance_scenarios"]["scenarios"]
    assert "no_action" in scenarios
    assert "compressor_wash" in scenarios
    assert "hot_section_inspection" in scenarios
    assert "major_overhaul" in scenarios

    assert scenarios["compressor_wash"]["rul_extension_cycles"] >= 0
    assert scenarios["major_overhaul"]["estimated_rul_cycles"] == 125

# ============================================================================
# 5. Deep Learning Sequence Model Tests
# ============================================================================

def test_lstm_sequence_creation():
    train_file = DATA_PATH / "train_FD001.txt"
    if not train_file.exists():
        pytest.skip("Dataset file train_FD001.txt not found")
    df = load_train(str(train_file), rul_cap=125)
    sample_df = df[df["engine_id"] == 1]
    features = [s for s in INFORMATIVE_SENSORS if s in sample_df.columns]
    X_seq, y_seq, eng_ids = create_sequences(sample_df, seq_len=15, feature_cols=features)
    assert len(X_seq) == len(sample_df)
    assert X_seq.shape[1] == 15
    assert X_seq.shape[2] == len(features)

# ============================================================================
# 6. FastAPI Endpoints & Error Handling Tests (Phase 3 & Phase 5)
# ============================================================================

def test_fastapi_endpoints_direct():
    # 1. Health
    h_resp = health()
    assert h_resp["status"] == "healthy"
    assert h_resp["artifacts_ready"] is True
    
    # 2. Digital Twin Simulation
    twin_payload = TwinSimulatePayload(
        engine_id=3,
        cycles_to_advance=3,
        thermal_stress=1.2,
        contamination=1.0,
        thrust_derate=0.05,
        seed=123
    )
    twin_res = simulate_twin(twin_payload)
    assert twin_res["cycle"] >= 4
    assert "live_predictions" in twin_res
    assert "maintenance_scenarios" in twin_res
    
    # 3. Predict Raw with provenance
    pred_payload = RawTelemetryPayload(
        engine_id=3,
        cycle=50,
        op_setting_1=0.0015,
        op_setting_2=0.0003,
        op_setting_3=100.0,
        sensors={
            "sensor_2": 642.3, "sensor_3": 1588.5, "sensor_4": 1404.2, "sensor_7": 553.8,
            "sensor_8": 2388.08, "sensor_9": 9054.2, "sensor_11": 47.2, "sensor_12": 521.6,
            "sensor_13": 2388.07, "sensor_14": 8135.0, "sensor_15": 8.43, "sensor_17": 392.0,
            "sensor_20": 38.8, "sensor_21": 23.32
        }
    )
    pred_res = predict_raw(pred_payload)
    assert "predicted_rul_cycles" in pred_res
    assert pred_res["maintenance_risk"] in ["HIGH", "MEDIUM", "LOW"]
    assert "provenance" in pred_res
    assert pred_res["provenance"]["model_version"] == "2.1.0"
    assert pred_res["dataset_version"] == "NASA C-MAPSS FD001"

def test_predict_raw_invalid_sensors_rejection():
    """Verify that invalid sensor payload raises HTTPException with status 400."""
    invalid_payload = RawTelemetryPayload(
        engine_id=3,
        cycle=50,
        op_setting_1=0.0015,
        op_setting_2=0.0003,
        op_setting_3=100.0,
        sensors={
            "sensor_2": 642.3,
            "sensor_4": float("nan") # NaN sensor value
        }
    )
    with pytest.raises(HTTPException) as exc_info:
        predict_raw(invalid_payload)
    assert exc_info.value.status_code == 400

def test_fleet_and_mlops_drift_endpoints():
    # 1. Fleet Overview
    fleet = get_fleet_overview()
    assert fleet["total_engines"] == 100
    assert fleet["healthy_count"] + fleet["warning_count"] + fleet["critical_count"] == 100
    assert len(fleet["engines"]) == 100

    # 2. Engine History
    hist = get_engine_history(1)
    assert hist["engine_id"] == 1
    assert hist["total_recorded_cycles"] > 0
    assert len(hist["history"]) == hist["total_recorded_cycles"]

    # 3. MLOps Status
    mlops = get_mlops_status()
    assert mlops["model_version"] == "2.1.0"
    assert mlops["api_status"] == "healthy"
    assert "Zero Test Leakage" in mlops["selection_strategy"]
    assert len(mlops["artifacts"]) > 0

    # 4. Drift Monitoring
    drift = get_drift_status()
    assert "status" in drift
    assert "drift_detected" in drift
