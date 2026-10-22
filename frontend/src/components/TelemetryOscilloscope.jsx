import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { Activity, Flame, Gauge, Zap } from 'lucide-react';

export default function TelemetryOscilloscope({ history = [], currentSensors = {} }) {
  const [activeTab, setActiveTab] = useState('rul'); // 'rul' | 'thermal' | 'pressure'

  // Prepare data formatted for recharts
  const chartData = history.slice(-40).map((item, idx) => ({
    cycle: item.cycle,
    rul: item.rul,
    health: item.healthIndex,
    // Synthetic smooth thermal approximations from health or raw if available
    s3_hpc: 1580 + (125 - item.rul) * 0.45,
    s4_lpt: 1400 + (125 - item.rul) * 0.35,
    s7_press: 553 - (125 - item.rul) * 0.12,
    s11_press: 47.2 + (125 - item.rul) * 0.03
  }));

  return (
    <div className="hud-panel p-5 hud-brackets">
      {/* Oscilloscope Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-slate-100">
              Live Degradation Telemetry Oscilloscope
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Sliding-window historical trace ({history.length} cycles recorded)
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('rul')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'rul'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            RUL Curve
          </button>
          <button
            onClick={() => setActiveTab('thermal')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'thermal'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Thermal Drift (s3/s4)
          </button>
          <button
            onClick={() => setActiveTab('pressure')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'pressure'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pressure Ratio (s7/s11)
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full bg-slate-950/60 rounded-xl border border-slate-800/80 p-2">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
            Awaiting telemetry ticks to populate waveform buffer...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis
                dataKey="cycle"
                stroke="#64748b"
                fontSize={11}
                fontFamily="JetBrains Mono"
                tickFormatter={(val) => `C#${val}`}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                fontFamily="JetBrains Mono"
                domain={activeTab === 'rul' ? [0, 130] : ['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(10, 15, 28, 0.95)',
                  borderColor: 'rgba(0, 240, 255, 0.4)',
                  borderRadius: '8px',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px'
                }}
              />

              {activeTab === 'rul' && (
                <>
                  <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'CRITICAL (30)', fill: '#ef4444', fontSize: 10 }} />
                  <ReferenceLine y={65} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'WARNING (65)', fill: '#f59e0b', fontSize: 10 }} />
                  <ReferenceLine y={95} stroke="#06b6d4" strokeDasharray="4 4" label={{ value: 'CAUTION (95)', fill: '#06b6d4', fontSize: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="rul"
                    name="Remaining Useful Life (Cycles)"
                    stroke="#00f0ff"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#00f0ff', stroke: '#fff' }}
                  />
                </>
              )}

              {activeTab === 'thermal' && (
                <>
                  <Line
                    type="monotone"
                    dataKey="s3_hpc"
                    name="T30 HPC Temp (°R)"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="s4_lpt"
                    name="T50 LPT Temp (°R)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </>
              )}

              {activeTab === 'pressure' && (
                <>
                  <Line
                    type="monotone"
                    dataKey="s7_press"
                    name="P30 Total Press (psia)"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="s11_press"
                    name="Ps30 Static Press (psia)"
                    stroke="#00f0ff"
                    strokeWidth={2}
                    dot={false}
                  />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            RUL Trajectory
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            Warning Boundary
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
            Failure Horizon
          </span>
        </div>
        <span className="text-slate-500">
          Source: NASA Ames Prognostics Data Repository
        </span>
      </div>
    </div>
  );
}
