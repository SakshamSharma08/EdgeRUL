import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Clock, Zap } from 'lucide-react';

export default function RadialRULGauge({ rul = 125, status = 'HEALTHY', latencyMs = 0.5, cycle = 1 }) {
  // RUL range: 0 to 125 cycles
  const clampedRul = Math.max(0, Math.min(125, rul));
  const healthPercent = Math.round((clampedRul / 125) * 100);
  const flightHours = Math.round(clampedRul * 1.8); // standard flight cycle conversion factor

  // Gauge angles: 220 degree arc from -110deg to +110deg
  const startAngle = -110;
  const totalAngle = 220;
  const needleAngle = startAngle + (clampedRul / 125) * totalAngle;

  // Determine color scheme based on status
  const getColor = () => {
    if (status === 'CRITICAL') return { stroke: '#ef4444', text: 'text-red-400', glow: 'shadow-red-500/50', badge: 'badge-critical' };
    if (status === 'WARNING') return { stroke: '#f59e0b', text: 'text-amber-400', glow: 'shadow-amber-500/50', badge: 'badge-warning' };
    if (status === 'CAUTION') return { stroke: '#06b6d4', text: 'text-cyan-400', glow: 'shadow-cyan-500/50', badge: 'badge-caution' };
    return { stroke: '#10b981', text: 'text-emerald-400', glow: 'shadow-emerald-500/50', badge: 'badge-healthy' };
  };

  const scheme = getColor();

  // SVG arc calculation helpers
  const cx = 150;
  const cy = 150;
  const r = 110;
  
  // Circumference for stroke-dasharray (total circle 2 * PI * r = ~691.15)
  // 220 degrees = (220 / 360) * 691.15 = 422.37
  const arcLength = (220 / 360) * (2 * Math.PI * r);
  const currentArcLength = (clampedRul / 125) * arcLength;

  return (
    <div className="hud-panel p-5 hud-brackets flex flex-col items-center justify-between relative">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          Edge-AI Inference
        </span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${scheme.badge}`}>
          {status}
        </span>
      </div>

      {/* Radial Gauge SVG */}
      <div className="relative w-64 h-64 flex items-center justify-center my-2">
        <svg viewBox="0 0 300 300" className="w-full h-full transform rotate-160">
          <defs>
            <linearGradient id="rulGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="70%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <filter id="gaugeGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Track Arc */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="14"
            strokeDasharray={`${arcLength} 999`}
            strokeLinecap="round"
          />

          {/* Value Progress Arc */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="url(#rulGradient)"
            strokeWidth="14"
            strokeDasharray={`${currentArcLength} 999`}
            strokeLinecap="round"
            filter="url(#gaugeGlow)"
            className="transition-all duration-300"
          />

          {/* Threshold Tick Marks */}
          {[0, 30, 65, 95, 125].map((tick, i) => {
            const angle = -110 + (tick / 125) * 220;
            const rad = (angle - 90) * (Math.PI / 180);
            const x1 = cx + (r - 18) * Math.cos(rad);
            const y1 = cy + (r - 18) * Math.sin(rad);
            const x2 = cx + (r - 6) * Math.cos(rad);
            const y2 = cy + (r - 6) * Math.sin(rad);
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
            );
          })}
        </svg>

        {/* Center Digital Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-4">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
            Estimated RUL
          </span>
          <div className="flex items-baseline gap-1 my-0.5">
            <span className={`text-5xl font-black font-display tracking-tight ${scheme.text} ${status === 'CRITICAL' ? 'glow-crit' : 'glow-cyan'}`}>
              {clampedRul.toFixed(1)}
            </span>
            <span className="text-xs font-mono font-semibold text-slate-400">CYCLES</span>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700/60 text-slate-300">
              Health: <strong className={scheme.text}>{healthPercent}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Avionics KPI Readouts */}
      <div className="w-full grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center font-mono">
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-500 block">Flight Hours</span>
          <span className="text-sm font-bold text-slate-200">~{flightHours}h</span>
        </div>
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-500 block">Current Cycle</span>
          <span className="text-sm font-bold text-cyan-400">#{cycle}</span>
        </div>
        <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
          <span className="text-[10px] text-slate-500 block">Inference</span>
          <span className="text-sm font-bold text-emerald-400">{latencyMs}ms</span>
        </div>
      </div>
    </div>
  );
}
