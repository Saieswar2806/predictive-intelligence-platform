def make_xgboost():
    """
    Construct tuned XGBoost regressor for turbofan RUL prediction.
    Uses conservative learning rate, column subsampling, and Huber/squarederror objective.
    """
    try:
        from xgboost import XGBRegressor
        model = XGBRegressor(
            n_estimators=450,
            max_depth=6,
            learning_rate=0.035,
            subsample=0.8,
            colsample_bytree=0.8,
            gamma=0.1,
            reg_alpha=0.05,
            reg_lambda=1.0,
            objective="reg:squarederror",
            random_state=42,
            n_jobs=-1
        )
        return model, "XGBoost"
    except ImportError:
        from sklearn.ensemble import GradientBoostingRegressor
        return GradientBoostingRegressor(
            n_estimators=300,
            learning_rate=0.04,
            max_depth=5,
            subsample=0.85,
            random_state=42
        ), "Gradient Boosting (Fallback)"
