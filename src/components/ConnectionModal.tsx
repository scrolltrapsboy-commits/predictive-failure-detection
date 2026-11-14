import React, { useState } from 'react';
import { RefreshCw, Server, X } from 'lucide-react';
import { ApiCommandLogEntry, ConnectionState } from '../types/telemetry';
import { formatTelemetryTime } from '../utils/telemetryLogic';

interface ConnectionModalProps {
  open: boolean;
  onClose: () => void;
  apiBaseUrl: string;
  onSaveApiBaseUrl: (url: string) => void;
  connectionState: ConnectionState;
  lastApiError: string | null;
  lastSuccessfulSync: string | null;
  previewStreamEnabled: boolean;
  onTogglePreviewStream: (enabled: boolean) => void;
  onRetryConnection: () => Promise<void>;
  commandLogs: ApiCommandLogEntry[];
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  open,
  onClose,
  apiBaseUrl,
  onSaveApiBaseUrl,
  connectionState,
  lastApiError,
  lastSuccessfulSync,
  previewStreamEnabled,
  onTogglePreviewStream,
  onRetryConnection,
  commandLogs,
}) => {
  const [draftUrl, setDraftUrl] = useState(apiBaseUrl);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiBaseUrl(draftUrl);
    await onRetryConnection();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-config-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div className="w-full max-w-2xl rounded-lg bg-[#111824] border border-[#243248] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F2B3E]">
          <div className="flex items-center gap-2.5">
            <Server className="h-4 w-4 text-cyan-400" />
            <h2 id="api-config-title" className="text-base font-semibold text-slate-100">
              FastAPI Backend Configuration
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close backend configuration dialog"
            className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label
              htmlFor="fastapi-base-url"
              className="block text-xs font-medium text-slate-300"
            >
              Backend Base URL (VITE_API_BASE_URL override)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="fastapi-base-url"
                type="url"
                value={draftUrl}
                onChange={(e) => setDraftUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="flex-1 rounded-md bg-[#0A0E17] border border-[#243248] px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                required
              />
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Save & Test Connection
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-md bg-[#0A0E17] border border-[#1F2B3E] p-3">
              <div className="text-slate-400 mb-1">Connection Status</div>
              <div
                className={`font-mono font-semibold ${
                  connectionState === 'connected'
                    ? 'text-emerald-400'
                    : connectionState === 'connecting'
                      ? 'text-cyan-400'
                      : 'text-rose-400'
                }`}
              >
                {connectionState.toUpperCase()}
              </div>
            </div>
            <div className="rounded-md bg-[#0A0E17] border border-[#1F2B3E] p-3">
              <div className="text-slate-400 mb-1">Last Successful Sync</div>
              <div className="font-mono text-slate-200 tabular-nums">
                {lastSuccessfulSync ? formatTelemetryTime(lastSuccessfulSync) : 'Never connected'}
              </div>
            </div>
          </div>

          {lastApiError && (
            <div className="rounded-md bg-rose-950/30 border border-rose-500/30 p-3 text-xs text-rose-200">
              <div className="font-semibold text-rose-300 mb-1">Latest API Error</div>
              <div className="font-mono break-all">{lastApiError}</div>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 rounded-md bg-[#0A0E17] border border-[#1F2B3E] p-3.5">
            <div>
              <div className="text-sm font-medium text-slate-200">
                Offline CAN Frame Preview Stream
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Generates sample CAN frames locally only when the FastAPI backend is offline. Never runs ML inference in JavaScript.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={previewStreamEnabled}
              onClick={() => onTogglePreviewStream(!previewStreamEnabled)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                previewStreamEnabled
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {previewStreamEnabled ? 'Preview Enabled' : 'Preview Disabled'}
            </button>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-300 mb-2">
              Recent REST API Activity
            </div>
            {commandLogs.length === 0 ? (
              <div className="rounded-md bg-[#0A0E17] border border-[#1F2B3E] p-3 text-xs text-slate-500">
                No endpoint requests recorded yet.
              </div>
            ) : (
              <div className="rounded-md bg-[#0A0E17] border border-[#1F2B3E] divide-y divide-[#1F2B3E] max-h-44 overflow-y-auto">
                {commandLogs.map((log) => (
                  <div
                    key={log.id}
                    className="px-3 py-2 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-slate-400 shrink-0">
                        {formatTelemetryTime(log.timestamp).slice(0, 8)}
                      </span>
                      <span className="font-mono text-cyan-300 shrink-0">{log.method}</span>
                      <span className="font-mono text-slate-200 truncate">{log.endpoint}</span>
                    </div>
                    <span
                      className={`font-mono shrink-0 ${
                        log.ok ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {log.ok ? `${log.statusCode ?? 200} OK` : 'FAILED'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
