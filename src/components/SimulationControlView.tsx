import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  XOctagon,
} from 'lucide-react';
import {
  ApiCommandLogEntry,
  ConnectionState,
  SimulationMode,
  SystemStatusResponse,
} from '../types/telemetry';
import { formatDurationSeconds, formatTelemetryTime } from '../utils/telemetryLogic';

interface SimulationControlViewProps {
  connectionState: ConnectionState;
  apiBaseUrl: string;
  status: SystemStatusResponse | null;
  simulationSpeed: number;
  onChangeSpeed: (speed: number) => void;
  pendingCommand: string | null;
  commandFeedback: { ok: boolean; message: string; timestamp: string } | null;
  commandLogs: ApiCommandLogEntry[];
  onStart: () => Promise<void>;
  onPause: () => Promise<void>;
  onReset: () => Promise<void>;
  onSelectMode: (mode: SimulationMode) => Promise<void>;
}

const SPEED_OPTIONS = [0.5, 1, 2, 5];

export const SimulationControlView: React.FC<SimulationControlViewProps> = ({
  connectionState,
  apiBaseUrl,
  status,
  simulationSpeed,
  onChangeSpeed,
  pendingCommand,
  commandFeedback,
  commandLogs,
  onStart,
  onPause,
  onReset,
  onSelectMode,
}) => {
  const activeMode = status?.simulationMode ?? 'NORMAL';
  const simState = status?.simulationState ?? 'IDLE';
  const durationSec = status?.simulationDurationSec ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
            Simulation Control Console
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dispatch live scenario commands directly to the Python FastAPI CAN bus simulator at{' '}
            <code className="text-cyan-300">{apiBaseUrl}</code>.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="rounded-md bg-[#111824] border border-[#1F2B3E] px-3.5 py-2 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-slate-400">Duration:</span>
            <span className="font-mono font-semibold text-slate-100 tabular-nums">
              {formatDurationSeconds(durationSec)}
            </span>
          </div>
          <div className="rounded-md bg-[#111824] border border-[#1F2B3E] px-3.5 py-2 flex items-center gap-2">
            <span className="text-slate-400">State:</span>
            <span className="font-mono font-semibold text-cyan-300">{simState}</span>
          </div>
        </div>
      </div>

      {/* Command Feedback Banner */}
      {commandFeedback && (
        <div
          role="status"
          className={`rounded-lg border px-4 py-3 text-xs flex items-center justify-between gap-3 ${
            commandFeedback.ok
              ? 'bg-emerald-950/30 border-emerald-500/35 text-emerald-200'
              : 'bg-rose-950/30 border-rose-500/35 text-rose-200'
          }`}
        >
          <div className="font-mono break-all">
            {commandFeedback.ok ? '✓ ' : '✖ '}
            {commandFeedback.message}
          </div>
          <span className="font-mono text-slate-400 shrink-0 tabular-nums">
            {formatTelemetryTime(commandFeedback.timestamp).slice(0, 8)}
          </span>
        </div>
      )}

      {connectionState !== 'connected' && !commandFeedback && (
        <div className="rounded-lg bg-[#111824] border border-amber-500/30 px-4 py-3 text-xs text-amber-200">
          Backend is currently disconnected. Pressing any simulation button sends a real HTTP POST request to <code className="text-cyan-300">{apiBaseUrl}</code> and reports the connection response transparently without faking local model state.
        </div>
      )}

      {/* Three Large Interactive Expo Scenario Buttons */}
      <section aria-label="Simulation operating modes" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => void onSelectMode('NORMAL')}
          disabled={pendingCommand !== null}
          className={`text-left rounded-lg border p-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            activeMode === 'NORMAL' && connectionState === 'connected'
              ? 'bg-emerald-500/10 border-emerald-500/50'
              : 'bg-[#111824] border-[#1F2B3E] hover:border-emerald-500/40 hover:bg-[#151E2E]'
          }`}
        >
          <div className="flex items-center justify-between">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            <span className="font-mono text-xs text-emerald-400">POST /api/simulation/mode</span>
          </div>
          <h2 className="text-lg font-display font-bold text-slate-100 mt-4">
            NORMAL OPERATION
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed mt-2">
            Simulates healthy vehicle electronics with stable sensor baselines and nominal CAN inter-frame timing.
          </p>
          <div className="mt-4 pt-3 border-t border-[#1F2B3E] text-xs font-mono text-emerald-400">
            Expected dashboard state: NORMAL
          </div>
        </button>

        <button
          type="button"
          onClick={() => void onSelectMode('EARLY_DEGRADATION')}
          disabled={pendingCommand !== null}
          className={`text-left rounded-lg border p-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
            activeMode === 'EARLY_DEGRADATION' && connectionState === 'connected'
              ? 'bg-amber-500/10 border-amber-500/50'
              : 'bg-[#111824] border-[#1F2B3E] hover:border-amber-500/40 hover:bg-[#151E2E]'
          }`}
        >
          <div className="flex items-center justify-between">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
            <span className="font-mono text-xs text-amber-400">POST /api/simulation/mode</span>
          </div>
          <h2 className="text-lg font-display font-bold text-slate-100 mt-4">
            EARLY DEGRADATION
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed mt-2">
            Introduces gradual sensor drift, signal variations, and communication timing irregularities across active channels.
          </p>
          <div className="mt-4 pt-3 border-t border-[#1F2B3E] text-xs font-mono text-amber-400">
            Expected dashboard state: WARNING
          </div>
        </button>

        <button
          type="button"
          onClick={() => void onSelectMode('SEVERE_ABNORMALITY')}
          disabled={pendingCommand !== null}
          className={`text-left rounded-lg border p-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
            activeMode === 'SEVERE_ABNORMALITY' && connectionState === 'connected'
              ? 'bg-rose-500/10 border-rose-500/50'
              : 'bg-[#111824] border-[#1F2B3E] hover:border-rose-500/40 hover:bg-[#151E2E]'
          }`}
        >
          <div className="flex items-center justify-between">
            <XOctagon className="h-6 w-6 text-rose-400" />
            <span className="font-mono text-xs text-rose-400">POST /api/simulation/mode</span>
          </div>
          <h2 className="text-lg font-display font-bold text-slate-100 mt-4">
            SEVERE ABNORMALITY
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed mt-2">
            Introduces extreme sensor values and critical communication abnormalities triggering Mark 24 fault detection.
          </p>
          <div className="mt-4 pt-3 border-t border-[#1F2B3E] text-xs font-mono text-rose-400">
            Expected dashboard state: CRITICAL
          </div>
        </button>
      </section>

      {/* Transport & Speed Controls */}
      <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void onStart()}
            disabled={pendingCommand !== null}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors whitespace-nowrap"
          >
            <Play className="h-4 w-4" />
            Start Simulation
          </button>

          <button
            type="button"
            onClick={() => void onPause()}
            disabled={pendingCommand !== null}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#151E2E] border border-[#243248] hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-50 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap"
          >
            <Pause className="h-4 w-4" />
            Pause Simulation
          </button>

          <button
            type="button"
            onClick={() => void onReset()}
            disabled={pendingCommand !== null}
            className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-[#151E2E] border border-[#243248] hover:border-rose-500/40 hover:text-rose-300 disabled:opacity-50 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Simulation
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap">
            <Gauge className="h-4 w-4 text-cyan-400" />
            <span>Simulation Speed:</span>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-md bg-[#0A0E17] border border-[#1F2B3E]">
            {SPEED_OPTIONS.map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => onChangeSpeed(spd)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors whitespace-nowrap ${
                  simulationSpeed === spd
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Command Dispatch Log */}
      <div className="rounded-lg bg-[#111824] border border-[#1F2B3E] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">
            Backend Command Dispatch Log
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {pendingCommand ? `Sending: ${pendingCommand}...` : 'Ready'}
          </span>
        </div>

        {commandLogs.length === 0 ? (
          <div className="rounded-md bg-[#0A0E17] border border-[#1F2B3E] p-4 text-xs text-slate-400">
            No simulation commands dispatched yet. Select an operating mode or click Start Simulation above.
          </div>
        ) : (
          <div className="rounded-md bg-[#0A0E17] border border-[#1F2B3E] divide-y divide-[#1F2B3E] max-h-56 overflow-y-auto">
            {commandLogs.map((entry) => (
              <div
                key={entry.id}
                className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-slate-500 tabular-nums shrink-0">
                    {formatTelemetryTime(entry.timestamp).slice(0, 8)}
                  </span>
                  <span className="font-mono text-cyan-300 shrink-0">{entry.method}</span>
                  <span className="font-mono text-slate-200 shrink-0">{entry.endpoint}</span>
                  <span className="text-slate-400 truncate">{entry.summary}</span>
                </div>
                <span
                  className={`font-mono font-semibold shrink-0 ${
                    entry.ok ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {entry.ok ? `HTTP ${entry.statusCode ?? 200}` : 'ERROR'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
