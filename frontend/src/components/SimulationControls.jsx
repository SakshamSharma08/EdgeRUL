import React, { useState } from 'react';
import { Play, Pause, RotateCcw, FastForward, Flame, Zap, Sliders } from 'lucide-react';

export default function SimulationControls({
  isRunning,
  playbackSpeed = 450,
  selectedEngineId,
  onTogglePlay,
  onSpeedChange,
  onReset,
  onInjectAnomaly,
  onSelectEngine
}) {
  const [anomalyLoading, setAnomalyLoading] = useState(false);

  const handleInject = async () => {
    setAnomalyLoading(true);
    try {
      await onInjectAnomaly();
    } finally {
      setAnomalyLoading(false);
    }
  };

  return (
    <div className="hud-panel p-4 hud-brackets">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className={isRunning ? 'btn-avionics text-amber-400 border-amber-500/40' : 'btn-avionics-solid'}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                Pause Stream
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Stream Live Telemetry
              </>
            )}
          </button>

          <button
            onClick={onReset}
            className="btn-avionics text-slate-300 hover:text-white"
            title="Reset flight cycles"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-1">
            <FastForward className="w-3.5 h-3.5 text-cyan-400" />
            Rate:
          </span>
          <div className="flex items-center bg-slate-900/80 rounded-lg p-1 border border-slate-800">
            {[
              { label: '1x (1s)', val: 1000 },
              { label: '2x (450ms)', val: 450 },
              { label: '5x (150ms)', val: 150 }
            ].map(rate => (
              <button
                key={rate.val}
                onClick={() => onSpeedChange(rate.val)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  playbackSpeed === rate.val
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {rate.label}
              </button>
            ))}
          </div>
        </div>

        {/* Engine Dropdown & Anomaly Injector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedEngineId}
            onChange={(e) => onSelectEngine(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400"
          >
            {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
              <option key={num} value={num}>
                Engine #{String(num).padStart(3, '0')} (Test FD001)
              </option>
            ))}
          </select>

          <button
            onClick={handleInject}
            disabled={anomalyLoading}
            className="btn-hazard text-xs"
            title="Inject simulated thermal wear into High Pressure Compressor"
          >
            <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            {anomalyLoading ? 'Injecting...' : 'Inject HPC Anomaly'}
          </button>
        </div>
      </div>
    </div>
  );
}
