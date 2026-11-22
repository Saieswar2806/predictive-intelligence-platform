import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest
import numpy as np
import pandas as pd

from src.data import load_train, load_test, create_sequences, INFORMATIVE_SENSORS
from src.features import build_features, feature_columns, engineer_single_row
from src.models.baseline import make_ridge_baseline, make_random_forest
from src.models.xgboost_model import make_xgboost
from src.models.anomaly import EnhancedAnomalyDetector
from src.digital_twin import TurbofanDigitalTwin
from src.explain import get_feature_description, generate_diagnostic_summary
from src.api import health, predict_raw, simulate_twin, RawTelemetryPayload, TwinSimulatePayload

DATA_PATH = ROOT / "data" / "CMAPSSData"

def test_data_loading():
    train_file = DATA_PATH / "train_FD001.txt"
    if not train_file.exists():
        pytest.skip("Dataset file train_FD001.txt not found")
    df = load_train(str(train_file), rul_cap=125)
    assert not df.empty
    assert "RUL" in df.columns
    assert df["RUL"].max() <= 125
    assert df["engine_id"].nunique() == 100

def test_feature_engineering():
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

def test_single_row_engineering():
    raw_reading = {
        "engine_id": 1,
        "cycle": 10,
        "op_setting_1": 0.002, "op_setting_2": 0.0001, "op_setting_3": 100.0,
        "sensor_2": 642.0, "sensor_3": 1585.0, "sensor_4": 1400.0, "sensor_7": 554.0,
        "sensor_8": 2388.0, "sensor_9": 9050.0, "sensor_11": 47.1, "sensor_12": 521.5,
        "sensor_13": 2388.0, "sensor_14": 8138.0, "sensor_15": 8.4, "sensor_17": 391.0,
        "sensor_20": 38.9, "sensor_21": 23.3
    }
    row_feat = engineer_single_row(raw_reading)
    assert isinstance(row_feat, pd.DataFrame)
    assert not row_feat.empty

def test_anomaly_detector():
    np.random.seed(42)
    fake_data = pd.DataFrame(np.random.randn(100, 10), columns=[f"feat_{i}" for i in range(10)])
    detector = EnhancedAnomalyDetector(contamination=0.05)
    detector.fit(fake_data)
    
    test_row = fake_data.iloc[[0]]
    assessment = detector.assess_engine_state(test_row)
    assert "anomaly_score" in assessment
    assert "health_index" in assessment
    assert 0.0 <= assessment["health_index"] <= 1.0
    assert assessment["severity"] in ["Normal", "Warning Deviation", "Critical Anomaly"]

def test_digital_twin_simulation():
    twin = TurbofanDigitalTwin(engine_id=5, initial_cycle=1)
    initial_cycle = twin.cycle
    
    state = twin.step(cycles=5)
    assert twin.cycle == initial_cycle + 5
    assert "subsystems" in state
    assert "prescriptive_maintenance" in state
    assert 0.0 <= state["overall_health_index"] <= 1.0
    
    twin.set_stress_parameters(thermal_stress=1.5, contamination=2.0, thrust_derate=0.1)
    assert twin.thermal_stress_multiplier == 1.5
    
    maint = twin.apply_maintenance_action("compressor_wash")
    assert maint["action"] == "compressor_wash"
    assert "HPC" in maint["summary"]

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

def test_fastapi_endpoints_direct():
    # 1. Health
    h_resp = health()
    assert h_resp["status"] == "healthy"
    assert h_resp["artifacts_ready"] is True
    
    # 2. Digital Twin
    twin_payload = TwinSimulatePayload(
        engine_id=2,
        cycles_to_advance=3,
        thermal_stress=1.2,
        contamination=1.0,
        thrust_derate=0.05
    )
    twin_res = simulate_twin(twin_payload)
    assert twin_res["cycle"] >= 4
    assert "live_predictions" in twin_res
    
    # 3. Predict Raw
    pred_payload = RawTelemetryPayload(
        engine_id=2,
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
    assert "health_assessment" in pred_res
