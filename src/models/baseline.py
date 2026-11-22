import numpy as np
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, ExtraTreesRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

def make_ridge_baseline():
    """Simple linear baseline with L2 regularization."""
    return Pipeline([
        ("scaler", StandardScaler()),
        ("ridge", Ridge(alpha=10.0, random_state=42))
    ]), "Ridge Baseline"

def make_random_forest():
    """Optimized Random Forest regressor for tabular degradation features."""
    return RandomForestRegressor(
        n_estimators=300,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features="sqrt",
        random_state=42,
        n_jobs=-1
    ), "Random Forest"

def make_extra_trees():
    """Extra Trees ensemble regressor for high-variance tabular features."""
    return ExtraTreesRegressor(
        n_estimators=250,
        max_depth=16,
        min_samples_leaf=2,
        max_features="sqrt",
        random_state=42,
        n_jobs=-1
    ), "Extra Trees"
