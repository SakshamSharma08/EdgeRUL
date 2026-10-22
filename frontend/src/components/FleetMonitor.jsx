import React from 'react';
import { Plane, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

export default function FleetMonitor({ engines = [], selectedEngineId, onSelectEngine }) {
  // Ensure default demo engines if backend hasn't populated yet
  const defaultFleet = [1, 2, 3, 4].map(id => {
    const existing = engines.find(e => String(e.id) === String(id));
    return existing || {
      id: String(id),
      cycleCount: 1,
      lastRul: 125,
      healthIndex: 100,
      status: 'HEALTHY'
    };
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CRITICAL':
        return 'badge-critical';
      case 'WARNING':
        return 'badge-warning';
      case 'CAUTION':
        return 'badge-caution';
      default:
        return 'badge-healthy';
    }
  };

  return (
    <div className="hud-panel p-4 hud-brackets">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-display font-bold text-sm text-slate-100 flex items-center gap-2">
          <Plane className="w-4 h-4 text-cyan-400" />
          Active Fleet Telemetry Stream
        </h4>
        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
          CMAPSS Fleet
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {defaultFleet.map((engine) => {
          const isSelected = String(engine.id) === String(selectedEngineId);
          const badgeClass = getStatusBadge(engine.status);

          return (
            <button
              key={engine.id}
              onClick={() => onSelectEngine(engine.id)}
              className={`text-left p-3 rounded-xl transition-all relative overflow-hidden border ${
                isSelected
                  ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_16px_rgba(0,240,255,0.25)]'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-display font-bold text-slate-200 text-sm">
                  Engine #{String(engine.id).padStart(3, '0')}
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold uppercase ${badgeClass}`}>
                  {engine.status}
                </span>
              </div>

              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[11px] font-mono text-slate-400">RUL:</span>
                <span className="font-display font-bold text-slate-100 text-base">
                  {Number(engine.lastRul).toFixed(1)} <span className="text-[10px] font-normal text-slate-400">CYC</span>
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className={`h-full transition-all duration-300 ${
                    engine.status === 'CRITICAL'
                      ? 'bg-red-500'
                      : engine.status === 'WARNING'
                      ? 'bg-amber-400'
                      : 'bg-cyan-400'
                  }`}
                  style={{ width: `${Math.max(5, engine.healthIndex)}%` }}
                />
              </div>

              <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-slate-500">
                <span>Cycle #{engine.cycleCount}</span>
                <span>{engine.healthIndex}% Health</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
