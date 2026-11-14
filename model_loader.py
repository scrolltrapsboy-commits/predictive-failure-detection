"""Loads the original Mark 24 model packages. No training occurs here."""
import os
from pathlib import Path
import joblib

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = Path(os.getenv("MODEL_DIR", str(BASE_DIR / "models")))
IF_PATH = Path(os.getenv("ISOLATION_FOREST_MODEL", str(MODEL_DIR / "mark24_isolation_forest_package.joblib")))
RF_PATH = Path(os.getenv("RANDOM_FOREST_MODEL", str(MODEL_DIR / "mark24_random_forest_package.joblib")))

def load_models():
    missing = [str(p) for p in (IF_PATH, RF_PATH) if not p.is_file()]
    if missing:
        raise FileNotFoundError("Required Mark 24 model file(s) missing: " + ", ".join(missing))
    # These joblib files must be trusted, as joblib uses Python pickle internally.
    isolation_package = joblib.load(IF_PATH)
    random_forest_package = joblib.load(RF_PATH)
    required_if = {"model", "scaler", "feature_columns", "warning_threshold", "critical_threshold", "labels"}
    required_rf = {"model", "feature_columns", "labels"}
    if not required_if.issubset(isolation_package) or not required_rf.issubset(random_forest_package):
        raise ValueError("Model package structure does not match the Mark 24 notebook.")
    if isolation_package["feature_columns"] != random_forest_package["feature_columns"]:
        raise ValueError("Random Forest and Isolation Forest feature ordering differs.")
    features = isolation_package["feature_columns"]
    if len(features) != 48:
        raise ValueError(f"Expected the Mark 24 48-feature schema, found {len(features)}.")
    if isolation_package["model"].n_features_in_ != len(features) or random_forest_package["model"].n_features_in_ != len(features):
        raise ValueError("Loaded model feature count does not match package feature schema.")
    return isolation_package, random_forest_package
