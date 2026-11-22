# Predictive Intelligence Platform with Digital Twin & Explainable AI

An industrial-grade predictive maintenance platform for commercial turbofan engines (NASA C-MAPSS FD001 benchmark). Provides cycle-accurate Remaining Useful Life (RUL) estimation, physics-guided digital twin simulation, calibrated anomaly detection with a continuous Health Index, and local/global SHAP explainability.

---

## 🚀 Key Capabilities & Architecture

- **Advanced Feature Engineering**: 164 statistical rolling moments (5, 10, 20 cycles), baseline drift from pristine cycles, 1-cycle and 5-cycle differentials, and thermodynamic cross-sensor ratios ($T_{50}/T_{24}$, $T_{50}/T_{30}$, fuel-to-pressure ratio, core-to-fan speed ratio).
- **Comprehensive Model Benchmark**:
  - Baseline L2 Ridge Regression
  - Random Forest Regressor
  - Extra Trees Regressor
  - XGBoost Regressor
  - Deep Learning LSTM Sequence Model (PyTorch / Recurrent)
  - Engine-wise validation split (0% data leakage across engines)
  - Official NASA PHM Challenge scoring function penalizing late predictions exponentially.
- **Calibrated Dual Anomaly Detection**:
  - Isolation Forest + PCA subspace reconstruction error calibrated on pristine cycles (1–25).
  - Continuous Health Index (HI: 1.0 down to 0.05).
  - Sensor-level root-cause z-score attribution.
- **Physics-Guided Turbofan Digital Twin**:
  - Real-time cycle progression modeling 5 engine subsystems (Fan/LPC, HPC, Combustor, HPT, LPT).
  - What-If operational stress testing: Thermal Stress Multiplier, Sand/Ash Contamination, Thrust Derating.
  - Prescriptive maintenance actions (Core Water Wash, Borescope Blade Repair, Depot Overhaul).
- **Explainable AI (SHAP)**:
  - TreeExplainer local waterfall attributions and global feature importances.
  - Automated translation into plain-English turbine engineering diagnostics.
- **Production Deployment**:
  - FastAPI REST API (`/predict/raw`, `/predict/features`, `/explain`, `/digital-twin/simulate`, `/health`).
  - Interactive multi-tab Streamlit dashboard.
  - MLflow experiment tracking.
  - Multi-container Docker deployment (`docker-compose.yml`).
  - 10-slide PowerPoint presentation (`Predictive_Intelligence_Platform_Presentation.pptx`).

---

## 📊 Benchmark Results (Official Held-Out NASA Test Set - 100 Engines)

| Model Architecture | Test RMSE (cycles) | Test MAE (cycles) | Test R² | NASA PHM Score (Lower=Better) |
| :--- | :---: | :---: | :---: | :---: |
| **Ridge Baseline** | 16.22 | 13.15 | 0.836 | 414.0 |
| **Random Forest (Selected)** | **12.96** | **9.64** | **0.895** | **249.8** |
| **Extra Trees** | 13.48 | 10.08 | 0.887 | 291.4 |
| **XGBoost** | 13.70 | 9.87 | 0.883 | 279.0 |
| **LSTM Deep Learning** | 17.66 | 14.05 | 0.806 | 576.8 |

---

## 🛠️ Quick Start Guide

### 1. Environment Setup
```bash
py -3.11 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Train and Benchmark All Models
```bash
python src/train.py --subset FD001
```
Artifacts are automatically saved to `artifacts/` (`rul_model.joblib`, `model_comparison.json`, `anomaly_model.joblib`, `lstm_model.pt`).

### 3. Run Automated Tests
```bash
pytest -v tests/test_platform.py
```

### 4. Launch Streamlit Dashboard
```bash
streamlit run app.py
```
Open [http://localhost:8501](http://localhost:8501) to explore:
1. **Fleet Digital Twin Matrix**: Interactive fleet risk badges & RUL distribution.
2. **Engine Telemetry & Degradation**: Historical sensor curves & anomaly contributors.
3. **Live Simulator & What-If Lab**: Advance engine degradation, inject thermal/sand stress, and apply maintenance washes.
4. **SHAP Explainability**: Local waterfall attributions and plain-English diagnostics.
5. **Model Benchmarks & MLflow**: Side-by-side metric charts and validation results.
6. **API Console**: Real-time payload tester.

### 5. Launch FastAPI REST API
```bash
uvicorn src.api:app --reload --port 8000
```
Explore the interactive Swagger documentation at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 6. Generate Report and Presentation Slides
```bash
python scripts/generate_report_and_presentation.py
```
Outputs:
- Technical Report: `artifacts/Executive_Project_Report.md`
- Presentation Deck: `artifacts/Predictive_Intelligence_Platform_Presentation.pptx`

### 7. Docker Deployment
```bash
docker-compose up --build
```
Spins up:
- FastAPI API: `http://localhost:8000`
- Streamlit Dashboard: `http://localhost:8501`
- MLflow Tracking Server: `http://localhost:5000`
