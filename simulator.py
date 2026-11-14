"""Independent four-channel CAN-like simulator based on Mark 24 notebook logic."""
import math
import numpy as np
import pandas as pd

CAN_CHANNELS = {
    0x100: {"name": "Electronic_Channel_A", "period": 0.010, "base": 58},
    0x101: {"name": "Electronic_Channel_B", "period": 0.020, "base": 105},
    0x102: {"name": "Electronic_Channel_C", "period": 0.050, "base": 151},
    0x103: {"name": "Electronic_Channel_D", "period": 0.100, "base": 190},
}
WINDOW_SECONDS = 5
SIMULATION_MODES = ("NORMAL", "EARLY_DEGRADATION", "SEVERE_ABNORMALITY")

class CanSimulator:
    def __init__(self, seed=42):
        self.seed = seed
        self.reset()

    def reset(self):
        self.rng = np.random.default_rng(self.seed)
        self.elapsed = 0.0
        self.previous_times = {cid: None for cid in CAN_CHANNELS}
        self.run_baseline_shift = self.rng.normal(0, 3.0, size=4)
        self.affected_channels = set()
        self.history = []
        self.window_number = 0

    def set_mode(self, mode):
        if mode not in SIMULATION_MODES:
            raise ValueError(f"Unsupported mode: {mode}")
        self.mode = mode
        self.reset()
        # In this live demo, fault modes affect a random subset of at least two channels,
        # matching the Mark 24 notebook's affected-channel selection.
        if mode == "NORMAL":
            self.affected_channels = set()
        else:
            count = int(self.rng.integers(2, 5))
            self.affected_channels = set(self.rng.choice(list(CAN_CHANNELS), size=count, replace=False).tolist())

    def generate_window(self):
        if not hasattr(self, "mode"):
            self.set_mode("NORMAL")
        start, end = self.elapsed, self.elapsed + WINDOW_SECONDS
        rows = []
        for channel_index, (can_id, cfg) in enumerate(CAN_CHANNELS.items()):
            period = cfg["period"]
            # Same independent nominal schedule and clock jitter as notebook.
            nominal_times = np.arange(start, end, period)
            jitter = self.rng.normal(0, period * 0.015, size=len(nominal_times))
            timestamps = np.maximum(start, nominal_times + jitter)
            timestamps.sort()
            for t in timestamps:
                affected = can_id in self.affected_channels
                state = self.mode
                if state == "NORMAL" or not affected:
                    drop_probability, timing_sigma = 0.001, 0.015
                elif state == "EARLY_DEGRADATION":
                    drop_probability, timing_sigma = 0.012, 0.07
                else:
                    drop_probability, timing_sigma = 0.045, 0.18
                if self.rng.random() < drop_probability:
                    continue
                observed_t = float(t + self.rng.normal(0, period * timing_sigma))
                observed_t = max(start, observed_t)
                previous = self.previous_times[can_id]
                if previous is not None and observed_t <= previous:
                    observed_t = previous + 1e-6
                self.previous_times[can_id] = observed_t

                base = cfg["base"] + self.run_baseline_shift[channel_index]
                phase = 7.0 * math.sin((observed_t / 4.5) + channel_index)
                values = base + phase + self.rng.normal(0, 2.2, size=8)
                if affected and state == "EARLY_DEGRADATION":
                    # The Mark 24 notebook ramps warning severity from warning_start
                    # toward critical_start. A fixed-mode live window uses the midpoint.
                    progress = 0.5
                    values += 5.0 + 7.0 * progress
                    values += self.rng.normal(0, 3.5, size=8)
                    values[0] += self.rng.normal(0, 5.0)
                elif affected and state == "SEVERE_ABNORMALITY":
                    progress = 0.5
                    values += 18.0 + 24.0 * progress
                    values += self.rng.normal(0, 9.0, size=8)
                    values[[0, 4]] += self.rng.normal(0, 15.0, size=2)
                    if self.rng.random() < 0.025:
                        values[self.rng.integers(0, 8)] = self.rng.choice([0, 255])
                payload = np.clip(np.rint(values), 0, 255).astype(np.uint8)
                rows.append({
                    "run_id": "live_demo", "timestamp": observed_t, "can_id": can_id,
                    "channel": cfg["name"], "payload": payload.tolist(),
                    "scenario": state, "affected_channel": bool(affected),
                })
        self.history.extend(rows)
        self.elapsed = end
        self.window_number += 1
        return pd.DataFrame(rows)

