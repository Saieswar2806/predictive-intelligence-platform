import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import json
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

from src.features import engineer_single_row, feature_columns
from src.explain import explain_row, generate_diagnostic_summary
from src.digital_twin import TurbofanDigitalTwin
from src.models.anomaly import EnhancedAnomalyDetector

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"

app = FastAPI(
    title="Predictive Intelligence Platform API",
    description="Turbofan Remaining Useful Life (RUL), Digital Twin Simulation, Health Index & SHAP Explainability",
    version="2.0.0"
)

# Global in-memory cache for digital twin instances
ACTIVE_TWINS: Dict[int, TurbofanDigitalTwin] = {}

class RawTelemetryPayload(BaseModel):
    engine_id: Optional[int] = 1
    cycle: Optional[int] = 1
    op_setting_1: float = Field(0.0015, description="Altitude / Throttle Operational Setting 1")
    op_setting_2: float = Field(0.0003, description="Mach Number Operational Setting 2")
    op_setting_3: float = Field(100.0, description="TRA Operational Setting 3")
    sensors: Dict[str, float] = Field(
        ...,
        description="Dictionary containing raw sensor readings (sensor_1 through sensor_21)",
        json_schema_extra={
            "example": {
                "sensor_2": 642.3, "sensor_3": 1588.5, "sensor_4": 1404.2, "sensor_7": 553.8,
                "sensor_8": 2388.08, "sensor_9": 9054.2, "sensor_11": 47.2, "sensor_12": 521.6,
                "sensor_13": 2388.07, "sensor_14": 8135.0, "sensor_15": 8.43, "sensor_17": 392.0,
                "sensor_20": 38.8, "sensor_21": 23.32
            }
        }
    )

class FeaturePayload(BaseModel):
    features: Dict[str, float] = Field(
        ..., description="Engineered feature key-value pairs matching feature_columns.json"
    )

class TwinSimulatePayload(BaseModel):
    engine_id: Optional[int] = 1
    cycles_to_advance: int = Field(1, ge=1, le=100)
    thermal_stress: float = Field(1.0, ge=0.5, le=2.5, description="Thermal stress multiplier (1.0 = nominal)")
    contamination: float = Field(1.0, ge=0.5, le=3.0, description="Particulate/sand contamination (1.0 = nominal)")
    thrust_derate: float = Field(0.0, ge=0.0, le=0.25, description="Thrust derating fraction (0.0 to 0.25)")
    maintenance_action: Optional[str] = Field(None, description="Optional action: 'compressor_wash', 'hot_section_inspection', 'major_overhaul'")

def load_artifacts():
    required = [ART / "rul_model.joblib", ART / "feature_columns.json", ART / "anomaly_model.joblib"]
    if not all(p.exists() for p in required):
        raise FileNotFoundError("Model artifacts missing. Please run: python src/train.py")
    
    model = joblib.load(required[0])
    cols = json.loads(required[1].read_text())
    anomaly = joblib.load(required[2])
    return model, cols, anomaly

@app.get("/")
def root():
    return {
        "platform": "Predictive Intelligence Platform with Digital Twin & XAI",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health",
        "benchmarks": "/models/comparison"
    }

@app.get("/health")
def health():
    artifacts_ready = (ART / "rul_model.joblib").exists() and (ART / "feature_columns.json").exists()
    return {
        "status": "healthy" if artifacts_ready else "initializing",
        "artifacts_ready": artifacts_ready,
        "active_digital_twins": len(ACTIVE_TWINS)
    }

@app.get("/models/comparison")
def get_benchmarks():
    comparison_file = ART / "model_comparison.json"
    if not comparison_file.exists():
        raise HTTPException(status_code=404, detail="Benchmark comparison not found. Run src/train.py first.")
    return json.loads(comparison_file.read_text())

