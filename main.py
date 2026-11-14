from contextlib import asynccontextmanager
from datetime import datetime, timezone
import os
import threading
from typing import Literal

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from model_loader import load_models
from simulator import CanSimulator, CAN_CHANNELS, SIMULATION_MODES
from feature_engineering import build_model_matrix

class ModeRequest(BaseModel):
    mode: Literal["NORMAL", "EARLY_DEGRADATION", "SEVERE_ABNORMALITY"]

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        app.state.if_package, app.state.rf_package = load_models()
        app.state.simulator = CanSimulator()
        app.state.simulator.set_mode("NORMAL")
        app.state.running = False
        app.state.latest = None
        app.state.history_rows = []
        app.state.windows_processed = 0
        app.state.lock = threading.RLock()
        app.state.started_at = datetime.now(timezone.utc)
        app.state.error = None
    except Exception as exc:
        # Keep the app process alive so /health reports a useful model-loading error.
        app.state.error = str(exc)
        app.state.if_package = app.state.rf_package = None
        app.state.simulator = None
        app.state.running = False
        app.state.latest = None
        app.state.history_rows = []
        app.state.windows_processed = 0
        app.state.lock = threading.RLock()
    yield

app = FastAPI(
    title="Project 18 — Mark 24 Vehicle Electronics API",
    description="Simulated four-channel CAN telemetry scored by the original Mark 24 Random Forest and Isolation Forest packages.",
    version="1.0.0",
    lifespan=lifespan,
)
origins = [x.strip() for x in os.getenv(
    "CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://localhost:19006"
).split(",") if x.strip()]
app.add_middleware(
    CORSMiddleware, allow_origins=origins, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

def require_models():
    if app.state.error or app.state.if_package is None or app.state.rf_package is None:
        raise HTTPException(status_code=503, detail=f"Mark 24 models unavailable: {app.state.error or 'not loaded'}")

def _iso_now():
    return datetime.now(timezone.utc).isoformat()

def _process_next_window():
    require_models()
    sim = app.state.simulator
    new_frames = sim.generate_window()
    if new_frames.empty:
        raise HTTPException(status_code=500, detail="Simulator produced an empty CAN window.")
    app.state.history_rows.extend(new_frames.to_dict(orient="records"))
    raw = pd.DataFrame(app.state.history_rows)
    if_package, rf_package = app.state.if_package, app.state.rf_package
    features, X = build_model_matrix(raw, rf_package["feature_columns"])
    # Only score the newest five-second window, while retaining full history so
    # the notebook's per-channel inter-arrival calculations remain continuous.
    newest = features.iloc[[-1]]
    X_latest = X.iloc[[-1]]
    rf_model = rf_package["model"]
    rf_prediction = str(rf_model.predict(X_latest)[0])
    raw_probabilities = rf_model.predict_proba(X_latest)[0]
    probabilities = {str(label): float(prob) for label, prob in zip(rf_model.classes_, raw_probabilities)}

    scaled = if_package["scaler"].transform(X_latest)
    anomaly_score = float(-if_package["model"].decision_function(scaled)[0])
    warning_t = float(if_package["warning_threshold"])
    critical_t = float(if_package["critical_threshold"])
    if_alert = ("SEVERE_ABNORMALITY" if anomaly_score >= critical_t else
                "EARLY_DEGRADATION" if anomaly_score >= warning_t else "NORMAL")

    latest_start = float(newest["window_start"].iloc[0])
    current_frames = new_frames
    telemetry = {}
    for cid, cfg in CAN_CHANNELS.items():
        ch = current_frames[current_frames["can_id"] == cid]
        if len(ch):
            payload = np.asarray(ch["payload"].tolist(), dtype=float)
            telemetry[f"0x{cid:03X}"] = {
                "channel": cfg["name"], "message_count": int(len(ch)),
                "message_rate_hz": float(len(ch) / 5.0),
                "payload_mean": float(payload.mean()), "payload_std": float(payload.std()),
                "payload_min": float(payload.min()), "payload_max": float(payload.max()),
                "last_payload": [int(v) for v in ch.iloc[-1]["payload"]],
                "affected_by_simulation": bool(ch["affected_channel"].any()),
            }
        else:
            telemetry[f"0x{cid:03X}"] = {
                "channel": cfg["name"], "message_count": 0, "message_rate_hz": 0.0,
                "payload_mean": 0.0, "payload_std": 0.0, "payload_min": 0.0,
                "payload_max": 0.0, "last_payload": [], 
                "affected_by_simulation": cid in sim.affected_channels,
            }
    affected = [f"0x{x:03X}" for x in sorted(sim.affected_channels)]
    result = {
        "timestamp": _iso_now(),
        "window": {"number": sim.window_number, "start_seconds": latest_start,
                   "duration_seconds": 5},
        "simulation_mode": sim.mode,
        "predicted_condition": rf_prediction,
        "random_forest_probabilities": probabilities,
        "isolation_forest": {
            "anomaly_score": anomaly_score,
            "warning_threshold": warning_t,
            "critical_threshold": critical_t,
            "predicted_condition": if_alert,
            "alert_level": {"NORMAL": "NORMAL", "EARLY_DEGRADATION": "WARNING",
                            "SEVERE_ABNORMALITY": "CRITICAL"}[if_alert],
        },
        "affected_can_channels": affected,
        "telemetry": telemetry,
        "feature_count": int(X_latest.shape[1]),
        "model_source": "Mark 24 trained joblib packages",
    }
    app.state.latest = result
    app.state.windows_processed += 1
    return result

@app.get("/")
def root():
    frontend_index = os.path.join(os.path.dirname(__file__), "dist", "index.html")
    if os.path.isfile(frontend_index):
        return FileResponse(frontend_index)
    return {"service": "Project 18 Mark 24 API", "docs": "/docs", "health": "/health",
            "message": "Frontend build not found. Build the Docker image to serve the dashboard."}

@app.get("/health")
def health():
    ok = app.state.error is None and app.state.if_package is not None
    return {"status": "ok" if ok else "degraded", "models_loaded": ok,
            "model_error": app.state.error}

@app.get("/api/status")
def status():
    require_models()
    return {
        "running": app.state.running,
        "simulation_mode": app.state.simulator.mode,
        "available_modes": list(SIMULATION_MODES),
        "can_channels": [{"can_id": f"0x{x:03X}", **cfg} for x, cfg in CAN_CHANNELS.items()],
        "windows_processed": app.state.windows_processed,
        "model_files_loaded": ["mark24_isolation_forest_package.joblib",
                               "mark24_random_forest_package.joblib"],
        "feature_count": len(app.state.rf_package["feature_columns"]),
        "latest_timestamp": app.state.latest["timestamp"] if app.state.latest else None,
    }

@app.get("/api/telemetry")
def telemetry():
    require_models()
    with app.state.lock:
        if app.state.running or app.state.latest is None:
            result = _process_next_window()
        else:
            result = app.state.latest
        return {"timestamp": result["timestamp"], "window": result["window"],
                "simulation_mode": result["simulation_mode"],
                "can_channels": result["telemetry"],
                "affected_can_channels": result["affected_can_channels"]}

@app.get("/api/prediction")
def prediction():
    require_models()
    with app.state.lock:
        if app.state.latest is None:
            _process_next_window()
        return app.state.latest

@app.get("/api/metrics")
def metrics():
    require_models()
    latest = app.state.latest
    return {
        "windows_processed": app.state.windows_processed,
        "simulation_running": app.state.running,
        "simulation_mode": app.state.simulator.mode,
        "random_forest": {"model": "trained RandomForestClassifier",
                          "classes": [str(x) for x in app.state.rf_package["model"].classes_],
                          "latest_probabilities": latest["random_forest_probabilities"] if latest else None},
        "isolation_forest": {"model": "trained IsolationForest",
                             "latest_anomaly_score": latest["isolation_forest"]["anomaly_score"] if latest else None,
                             "warning_threshold": float(app.state.if_package["warning_threshold"]),
                             "critical_threshold": float(app.state.if_package["critical_threshold"])},
    }

@app.post("/api/simulation/start")
def start_simulation():
    require_models()
    with app.state.lock:
        app.state.running = True
        result = app.state.latest if app.state.latest is not None else _process_next_window()
        return {"message": "Simulation started.", "running": True, "latest_prediction": result}

@app.post("/api/simulation/mode")
def change_mode(request: ModeRequest):
    require_models()
    with app.state.lock:
        app.state.simulator.set_mode(request.mode)
        app.state.history_rows = []
        app.state.latest = None
        app.state.windows_processed = 0
        result = _process_next_window()
        return {"message": "Simulation mode changed; a fresh five-second stream was generated.",
                "running": app.state.running, "simulation_mode": request.mode,
                "latest_prediction": result}

@app.post("/api/simulation/pause")
def pause_simulation():
    require_models()
    with app.state.lock:
        app.state.running = False
        return {"message": "Simulation paused.", "running": False,
                "latest_timestamp": app.state.latest["timestamp"] if app.state.latest else None}

@app.post("/api/simulation/reset")
def reset_simulation():
    require_models()
    with app.state.lock:
        mode = app.state.simulator.mode
        app.state.simulator.set_mode(mode)
        app.state.running = False
        app.state.history_rows = []
        app.state.latest = None
        app.state.windows_processed = 0
        return {"message": "Simulation state reset. Models remain loaded.",
                "running": False, "simulation_mode": mode, "windows_processed": 0}


# Serve the built React dashboard from the same Render service as the API.
# API routes above remain available; this fallback supports client-side navigation.
_DIST_DIR = os.path.join(os.path.dirname(__file__), "dist")
_ASSETS_DIR = os.path.join(_DIST_DIR, "assets")
if os.path.isdir(_ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=_ASSETS_DIR), name="assets")

@app.get("/{full_path:path}", include_in_schema=False)
def frontend_fallback(full_path: str):
    if full_path.startswith(("api/", "docs", "openapi.json", "health")):
        raise HTTPException(status_code=404, detail="Not found")
    index_file = os.path.join(_DIST_DIR, "index.html")
    if os.path.isfile(index_file):
        return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="Frontend build not found")
