from pathlib import Path
import joblib
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"

# Sensor engineering domain descriptions for human-readable diagnostic messages
SENSOR_DESCRIPTIONS = {
    "sensor_2": "Fan inlet temperature (T24)",
    "sensor_3": "Total temperature at HPC outlet (T30)",
    "sensor_4": "Total temperature at LPT outlet (T50)",
    "sensor_7": "Total pressure at HPC outlet (P30)",
    "sensor_8": "Physical fan speed (Nf)",
    "sensor_9": "Physical core speed / coolant flow (Nc)",
    "sensor_11": "Static pressure at HPC outlet (Ps30)",
    "sensor_12": "Ratio of fuel flow to Ps30 (phi)",
    "sensor_13": "Corrected fan speed (NRf)",
    "sensor_14": "Corrected core speed (NRc)",
    "sensor_15": "Bypass ratio (BPR)",
    "sensor_17": "Bleed enthalpy (htBleed)",
    "sensor_20": "HPT coolant bleed flow (W31)",
    "sensor_21": "LPT coolant bleed flow (W32)",
    "ratio_temp_lpt_fan": "LPT to Fan Temperature Ratio",
    "ratio_temp_lpt_hpc": "LPT to HPC Temperature Margin",
    "ratio_fuel_pressure": "Fuel-to-Pressure Combustion Ratio",
    "ratio_core_fan_speed": "Core-to-Fan Speed Differential Ratio",
}

def get_feature_description(feat_name: str) -> str:
    """Map raw or engineered feature name to plain-English domain description."""
    for key, desc in SENSOR_DESCRIPTIONS.items():
        if key in feat_name:
            if "drift" in feat_name:
                return f"{desc} [Drift from Baseline]"
            if "mean" in feat_name:
                return f"{desc} [Rolling Mean]"
            if "std" in feat_name:
                return f"{desc} [Rolling Std/Vibration]"
            if "diff" in feat_name:
                return f"{desc} [Rate of Change]"
            return desc
    return feat_name.replace("_", " ").title()

def explain_row(feature_row: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
    """
    Generate local SHAP explanation for a specific engine cycle state.
    Returns sorted dataframe with features, SHAP impacts, direction, and domain diagnostic.
    """
    model_path = ART / "rul_model.joblib"
    cols_path = ART / "feature_columns.json"
    if not model_path.exists() or not cols_path.exists():
        return pd.DataFrame({"note": ["Model artifacts missing. Run src/train.py first."]})

    model = joblib.load(model_path)
    cols = json.loads(cols_path.read_text())
    
    # Ensure correct column ordering
    row = feature_row[cols].iloc[[0]]

    try:
        import shap
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(row)
        
        # Handle list vs ndarray return for different SHAP / XGBoost versions
        if isinstance(shap_values, list):
            values = shap_values[0][0]
        elif len(shap_values.shape) > 1:
            values = shap_values[0]
        else:
            values = shap_values

        result = pd.DataFrame({
            "feature": cols,
            "feature_value": [float(row[c].iloc[0]) for c in cols],
            "impact_cycles": [float(v) for v in values],
            "abs_impact": [float(abs(v)) for v in values]
        }).sort_values("abs_impact", ascending=False).head(top_n).reset_index(drop=True)

        result["direction"] = result["impact_cycles"].apply(
            lambda x: "Extends RUL (+cycles)" if x > 0 else "Reduces RUL (-cycles)"
        )
        result["description"] = result["feature"].apply(get_feature_description)
        result["impact_cycles"] = result["impact_cycles"].round(2)
        result["feature_value"] = result["feature_value"].round(3)
        return result
        
    except Exception as exc:
        # Fallback to feature importance if SHAP throws error
        importance = getattr(model, "feature_importances_", None)
        if importance is not None:
            df_imp = pd.DataFrame({
                "feature": cols,
                "feature_value": [float(row[c].iloc[0]) for c in cols],
                "impact_cycles": [round(float(imp * 100), 2) for imp in importance],
                "abs_impact": [float(imp) for imp in importance]
            }).sort_values("abs_impact", ascending=False).head(top_n).reset_index(drop=True)
            df_imp["direction"] = "Global Importance"
            df_imp["description"] = df_imp["feature"].apply(get_feature_description)
            return df_imp
            
        return pd.DataFrame({"note": [f"Explainability fallback: {exc}"]})

def generate_diagnostic_summary(explanation_df: pd.DataFrame, predicted_rul: float) -> str:
    """Generate human-readable engineering diagnostics from top SHAP impacts."""
    if "impact_cycles" not in explanation_df.columns:
        return "Standard diagnostic data unavailable."
        
    negatives = explanation_df[explanation_df["impact_cycles"] < 0].head(3)
    positives = explanation_df[explanation_df["impact_cycles"] > 0].head(2)
    
    parts = [f"Predicted Remaining Useful Life: {predicted_rul:.1f} flight cycles."]
    
    if not negatives.empty:
        reasons = []
        for _, r in negatives.iterrows():
            reasons.append(f"{r['description']} ({r['impact_cycles']:+.1f} cycles)")
        parts.append("Primary degradation drivers reducing life: " + "; ".join(reasons) + ".")
        
    if not positives.empty:
        strengths = []
        for _, r in positives.iterrows():
            strengths.append(f"{r['description']} ({r['impact_cycles']:+.1f} cycles)")
        parts.append("Favorable subsystem indicators: " + "; ".join(strengths) + ".")
        
    return " ".join(parts)