@app.post("/predict/raw")
def predict_raw(payload: RawTelemetryPayload):
    try:
        model, cols, anomaly = load_artifacts()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Combine settings and sensor readings
    raw_dict = {
        "engine_id": payload.engine_id,
        "cycle": payload.cycle,
        "op_setting_1": payload.op_setting_1,
        "op_setting_2": payload.op_setting_2,
        "op_setting_3": payload.op_setting_3,
    }
    raw_dict.update(payload.sensors)

    # Perform online feature engineering
    feature_row = engineer_single_row(raw_dict, cols_schema=cols)
    
    # RUL Prediction
    pred_rul = float(np.clip(model.predict(feature_row[cols])[0], 0.0, 125.0))
    
    # Anomaly Assessment & Health Index
    if isinstance(anomaly, EnhancedAnomalyDetector):
        health_assessment = anomaly.assess_engine_state(feature_row[cols])
    else:
        # Backward compatibility fallback
        scaler = joblib.load(ART / "anomaly_scaler.joblib")
        scaled = scaler.transform(feature_row[cols])
        score = float(anomaly.decision_function(scaled)[0])
        is_anom = bool(anomaly.predict(scaled)[0] == -1)
        health_assessment = {
            "anomaly_score": round(score, 4),
            "is_anomaly": is_anom,
            "severity": "Warning" if is_anom else "Normal",
            "health_index": 0.5 if is_anom else 0.95,
            "root_cause_sensors": []
        }

    # Maintenance Risk Category
    if pred_rul < 20 or health_assessment["severity"] == "Critical Anomaly":
        maintenance_risk = "HIGH"
        urgency = "Immediate Maintenance Action Required"
    elif pred_rul < 50 or health_assessment["is_anomaly"]:
        maintenance_risk = "MEDIUM"
        urgency = "Schedule Inspection Within 15 Cycles"
    else:
        maintenance_risk = "LOW"
        urgency = "Normal Operational Envelope"

    return {
        "engine_id": payload.engine_id,
        "cycle": payload.cycle,
        "predicted_rul_cycles": round(pred_rul, 2),
        "maintenance_risk": maintenance_risk,
        "urgency_action": urgency,
        "health_assessment": health_assessment,
        "disclaimer": "Industrial AI decision support. Not certified as primary flight instrument."
    }

@app.post("/predict/features")
def predict_features(payload: FeaturePayload):
    try:
        model, cols, anomaly = load_artifacts()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    missing = [c for c in cols if c not in payload.features]
    if missing:
        raise HTTPException(status_code=422, detail={"missing_features": missing[:10], "total_missing": len(missing)})

    row = pd.DataFrame([[payload.features[c] for c in cols]], columns=cols)
    pred_rul = float(np.clip(model.predict(row)[0], 0.0, 125.0))
    
    if isinstance(anomaly, EnhancedAnomalyDetector):
        health = anomaly.assess_engine_state(row)
    else:
        scaler = joblib.load(ART / "anomaly_scaler.joblib")
        score = float(anomaly.decision_function(scaler.transform(row))[0])
        health = {"anomaly_score": round(score, 4), "is_anomaly": score < 0}

    return {
        "predicted_rul_cycles": round(pred_rul, 2),
        "health": health,
        "maintenance_risk": "HIGH" if pred_rul < 20 else ("MEDIUM" if pred_rul < 50 else "LOW")
    }

@app.post("/explain")
def get_explanation(payload: RawTelemetryPayload, top_n: int = 8):
    try:
        model, cols, _ = load_artifacts()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    raw_dict = {
        "engine_id": payload.engine_id, "cycle": payload.cycle,
        "op_setting_1": payload.op_setting_1, "op_setting_2": payload.op_setting_2, "op_setting_3": payload.op_setting_3
    }
    raw_dict.update(payload.sensors)
    feature_row = engineer_single_row(raw_dict, cols_schema=cols)
    pred_rul = float(np.clip(model.predict(feature_row[cols])[0], 0.0, 125.0))

    explanation_df = explain_row(feature_row, top_n=top_n)
    diagnostic = generate_diagnostic_summary(explanation_df, pred_rul)

    return {
        "engine_id": payload.engine_id,
        "cycle": payload.cycle,
        "predicted_rul": round(pred_rul, 2),
        "diagnostic_summary": diagnostic,
        "top_feature_contributions": explanation_df.to_dict(orient="records")
    }

@app.post("/digital-twin/simulate")
def simulate_twin(payload: TwinSimulatePayload):
    """Advance or query the physics-guided digital twin."""
    eng_id = payload.engine_id or 1
    if eng_id not in ACTIVE_TWINS:
        ACTIVE_TWINS[eng_id] = TurbofanDigitalTwin(engine_id=eng_id, initial_cycle=1)

    twin = ACTIVE_TWINS[eng_id]
    twin.set_stress_parameters(
        thermal_stress=payload.thermal_stress,
        contamination=payload.contamination,
        thrust_derate=payload.thrust_derate
    )

    action_result = None
    if payload.maintenance_action:
        action_result = twin.apply_maintenance_action(payload.maintenance_action)

    twin_state = twin.step(cycles=payload.cycles_to_advance)
    
    # Run prediction and anomaly detection on the newly simulated twin telemetry
    try:
        model, cols, anomaly = load_artifacts()
        feat_row = engineer_single_row(twin_state["latest_telemetry"], cols_schema=cols)
        pred_rul = float(np.clip(model.predict(feat_row[cols])[0], 0.0, 125.0))
        if isinstance(anomaly, EnhancedAnomalyDetector):
            health = anomaly.assess_engine_state(feat_row[cols])
        else:
            health = {"health_index": 0.8, "severity": "Normal"}
        twin_state["live_predictions"] = {
            "predicted_rul": round(pred_rul, 2),
            "health_assessment": health
        }
    except Exception:
        twin_state["live_predictions"] = {"note": "Run src/train.py to activate live ML inference"}

    if action_result:
        twin_state["maintenance_event"] = action_result

    return twin_state
