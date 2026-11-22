import os
import json
from pathlib import Path
from typing import Dict, Any, Optional

ROOT = Path(__file__).resolve().parents[1]
MLRUNS_DIR = ROOT / "mlruns"
ART = ROOT / "artifacts"

class MLflowTracker:
    """
    MLflow Tracking manager for experiment logging and model governance.
    Works with active MLflow installation and provides clean file-based fallback.
    Explicitly tracks:
    - Candidate validation metrics
    - Final test metrics (strictly separated)
    - Dataset and feature schema versions
    - Artifact provenance
    """
    def __init__(self, experiment_name: str = "Turbofan-RUL-Predictive-Intelligence"):
        self.experiment_name = experiment_name
        self.mlflow_available = False
        self.active_run = None
        self._init_mlflow()

    def _init_mlflow(self):
        try:
            import mlflow
            self.mlflow = mlflow
            MLRUNS_DIR.mkdir(exist_ok=True)
            self.mlflow.set_tracking_uri(f"file:///{MLRUNS_DIR.as_posix()}")
            self.mlflow.set_experiment(self.experiment_name)
            self.mlflow_available = True
        except ImportError:
            self.mlflow = None
            self.mlflow_available = False

    def start_run(self, run_name: str, tags: Optional[Dict[str, str]] = None):
        if self.mlflow_available:
            self.active_run = self.mlflow.start_run(run_name=run_name, tags=tags)
        else:
            self.active_run = {
                "run_name": run_name,
                "tags": tags or {},
                "params": {},
                "validation_metrics": {},
                "test_metrics": {},
                "metrics": {}
            }
        return self

    def log_params(self, params: Dict[str, Any]):
        if self.mlflow_available:
            self.mlflow.log_params(params)
        elif self.active_run:
            self.active_run["params"].update(params)

    def log_metrics(self, metrics: Dict[str, float], step: Optional[int] = None):
        clean_metrics = {k: float(v) for k, v in metrics.items()}
        if self.mlflow_available:
            self.mlflow.log_metrics(clean_metrics, step=step)
        elif self.active_run:
            self.active_run["metrics"].update(clean_metrics)

    def log_validation_metrics(self, metrics: Dict[str, float]):
        """Explicitly log validation metrics separate from test metrics."""
        prefixed = {f"val_{k}": float(v) for k, v in metrics.items()}
        if self.mlflow_available:
            self.mlflow.log_metrics(prefixed)
        elif self.active_run:
            self.active_run["validation_metrics"].update(prefixed)
            self.active_run["metrics"].update(prefixed)

    def log_test_metrics(self, metrics: Dict[str, float]):
        """Explicitly log test metrics evaluated only after model selection."""
        prefixed = {f"test_{k}": float(v) for k, v in metrics.items()}
        if self.mlflow_available:
            self.mlflow.log_metrics(prefixed)
        elif self.active_run:
            self.active_run["test_metrics"].update(prefixed)
            self.active_run["metrics"].update(prefixed)

    def log_artifact(self, local_path: Path):
        if self.mlflow_available and local_path.exists():
            self.mlflow.log_artifact(str(local_path))

    def end_run(self):
        if self.mlflow_available:
            self.mlflow.end_run()
        elif self.active_run:
            MLRUNS_DIR.mkdir(exist_ok=True)
            run_file = MLRUNS_DIR / f"{self.active_run['run_name']}.json"
            run_file.write_text(json.dumps(self.active_run, indent=2))
        self.active_run = None
