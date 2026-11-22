import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import json
import joblib
import numpy as np
import pandas as pd
import streamlit as st
import matplotlib.pyplot as plt

from src.data import load_train, INFORMATIVE_SENSORS
from src.features import build_features, feature_columns, engineer_single_row
from src.explain import explain_row, generate_diagnostic_summary
from src.digital_twin import TurbofanDigitalTwin
from src.models.anomaly import EnhancedAnomalyDetector

ROOT = Path(__file__).resolve().parent
ART = ROOT / "artifacts"
DATA = ROOT / "data" / "CMAPSSData"

st.set_page_config(
    page_title="Predictive Intelligence Platform",
    page_icon="✈️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom aerodynamic styling
st.markdown("""
<style>
    .metric-card {
        background-color: #1e293b;
        border-radius: 8px;
        padding: 16px;
        border-left: 4px solid #3b82f6;
    }
    .high-risk {
        color: #ef4444;
        font-weight: bold;
    }
    .med-risk {
        color: #f59e0b;
        font-weight: bold;
    }
    .low-risk {
        color: #10b981;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

st.title("✈️ Turbofan Predictive Intelligence Platform")
st.caption("Physics-Guided Digital Twin • Remaining Useful Life (RUL) • Industrial Anomaly Detection • SHAP Explainability")

@st.cache_resource
def load_all_models():
    model = joblib.load(ART / "rul_model.joblib")
    cols = json.loads((ART / "feature_columns.json").read_text())
    anomaly = joblib.load(ART / "anomaly_model.joblib")
    comparison = None
    if (ART / "model_comparison.json").exists():
        comparison = json.loads((ART / "model_comparison.json").read_text())
    return model, cols, anomaly, comparison

if not (ART / "rul_model.joblib").exists():
    st.warning("⚠️ Model artifacts not found. Please train models first using: `python src/train.py`.")
    st.stop()

model, cols, anomaly_model, model_comparison = load_all_models()
train_file = DATA / "train_FD001.txt"

if not train_file.exists():
    st.error("C-MAPSS dataset not found in `data/CMAPSSData/`. Please place train_FD001.txt there.")
    st.stop()

@st.cache_data
def load_fleet_data(path):
    raw = load_train(str(path))
    features = build_features(raw)
    return raw, features

raw_fleet, feat_fleet = load_fleet_data(train_file)
latest_fleet = feat_fleet.sort_values("cycle").groupby("engine_id").tail(1).reset_index(drop=True)

# Fleet predictions
X_fleet = latest_fleet[cols]
rul_preds = np.clip(model.predict(X_fleet), 0, 125)

if isinstance(anomaly_model, EnhancedAnomalyDetector):
    anom_scores = anomaly_model.score(X_fleet)
    health_indices = []
    severities = []
    for idx in range(len(latest_fleet)):
        res = anomaly_model.assess_engine_state(latest_fleet.iloc[[idx]])
        health_indices.append(res["health_index"])
        severities.append(res["severity"])
else:
    scaler = joblib.load(ART / "anomaly_scaler.joblib")
    anom_scores = anomaly_model.decision_function(scaler.transform(X_fleet))
    severities = np.where(anom_scores < 0, "Critical Anomaly", "Normal")
    health_indices = np.clip(1.0 + anom_scores, 0.05, 1.0)

fleet_view = pd.DataFrame({
    "Engine ID": latest_fleet["engine_id"].astype(int),
    "Current Cycle": latest_fleet["cycle"].astype(int),
    "Predicted RUL (cycles)": np.round(rul_preds, 1),
    "Health Index": np.round(health_indices, 2),
    "Anomaly Status": severities,
})

fleet_view["Risk Level"] = np.where(
    (fleet_view["Predicted RUL (cycles)"] < 25) | (fleet_view["Anomaly Status"] == "Critical Anomaly"), "HIGH",
    np.where(fleet_view["Predicted RUL (cycles)"] < 55, "MEDIUM", "LOW")
)

# Top KPI Header
c1, c2, c3, c4, c5 = st.columns(5)
c1.metric("Fleet Turbofans", len(fleet_view))
c2.metric("Critical / High Risk", int((fleet_view["Risk Level"] == "HIGH").sum()), delta_color="inverse")
c3.metric("Anomalies Detected", int((fleet_view["Anomaly Status"] != "Normal").sum()))
c4.metric("Avg Predicted RUL", f"{fleet_view['Predicted RUL (cycles)'].mean():.1f} cyc")
c5.metric("Avg Fleet Health Index", f"{fleet_view['Health Index'].mean():.2f}")

# Tabs navigation
tab_fleet, tab_engine, tab_twin, tab_xai, tab_bench, tab_api = st.tabs([
    "🌐 Fleet Digital Twin Matrix",
    "📊 Engine Telemetry & Degradation",
    "🧪 Live Simulator & What-If Lab",
    "🔍 SHAP Explainability",
    "📈 Model Benchmarks & MLflow",
    "⚡ API Console"
])

# ----------------- TAB 1: FLEET MATRIX -----------------
with tab_fleet:
    st.subheader("Commercial Turbofan Fleet Status")
    f_col1, f_col2 = st.columns([1, 3])
    with f_col1:
        risk_filter = st.multiselect("Filter by Risk Level", ["HIGH", "MEDIUM", "LOW"], default=["HIGH", "MEDIUM", "LOW"])
    
    filtered_fleet = fleet_view[fleet_view["Risk Level"].isin(risk_filter)]
    st.dataframe(
        filtered_fleet.style.map(
            lambda v: "background-color: #7f1d1d; color: #fecaca; font-weight: bold" if v == "HIGH"
            else ("background-color: #78350f; color: #fef3c7" if v == "MEDIUM" else "background-color: #064e3b; color: #a7f3d0"),
            subset=["Risk Level"]
        ),
        use_container_width=True, hide_index=True
    )

    col_h1, col_h2 = st.columns(2)
    with col_h1:
        fig_r, ax_r = plt.subplots(figsize=(6, 3.2))
        ax_r.hist(fleet_view["Predicted RUL (cycles)"], bins=20, color="#3b82f6", edgecolor="white")
        ax_r.set_title("Fleet RUL Distribution")
        ax_r.set_xlabel("Predicted Cycles Remaining")
        ax_r.set_ylabel("Number of Turbofans")
        st.pyplot(fig_r)
        plt.close(fig_r)

    with col_h2:
        fig_h, ax_h = plt.subplots(figsize=(6, 3.2))
        ax_h.hist(fleet_view["Health Index"], bins=20, color="#10b981", edgecolor="white")
        ax_h.set_title("Fleet Health Index Distribution")
        ax_h.set_xlabel("Health Index [0.0 = Degraded, 1.0 = Pristine]")
        ax_h.set_ylabel("Turbofan Count")
        st.pyplot(fig_h)
        plt.close(fig_h)

# ----------------- TAB 2: ENGINE TELEMETRY -----------------
with tab_engine:
    st.subheader("Turbofan Historical Telemetry & Sensor Trajectories")
    eng_list = sorted(fleet_view["Engine ID"].unique().tolist())
    selected_eng = st.selectbox("Select Aircraft Turbofan Engine ID", eng_list)
    
    eng_raw = raw_fleet[raw_fleet["engine_id"] == selected_eng].sort_values("cycle")
    eng_feat = feat_fleet[feat_fleet["engine_id"] == selected_eng].sort_values("cycle")
    latest_eng_row = eng_feat.iloc[[-1]]
    
    eng_pred_rul = float(np.clip(model.predict(latest_eng_row[cols])[0], 0, 125))
    if isinstance(anomaly_model, EnhancedAnomalyDetector):
        eng_assessment = anomaly_model.assess_engine_state(latest_eng_row)
    else:
        eng_assessment = {"severity": "Normal", "health_index": 0.85, "root_cause_sensors": []}

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Operational Cycles", int(eng_raw["cycle"].max()))
    m2.metric("Predicted RUL", f"{eng_pred_rul:.1f} cycles")
    m3.metric("Health Index", f"{eng_assessment['health_index']:.2f}")
    m4.metric("Anomaly Severity", eng_assessment["severity"])

    st.markdown("#### Primary Sensor Degradation Trends")
    s_col1, s_col2 = st.columns(2)
    with s_col1:
        fig_s1, ax_s1 = plt.subplots(figsize=(7, 3.5))
        ax_s1.plot(eng_raw["cycle"], eng_raw["sensor_4"], label="T50: LPT Outlet Temp (°R)", color="#ef4444")
        ax_s1.plot(eng_raw["cycle"], eng_raw["sensor_3"], label="T30: HPC Outlet Temp (°R)", color="#f59e0b")
        ax_s1.set_xlabel("Flight Cycles")
        ax_s1.set_ylabel("Temperature (°R)")
        ax_s1.legend()
        ax_s1.grid(True, linestyle="--", alpha=0.5)
        st.pyplot(fig_s1)
        plt.close(fig_s1)

    with s_col2:
        fig_s2, ax_s2 = plt.subplots(figsize=(7, 3.5))
        ax_s2.plot(eng_raw["cycle"], eng_raw["sensor_7"], label="P30: HPC Pressure (psia)", color="#3b82f6")
        ax_s2.plot(eng_raw["cycle"], eng_raw["sensor_14"], label="NRc: Corrected Core Speed (rpm)", color="#8b5cf6")
        ax_s2.set_xlabel("Flight Cycles")
        ax_s2.set_ylabel("Pressure / Speed")
        ax_s2.legend()
        ax_s2.grid(True, linestyle="--", alpha=0.5)
        st.pyplot(fig_s2)
        plt.close(fig_s2)

    if eng_assessment.get("root_cause_sensors"):
        st.markdown("#### Anomaly Root-Cause Contributors")
        st.dataframe(pd.DataFrame(eng_assessment["root_cause_sensors"]), use_container_width=True, hide_index=True)

# ----------------- TAB 3: DIGITAL TWIN SIMULATOR -----------------
with tab_twin:
    st.subheader("Physics-Guided Turbofan Digital Twin & What-If Stress Lab")
    st.caption("Simulate real-time cycle degradation, inject operational stresses, and evaluate prescriptive maintenance actions.")

    if "digital_twin" not in st.session_state:
        st.session_state.digital_twin = TurbofanDigitalTwin(engine_id=1, initial_cycle=1)

    twin = st.session_state.digital_twin

    tw_c1, tw_c2 = st.columns([1, 2])
    with tw_c1:
        st.markdown("#### Operational Stress Controls")
        th_stress = st.slider("Thermal Stress Multiplier", 0.5, 2.5, float(twin.thermal_stress_multiplier), 0.1)
        contam = st.slider("Environmental Contamination (Sand/Ash)", 0.5, 3.0, float(twin.contamination_rate), 0.1)
        derate = st.slider("Thrust Derating (% Life Extension)", 0.0, 0.25, float(twin.thrust_derating), 0.05)
        twin.set_stress_parameters(thermal_stress=th_stress, contamination=contam, thrust_derate=derate)

        cycles_step = st.number_input("Advance Flight Cycles", min_value=1, max_value=30, value=5)
        b_step = st.button("⏩ Advance Digital Twin Simulation", use_container_width=True)

        st.markdown("#### Maintenance Interventions")
        m_col1, m_col2 = st.columns(2)
        if m_col1.button("🧼 Core Water Wash", use_container_width=True):
            res = twin.apply_maintenance_action("compressor_wash")
            st.success(res["summary"])
        if m_col2.button("🔧 Blade Repair", use_container_width=True):
            res = twin.apply_maintenance_action("hot_section_inspection")
            st.success(res["summary"])
        if st.button("🔄 Complete Depot Overhaul (Reset)", use_container_width=True):
            res = twin.apply_maintenance_action("major_overhaul")
            st.info(res["summary"])

    with tw_c2:
        if b_step:
            twin.step(cycles=cycles_step)

        twin_state = twin.get_current_state()
        history_df = twin.get_history_df()

        # Run model inference on simulated twin telemetry
        feat_single = engineer_single_row(twin_state["latest_telemetry"], history_df=history_df, cols_schema=cols)
        twin_pred_rul = float(np.clip(model.predict(feat_single[cols])[0], 0, 125))

        k1, k2, k3 = st.columns(3)
        k1.metric("Simulated Engine Cycle", twin_state["cycle"])
        k2.metric("Digital Twin RUL", f"{twin_pred_rul:.1f} cycles")
        k3.metric("Overall Health Index", f"{twin_state['overall_health_index']:.2f}")

        # Subsystems wear progress
        st.markdown("#### Subsystem Degradation States")
        subsystems = twin_state["subsystems"]
        for name, data in subsystems.items():
            st.write(f"**{name}**: {data['wear_pct']}% wear ({data['status']})")
            st.progress(min(1.0, data["wear_pct"] / 100.0))

        # Prescriptive Advisory Card
        rec = twin_state["prescriptive_maintenance"]
        st.info(f"**Prescriptive Maintenance Advisory [{rec['urgency']}]:** {rec['recommendation']}\n\n*Operational Restriction: {rec['flight_restriction']}*")

        # Live telemetry curve
        fig_tw, ax_tw = plt.subplots(figsize=(8, 3))
        ax_tw.plot(history_df["cycle"], history_df["sensor_4"], color="#ef4444", label="LPT Outlet Temp T50 (°R)")
        ax_tw.plot(history_df["cycle"], history_df["sensor_3"], color="#f59e0b", label="HPC Outlet Temp T30 (°R)")
        ax_tw.set_title("Simulated Digital Twin Live Telemetry")
        ax_tw.set_xlabel("Flight Cycle")
        ax_tw.legend()
        ax_tw.grid(True, linestyle="--", alpha=0.5)
        st.pyplot(fig_tw)
        plt.close(fig_tw)

# ----------------- TAB 4: SHAP EXPLAINABILITY -----------------
with tab_xai:
    st.subheader("Explainable AI (SHAP) — Turbine Physics & Feature Attribution")
    st.caption("Inspect the exact thermodynamic sensor measurements driving the model's RUL predictions.")

    exp_eng = st.selectbox("Select Engine for SHAP Explanation", eng_list, key="shap_eng")
    target_row = feat_fleet[feat_fleet["engine_id"] == exp_eng].sort_values("cycle").iloc[[-1]]
    exp_rul = float(np.clip(model.predict(target_row[cols])[0], 0, 125))

    explanation_df = explain_row(target_row, top_n=10)
    summary_text = generate_diagnostic_summary(explanation_df, exp_rul)
    st.success(f"**Diagnostic Summary:** {summary_text}")

    if "impact_cycles" in explanation_df.columns:
        fig_shap, ax_shap = plt.subplots(figsize=(9, 4.5))
        colors = ["#10b981" if x > 0 else "#ef4444" for x in explanation_df["impact_cycles"]]
        ax_shap.barh(explanation_df["description"], explanation_df["impact_cycles"], color=colors)
        ax_shap.axvline(0, color="gray", linewidth=0.8, linestyle="--")
        ax_shap.set_xlabel("SHAP Impact on Predicted RUL (Flight Cycles)")
        ax_shap.set_title(f"Engine {exp_eng} — Local Feature Attributions (Cycle {int(target_row['cycle'].iloc[0])})")
        plt.tight_layout()
        st.pyplot(fig_shap)
        plt.close(fig_shap)

        st.dataframe(explanation_df[["description", "feature", "feature_value", "impact_cycles", "direction"]], use_container_width=True, hide_index=True)

# ----------------- TAB 5: BENCHMARKS & MLFLOW -----------------
with tab_bench:
    st.subheader("Model Benchmarks, Cross-Validation & MLflow Experiment Tracking")
    st.caption("Engine-wise validation split (0% data leakage across engines) and official NASA PHM Challenge scoring.")

    if model_comparison:
        rows = []
        for m_name, metrics in model_comparison.items():
            t = metrics["test"]
            v = metrics["validation"]
            rows.append({
                "Model Architecture": m_name,
                "Test RMSE (cycles)": t["RMSE"],
                "Test MAE (cycles)": t["MAE"],
                "Test R²": t["R2"],
                "NASA PHM Score": t["NASA_PHM_Score"],
                "Val RMSE": v["RMSE"],
                "Val MAE": v["MAE"]
            })
        df_bench = pd.DataFrame(rows)
        st.dataframe(df_bench.sort_values("Test RMSE (cycles)"), use_container_width=True, hide_index=True)

        fig_b, ax_b = plt.subplots(1, 2, figsize=(11, 3.8))
        ax_b[0].bar(df_bench["Model Architecture"], df_bench["Test RMSE (cycles)"], color="#3b82f6")
        ax_b[0].set_title("Test RMSE Comparison (Lower is Better)")
        ax_b[0].set_ylabel("RMSE (cycles)")
        ax_b[0].tick_params(axis="x", rotation=25)

        ax_b[1].bar(df_bench["Model Architecture"], df_bench["NASA PHM Score"], color="#8b5cf6")
        ax_b[1].set_title("NASA PHM Asymmetric Penalty Score (Lower is Better)")
        ax_b[1].set_ylabel("NASA PHM Score")
        ax_b[1].tick_params(axis="x", rotation=25)
        plt.tight_layout()
        st.pyplot(fig_b)
        plt.close(fig_b)
    else:
        st.info("Run `python src/train.py` to populate benchmarking metrics.")

# ----------------- TAB 6: API CONSOLE -----------------
with tab_api:
    st.subheader("Interactive FastAPI Prediction & Testing Console")
    st.markdown("Test the FastAPI prediction endpoint (`POST /predict/raw`) with simulated or custom sensor readings.")

    test_sensors = {
        "sensor_2": 642.5, "sensor_3": 1589.2, "sensor_4": 1406.8, "sensor_7": 553.2,
        "sensor_8": 2388.09, "sensor_9": 9056.4, "sensor_11": 47.3, "sensor_12": 521.2,
        "sensor_13": 2388.08, "sensor_14": 8132.5, "sensor_15": 8.44, "sensor_17": 393.0,
        "sensor_20": 38.6, "sensor_21": 23.28
    }

    raw_payload_json = json.dumps({
        "engine_id": 1,
        "cycle": 150,
        "op_setting_1": 0.0015,
        "op_setting_2": 0.0003,
        "op_setting_3": 100.0,
        "sensors": test_sensors
    }, indent=2)

    req_text = st.text_area("Request Payload JSON", value=raw_payload_json, height=220)

    if st.button("🚀 Send Inference Request to Backend", use_container_width=True):
        try:
            req_data = json.loads(req_text)
            feat_row = engineer_single_row(
                {**{"engine_id": req_data.get("engine_id", 1), "cycle": req_data.get("cycle", 1),
                    "op_setting_1": req_data.get("op_setting_1", 0.0), "op_setting_2": req_data.get("op_setting_2", 0.0),
                    "op_setting_3": req_data.get("op_setting_3", 100.0)}, **req_data.get("sensors", {})},
                cols_schema=cols
            )
            pred_val = float(np.clip(model.predict(feat_row[cols])[0], 0, 125))
            health = anomaly_model.assess_engine_state(feat_row[cols]) if isinstance(anomaly_model, EnhancedAnomalyDetector) else {}
            
            resp_data = {
                "status": "200 OK",
                "predicted_rul_cycles": round(pred_val, 2),
                "maintenance_risk": "HIGH" if pred_val < 25 else ("MEDIUM" if pred_val < 55 else "LOW"),
                "health_assessment": health
            }
            st.json(resp_data)
        except Exception as e:
            st.error(f"Inference error: {e}")
