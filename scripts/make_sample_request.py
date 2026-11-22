"""Print a sample API request body after training, with zero-valued engineered features."""
import json
from pathlib import Path
cols = json.loads((Path(__file__).resolve().parents[1] / "artifacts" / "feature_columns.json").read_text())
print(json.dumps({"features": {c: 0.0 for c in cols}}, indent=2))
