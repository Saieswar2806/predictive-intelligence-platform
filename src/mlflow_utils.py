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

    def start_run(self, run_name: str):
        if self.mlflow_available:
            self.active_run = self.mlflow.start_run(run_name=run_name)
        else:
            self.active_run = {"run_name": run_name, "params": {}, "metrics": {}}
        return self

    def log_params(self, params: Dict[str, Any]):
        if self.mlflow_available:
            self.mlflow.log_params(params)
        elif self.active_run:
            self.active_run["params"].update(params)

    def log_metrics(self, metrics: Dict[str, float], step: Optional[int] = None):
        if self.mlflow_available:
            self.mlflow.log_metrics(metrics, step=step)
        elif self.active_run:
            self.active_run["metrics"].update(metrics)

    def log_artifact(self, local_path: Path):
        if self.mlflow_available and local_path.exists():
            self.mlflow.log_artifact(str(local_path))

    def end_run(self):
        if self.mlflow_available:
            self.mlflow.end_run()
        elif self.active_run:
            # Save local run record
            run_file = MLRUNS_DIR / f"{self.active_run['run_name']}.json"
            MLRUNS_DIR.mkdir(exist_ok=True)
            run_file.write_text(json.dumps(self.active_run, indent=2))
        self.active_run = None
