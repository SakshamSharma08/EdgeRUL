import React from 'react';
import { Plane, Zap, Radio, Award, Download, Cpu } from 'lucide-react';

export default function Navbar({ isWsConnected, onOpenBenchmark, onExportCsv, activeEnginesCount }) {
  return (
    <header className="w-full border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Logo and Hackathon Branding */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/50 shadow-[0_0_16px_rgba(0,240,255,0.3)]">
            <Plane className="w-5 h-5 text-cyan-300 transform -rotate-45" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
                Edge<span className="text-cyan-400">RUL</span>
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider font-bold">
                Edge-AI 2026
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Aircraft Engine Remaining Useful Life Predictor · Tata Technologies InnoVent-27
            </p>
          </div>
        </div>

        {/* Live System Telemetry Status Badges */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono">
            <Radio className={`w-3.5 h-3.5 ${isWsConnected ? 'text-emerald-400 animate-pulse' : 'text-red-400'}`} />
            <span className="text-slate-400">Gateway:</span>
            <span className={`font-bold ${isWsConnected ? 'text-emerald-400' : 'text-red-400'}`}>
              {isWsConnected ? 'LIVE WS' : 'CONNECTING'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Runtime:</span>
            <span className="text-cyan-300 font-bold">ONNX CPU</span>
          </div>

          <button
            onClick={onOpenBenchmark}
            className="btn-avionics text-xs"
            title="Inspect Model Performance & Benchmark Suite"
          >
            <Award className="w-3.5 h-3.5 text-cyan-400" />
            Benchmark Deck
          </button>

          <button
            onClick={onExportCsv}
            className="btn-avionics text-xs text-slate-300"
            title="Export flight cycle prediction log as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export Log
          </button>
        </div>
      </div>
    </header>
  );
}
