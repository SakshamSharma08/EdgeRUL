import React, { useState } from 'react';
import { AlertOctagon, AlertTriangle, X, Volume2, VolumeX, ShieldAlert } from 'lucide-react';

export default function AlertBanner({ alerts = [], onDismiss }) {
  const [muted, setMuted] = useState(false);

  if (!alerts || alerts.length === 0) return null;

  const currentAlert = alerts[0];
  const isCritical = currentAlert.severity === 'CRITICAL';

  // Optional Web Audio synthetic chime on alert
  const playChime = () => {
    if (muted) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isCritical ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isCritical ? 880 : 440, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      // AudioContext policy
    }
  };

  return (
    <div
      className={`relative w-full rounded-xl border p-4 mb-4 transition-all duration-300 shadow-xl ${
        isCritical
          ? 'bg-red-950/80 border-red-500/80 text-red-100 shadow-red-900/30'
          : 'bg-amber-950/80 border-amber-500/80 text-amber-100 shadow-amber-900/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg mt-0.5 ${
              isCritical ? 'bg-red-900/80 text-red-200 animate-bounce' : 'bg-amber-900/80 text-amber-200'
            }`}
          >
            {isCritical ? <AlertOctagon className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  isCritical ? 'bg-red-900 text-red-200' : 'bg-amber-900 text-amber-200'
                }`}
              >
                {currentAlert.severity} ADVISORY
              </span>
              <span className="text-xs font-mono text-slate-300">
                Engine #{String(currentAlert.engineId).padStart(3, '0')} · Flight Cycle #{currentAlert.cycle}
              </span>
            </div>

            <h4 className="font-display font-bold text-base mt-1 text-white">
              {currentAlert.title}
            </h4>

            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              {currentAlert.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMuted(!muted)}
            className="p-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-slate-300 transition-colors"
            title={muted ? 'Unmute Audio Warning' : 'Mute Audio Warning'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onDismiss(currentAlert.id)}
            className="p-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-slate-300 transition-colors"
            title="Acknowledge Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
