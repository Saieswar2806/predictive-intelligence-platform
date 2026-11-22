import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from typing import Dict, Any, List, Tuple, Optional

class EnhancedAnomalyDetector:
    """
    Industrial Turbofan Health & Anomaly Detector:
    1. Calibrated Isolation Forest for multivariate anomaly detection.
    2. PCA Reconstruction Error for residual drift tracking.
    3. Health Index (HI) from 1.0 (pristine) down to 0.0 (failure threshold).
    4. Sensor-level anomaly attribution (identifying root-cause sensors).
    """
    def __init__(self, contamination: float = 0.03, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self.scaler = StandardScaler()
        self.iso_forest = IsolationForest(
            n_estimators=300,
            contamination=contamination,
            max_samples=0.8,
            random_state=random_state,
            n_jobs=-1
        )
        self.pca = PCA(n_components=0.90, random_state=random_state)
        self.feature_names: List[str] = []
        self.baseline_means: np.ndarray = None
        self.baseline_stds: np.ndarray = None
        self.threshold_warning: float = 0.0
        self.threshold_critical: float = 0.0
        self.is_fitted: bool = False

    def fit(self, X: pd.DataFrame, feature_names: Optional[List[str]] = None):
        if feature_names is None:
            self.feature_names = list(X.columns)
        else:
            self.feature_names = feature_names

        X_vals = X[self.feature_names].to_numpy()
        self.baseline_means = np.mean(X_vals, axis=0)
        self.baseline_stds = np.std(X_vals, axis=0) + 1e-6

        # Standardize features
        X_scaled = self.scaler.fit_transform(X_vals)

        # Fit Isolation Forest and PCA
        self.iso_forest.fit(X_scaled)
        self.pca.fit(X_scaled)

        # Compute training scores for threshold calibration
        train_scores = self.iso_forest.decision_function(X_scaled)
        self.threshold_warning = float(np.percentile(train_scores, 10))
        self.threshold_critical = float(np.percentile(train_scores, 2))
        self.is_fitted = True
        return self

    def score(self, X: pd.DataFrame) -> np.ndarray:
        """Returns decision function scores: lower = more anomalous."""
        X_vals = X[self.feature_names].to_numpy()
        X_scaled = self.scaler.transform(X_vals)
        return self.iso_forest.decision_function(X_scaled)

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Returns 1 for normal, -1 for anomaly."""
        X_vals = X[self.feature_names].to_numpy()
        X_scaled = self.scaler.transform(X_vals)
        return self.iso_forest.predict(X_scaled)

    def compute_reconstruction_error(self, X: pd.DataFrame) -> np.ndarray:
        """Compute PCA reconstruction error."""
        X_vals = X[self.feature_names].to_numpy()
        X_scaled = self.scaler.transform(X_vals)
        X_projected = self.pca.inverse_transform(self.pca.transform(X_scaled))
        recon_errors = np.mean((X_scaled - X_projected) ** 2, axis=1)
        return recon_errors

    def assess_engine_state(self, row: pd.DataFrame) -> Dict[str, Any]:
        """
        Produce a full health assessment:
        - raw score
        - status label (Normal, Warning, Critical Anomaly)
        - Health Index (HI: 0.0 to 1.0)
        - Root-cause contributing sensors with z-scores
        """
        X_row = row[self.feature_names].to_numpy()
        X_scaled = self.scaler.transform(X_row)
        score = float(self.iso_forest.decision_function(X_scaled)[0])
        recon_err = float(self.compute_reconstruction_error(row)[0])
        is_anom = bool(score < self.threshold_warning)

        if score < self.threshold_critical:
            severity = "Critical Anomaly"
        elif score < self.threshold_warning:
            severity = "Warning Deviation"
        else:
            severity = "Normal"

        # Calculate Health Index (HI) scaled from [0.0, 1.0]
        # High score -> HI close to 1.0; severe anomaly -> HI drops to 0.0
        normalized_hi = (score - self.threshold_critical) / (max(self.threshold_warning - self.threshold_critical, 1e-4) * 2.5)
        health_index = float(np.clip(normalized_hi, 0.05, 1.0))

        # Sensor root-cause z-scores
        z_scores = np.abs((X_row[0] - self.baseline_means) / self.baseline_stds)
        top_indices = np.argsort(z_scores)[::-1][:5]
        top_anomalous_sensors = [
            {
                "feature": self.feature_names[i],
                "z_score": round(float(z_scores[i]), 2),
                "current_value": round(float(X_row[0, i]), 3),
                "baseline_mean": round(float(self.baseline_means[i]), 3)
            }
            for i in top_indices if z_scores[i] > 1.5
        ]

        return {
            "anomaly_score": round(score, 4),
            "reconstruction_error": round(recon_err, 4),
            "is_anomaly": is_anom,
            "severity": severity,
            "health_index": round(health_index, 3),
            "root_cause_sensors": top_anomalous_sensors
        }
