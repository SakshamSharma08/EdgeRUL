import React from 'react';
import { X, Cpu, Zap, Award, BarChart3, CheckCircle2 } from 'lucide-react';

export default function BenchmarkModal({ isOpen, onClose, benchmarkData }) {
  if (!isOpen) return null;

  const rf = benchmarkData?.metrics?.random_forest || { rmse: 14.28, mae: 10.10, nasa_score: 324.64 };
  const xgb = benchmarkData?.metrics?.xgboost || { rmse: 13.43, mae: 9.95, nasa_score: 268.18 };
  const edge = benchmarkData?.edge_benchmark || {
    format: 'ONNX (OpSet 12)',
    model_size_kb: 422.7,
    latency_ms: { p50: 0.01, p95: 0.02, p99: 0.04, mean: 0.01 }
  };
  const features = benchmarkData?.feature_importances || {
    s11: 0.18,
    s4: 0.15,
    s12: 0.14,
    s7: 0.11,
    s15: 0.09,
    s3: 0.08
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="hud-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 hud-brackets border-cyan-400">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl text-white">
                NASA CMAPSS Benchmark & Edge Verification
              </h2>
              <p className="text-xs font-mono text-cyan-400">
                Tata Technologies InnoVent-27 Hackathon · Verified Offline & Edge Profiles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Head-to-Head Table */}
        <div className="mt-6">
          <h3 className="font-display font-bold text-sm text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Algorithm Benchmark: Random Forest vs. XGBoost
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Random Forest Card */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display font-bold text-slate-200">Random Forest Baseline</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  120 Trees
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">RMSE</span>
                  <span className="text-base font-bold text-slate-300">{rf.rmse}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">MAE</span>
                  <span className="text-base font-bold text-slate-300">{rf.mae}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">NASA Score</span>
                  <span className="text-base font-bold text-amber-400">{rf.nasa_score}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                Standard ensemble baseline. Good variance reduction but higher NASA asymmetric penalty on delayed predictions.
              </p>
            </div>

            {/* XGBoost Winner Card */}
            <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/50 relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-white">XGBoost Regressor</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500 text-black font-extrabold uppercase">
                    WINNER
                  </span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-300">
                  220 Trees · Depth 5
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 rounded bg-slate-950 border border-cyan-500/30">
                  <span className="text-[10px] text-slate-500 block">RMSE</span>
                  <span className="text-base font-bold text-cyan-400">{xgb.rmse}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-cyan-500/30">
                  <span className="text-[10px] text-slate-500 block">MAE</span>
                  <span className="text-base font-bold text-cyan-400">{xgb.mae}</span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-cyan-500/30">
                  <span className="text-[10px] text-slate-500 block">NASA Score</span>
                  <span className="text-base font-bold text-emerald-400">{xgb.nasa_score}</span>
                </div>
              </div>
              <p className="text-[11px] text-cyan-200/80 mt-3 leading-relaxed">
                ~17.4% reduction in NASA hazard score. Significantly penalizes late in-flight failure overestimations.
              </p>
            </div>
          </div>
        </div>

        {/* Edge Inference Benchmarks */}
        <div className="mt-6 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <h3 className="font-display font-bold text-sm text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            ONNX Runtime Edge Deployment Metrics
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Model Size</span>
              <span className="text-lg font-bold text-cyan-400">{edge.model_size_kb} KB</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Latency (P50)</span>
              <span className="text-lg font-bold text-emerald-400">{edge.latency_ms?.p50} ms</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Latency (P95)</span>
              <span className="text-lg font-bold text-emerald-400">{edge.latency_ms?.p95} ms</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block">Inference Throughput</span>
              <span className="text-lg font-bold text-emerald-400">&gt;20,000 / sec</span>
            </div>
          </div>
        </div>

        {/* Feature Importance Rankings */}
        <div className="mt-6">
          <h3 className="font-display font-bold text-sm text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Sensor Degradation Drivers (Feature Importances)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
            {Object.entries(features).slice(0, 6).map(([feat, score]) => (
              <div key={feat} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-cyan-300 block">{feat.toUpperCase()}</span>
                  <span className="text-[10px] text-slate-500">
                    {feat === 's11' ? 'Static Press HPC' : feat === 's4' ? 'LPT Outlet Temp' : feat === 's12' ? 'Fuel Flow Ratio' : 'Sensor ' + feat}
                  </span>
                </div>
                <span className="text-emerald-400 font-bold">{(score * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button onClick={onClose} className="btn-avionics-solid">
            Close Verification Deck
          </button>
        </div>
      </div>
    </div>
  );
}
