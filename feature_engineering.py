"""Mark 24 feature schema and exact feature-order enforcement."""
from simulator import make_window_features

def build_model_matrix(raw_history, feature_columns):
    features, _ = make_window_features(raw_history)
    if features.empty:
        raise ValueError("No feature windows are available yet.")
    # The package's ordered list is authoritative. Do not infer/reorder it.
    missing = [name for name in feature_columns if name not in features.columns]
    if missing:
        raise ValueError("Feature engineering omitted required Mark 24 columns: " + ", ".join(missing))
    matrix = features.loc[:, feature_columns].copy()
    return features, matrix
