# AeroTwin AI — Turbofan Predictive Intelligence Platform with Digital Twin & Explainable AI

An industrial-grade predictive maintenance and digital twin platform for commercial aircraft turbofans (NASA C-MAPSS FD001 benchmark). Features a modern React + Three.js + React Three Fiber cutaway 3D digital twin, cycle-accurate Remaining Useful Life (RUL) estimation, calibrated anomaly detection with a continuous Health Index, and local/global SHAP explainability.

---

## 🚀 System Architecture & Key Capabilities

```
predictive_intelligence_platform/
├── frontend/                     # Modern React + Vite + TypeScript + Three.js SPA
│   ├── src/
│   │   ├── components/           # Reusable engineering metric cards, status badges, layout
│   │   ├── pages/                # 8 Specialized Industrial AI Pages
│   │   ├── services/             # Typed API client connecting to FastAPI
│   │   ├── three/                # High-fidelity 3D Turbofan cutaway scene & controls
│   │   └── types/                # Strict TypeScript data schemas
│   ├── Dockerfile & nginx.conf   # Production web server containerization
│   └── package.json
├── src/                          # Production Python ML & Backend
│   ├── api.py                    # High-throughput FastAPI REST API (with CORS & fleet routes)
│   ├── data.py                   # C-MAPSS data ingestion & 3D sliding sequence generator
│   ├── features.py               # 164 statistical, differential & thermodynamic features
│   ├── digital_twin.py           # Physics-guided 5-subsystem degradation simulation kernel
│   ├── explain.py                # TreeExplainer SHAP attributions & engineering synthesis
│   ├── mlflow_utils.py           # MLflow experiment tracking & model governance
│   └── models/                   # Ridge, Random Forest, Extra Trees, XGBoost, PyTorch LSTM
├── artifacts/                    # Checkpoints, JSON metrics, Executive Report & Presentation Deck
├── tests/                        # Automated Pytest suite (100% passing)
├── docker-compose.yml            # Multi-container orchestration (Frontend, API, Dashboard, MLflow)
└── requirements.txt
```

### 1. Modern Industrial React + Three.js Web Platform
- **Design System**: Premium white & slate aerospace engineering aesthetics (inspired by modern flight deck avionics and industrial digital twins).
- **Interactive 3D Digital Twin**: Realistic cutaway turbofan model rendered via Three.js and React Three Fiber.
  - Interactive orbit rotation, zoom, pan, and component selection.
  - Subsystems modeled: Fan/LPC rotor, High Pressure Compressor (HPC), Annular Combustor with thermal emission, High Pressure Turbine (HPT), Low Pressure Turbine (LPT), Outer Cowling, and Exhaust Plug.
  - Visual degradation wear color encoding (Healthy slate/cyan, Warning amber, Critical red).
  - Animated 24-blade titanium fan rotor and compressor core spool.
  - Sensor pin callouts ($T_{24}, T_{30}, T_{50}, P_{30}, N_c$).
- **8 Dedicated Engineering Modules**:
  1. **Command Center**: Overview fleet metrics, interactive 3D twin preview, RUL histogram, priority risk classification.
  2. **Digital Twin Studio**: Full-fidelity 3D inspection, component diagnostics, What-If stress testing (thermal multiplier, sand contamination, thrust derating), and live maintenance scenario simulation (core wash, blade repair, depot overhaul).
  3. **Machine Intelligence**: Engine selector, live sensor readouts, instant backend inference, and genuine historical sensor degradation curves.
  4. **Model Evaluation Center**: Side-by-side benchmark comparison (Ridge, RF, Extra Trees, XGBoost, LSTM) with test RMSE, MAE, R², and official NASA asymmetric penalty score.
  5. **Explainable AI (SHAP)**: Waterfall attribution breakdown showing exact cycle contributions per sensor and plain-English thermodynamic diagnostic synthesis.
  6. **Anomaly Intelligence**: Calibrated dual Isolation Forest and PCA reconstruction error with continuous Health Index (HI: 0.05 to 1.0) and sensor root-cause z-scores.
  7. **Maintenance Planning**: Priority-ranked scheduling queue, inspection windows, and prescriptive maintenance trade-off comparison.
  8. **MLOps Governance**: Model registry, artifact store inventory, feature pipeline specifications, and real-time API latency health monitoring.

---

## 📊 Benchmark Results (Official Held-Out NASA Test Set - 100 Engines)

Evaluated at the final observed flight cycle with NASA ground-truth RUL:

| Model Architecture | Test RMSE (cycles) | Test MAE (cycles) | Test R² | NASA PHM Score (Lower = Better) |
| :--- | :---: | :---: | :---: | :---: |
| **Random Forest (Production)** | **12.96** | **9.64** | **0.895** | **249.8** |
| **Extra Trees** | 13.48 | 10.08 | 0.887 | 291.4 |
| **XGBoost Regressor** | 13.70 | 9.87 | 0.883 | 279.0 |
| **Ridge Baseline** | 16.22 | 13.15 | 0.836 | 414.0 |
| **LSTM Deep Learning** | 17.66 | 14.05 | 0.806 | 576.8 |

*The NASA PHM challenge scoring function exponentially penalizes late predictions ($d_i \ge 0$) due to catastrophic in-flight failure risk.*

---

## 🛠️ Quick Start & Execution Guide

### 1. Backend Setup & Model Training
```bash
# Set up Python virtual environment
py -3.11 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Train and benchmark all ML & LSTM models
python src/train.py --subset FD001

# Run automated tests
pytest -v tests/test_platform.py
```

### 2. Launch FastAPI Backend API
```bash
# Start backend server on port 8000
python -m uvicorn src.api:app --host 0.0.0.0 --port 8000 --reload
```
Interactive Swagger API documentation available at: **[http://localhost:8000/docs](http://localhost:8000/docs)**

### 3. Launch React + Three.js Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser to access the modern web platform!

*(Optional) Build production static assets:*
```bash
cd frontend
npm run build
```

### 4. (Optional) Run Classic Streamlit Dashboard
```bash
streamlit run app.py
```
Accessible at: **[http://localhost:8501](http://localhost:8501)**

### 5. Multi-Container Docker Deployment
```bash
docker-compose up --build
```
Spins up:
- **React Frontend:** `http://localhost:5173`
- **FastAPI Backend:** `http://localhost:8000`
- **Streamlit Dashboard:** `http://localhost:8501`
- **MLflow Tracking UI:** `http://localhost:5000`

---

## 📑 Generated Technical Assets

- **Executive Technical Report:** [`artifacts/Executive_Project_Report.md`](artifacts/Executive_Project_Report.md)
- **10-Slide Presentation Deck:** [`artifacts/Predictive_Intelligence_Platform_Presentation.pptx`](artifacts/Predictive_Intelligence_Platform_Presentation.pptx)
- **Model Checkpoints:** `artifacts/rul_model.joblib`, `artifacts/anomaly_model.joblib`, `artifacts/lstm_model.pt`
- **Benchmarking Results:** `artifacts/model_comparison.json`, `artifacts/metrics.json`