def make_window_features(raw, window_seconds=WINDOW_SECONDS):
    """Exact Mark 24 feature engineering, including per-channel IAT and ordering."""
    data = raw.copy()
    payload_matrix = pd.DataFrame(data["payload"].tolist(), index=data.index)
    payload_matrix.columns = [f"byte_{i}" for i in range(8)]
    data = pd.concat([data.drop(columns=["payload"]), payload_matrix], axis=1)
    data["window_id"] = (data["timestamp"] // window_seconds).astype(int)
    data["window_start"] = data["window_id"] * window_seconds
    data = data.sort_values(["run_id", "can_id", "timestamp"])
    data["iat"] = data.groupby(["run_id", "can_id"])["timestamp"].diff()
    records = []
    byte_cols = [f"byte_{i}" for i in range(8)]
    for (run_id, window_id), win in data.groupby(["run_id", "window_id"]):
        rec = {"run_id": run_id, "window_id": int(window_id),
               "window_start": float(window_id * window_seconds)}
        rec["scenario"] = win["scenario"].mode().iloc[0]
        for can_id, cfg in CAN_CHANNELS.items():
            ch = win[win["can_id"] == can_id]
            prefix = f"{can_id:03X}"
            rec[f"{prefix}_message_count"] = len(ch)
            rec[f"{prefix}_message_rate"] = len(ch) / window_seconds
            if len(ch):
                iat = ch["iat"].dropna()
                payload_values = ch[byte_cols].to_numpy(dtype=float).ravel()
                payload_mean_by_frame = ch[byte_cols].mean(axis=1).to_numpy(dtype=float)
                rec[f"{prefix}_iat_mean"] = iat.mean() if len(iat) else cfg["period"]
                rec[f"{prefix}_iat_std"] = iat.std(ddof=0) if len(iat) else 0.0
                rec[f"{prefix}_iat_max"] = iat.max() if len(iat) else cfg["period"]
                rec[f"{prefix}_payload_mean"] = payload_values.mean()
                rec[f"{prefix}_payload_std"] = payload_values.std()
                rec[f"{prefix}_payload_min"] = payload_values.min()
                rec[f"{prefix}_payload_max"] = payload_values.max()
                rec[f"{prefix}_payload_range"] = payload_values.max() - payload_values.min()
                rec[f"{prefix}_extreme_count"] = np.sum((payload_values == 0) | (payload_values == 255))
                if len(payload_mean_by_frame) >= 2:
                    x = ch["timestamp"].to_numpy(dtype=float)
                    rec[f"{prefix}_payload_trend"] = np.polyfit(x, payload_mean_by_frame, 1)[0]
                else:
                    rec[f"{prefix}_payload_trend"] = 0.0
            else:
                rec[f"{prefix}_iat_mean"] = cfg["period"]
                rec[f"{prefix}_iat_std"] = 0.0
                rec[f"{prefix}_iat_max"] = cfg["period"]
                for suffix in ["payload_mean", "payload_std", "payload_min", "payload_max",
                               "payload_range", "extreme_count", "payload_trend"]:
                    rec[f"{prefix}_{suffix}"] = 0.0
        records.append(rec)
    out = pd.DataFrame(records).sort_values(["run_id", "window_id"]).reset_index(drop=True)
    feature_cols = [c for c in out.columns if c not in ["run_id", "window_id", "window_start", "scenario"]]
    out[feature_cols] = out[feature_cols].replace([np.inf, -np.inf], np.nan).fillna(0)
    return out, feature_cols
