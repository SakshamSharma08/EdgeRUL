import React, { useState } from 'react';
import { Activity, Flame, Wind, Gauge, ShieldAlert, Cpu } from 'lucide-react';

export default function TurbofanSchematic({ sensors, status, rul, cycle }) {
  const [hoveredStage, setHoveredStage] = useState(null);

  // Fallback defaults if sensors are loading
  const s2 = sensors?.s2?.value ?? 642.5; // LPC Temp (°R)
  const s3 = sensors?.s3?.value ?? 1585.0; // HPC Temp (°R)
  const s4 = sensors?.s4?.value ?? 1400.0; // LPT Temp (°R)
  const s7 = sensors?.s7?.value ?? 553.0; // HPC Outlet Press (psia)
  const s8 = sensors?.s8?.value ?? 2388.0; // Fan Speed (rpm)
  const s9 = sensors?.s9?.value ?? 9050.0; // Core Speed (rpm)
  const s11 = sensors?.s11?.value ?? 47.2; // HPC Static Press (psia)
  const s15 = sensors?.s15?.value ?? 8.4; // Bypass Duct Press (psia)

  // Calculate thermal stress color for HPC & Combustor based on s3 and status
  const getHpcColor = () => {
    if (status === 'CRITICAL') return '#ef4444';
    if (status === 'WARNING') return '#f59e0b';
    if (status === 'CAUTION') return '#38bdf8';
    return '#00f0ff';
  };

  const getCombustorColor = () => {
    if (status === 'CRITICAL') return '#ff2244';
    if (status === 'WARNING') return '#ff7700';
    return '#f59e0b';
  };

  const stages = [
    { id: 'fan', name: 'N1 Fan & Intake', temp: '518 °R', press: '14.7 psia', speed: `${Math.round(s8)} rpm`, icon: Wind, desc: 'Titanium wide-chord blades. Intake air compression.' },
    { id: 'lpc', name: 'Low Pressure Compressor (LPC)', temp: `${s2.toFixed(1)} °R`, press: '28.5 psia', speed: 'N1 Spool', icon: Activity, desc: 'Multi-stage axial compression booster.' },
    { id: 'hpc', name: 'High Pressure Compressor (HPC)', temp: `${s3.toFixed(1)} °R`, press: `${s7.toFixed(1)} psia`, speed: `${Math.round(s9)} rpm`, icon: Flame, desc: 'Primary thermal degradation focus zone in CMAPSS FD001.' },
    { id: 'combustor', name: 'Annular Combustor', temp: '2600 °R', press: `${s11.toFixed(1)} psia`, speed: 'Continuous Burn', icon: Flame, desc: 'Fuel injector nozzles & high-enthalpy gas expansion.' },
    { id: 'hpt', name: 'High Pressure Turbine (HPT)', temp: '1850 °R', press: '110 psia', speed: 'N2 Spool', icon: Cpu, desc: 'Single-crystal superalloy blades with active film cooling.' },
    { id: 'lpt', name: 'Low Pressure Turbine (LPT)', temp: `${s4.toFixed(1)} °R`, press: '22 psia', speed: 'N1 Spool', icon: Gauge, desc: 'Drives the front fan through concentric coaxial shaft.' },
    { id: 'bypass', name: 'Bypass Stream Duct', temp: '540 °R', press: `${s15.toFixed(2)} psia`, speed: 'Bypass 8.5:1', icon: Wind, desc: 'Produces 80%+ of total aircraft cruise thrust.' }
  ];

  return (
    <div className="hud-panel p-5 hud-brackets">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-slate-100 flex items-center gap-2">
              Turbofan Twin-Spool Dynamic Cross-Section
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-300 border border-cyan-500/30">
                CFM56 / High-Bypass Simulation
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Real-time thermal-pressure heatmap mapped to CMAPSS sensor telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700/60">
            <span className="text-slate-400">HPC Status:</span>
            <span className={`font-bold ${status === 'CRITICAL' ? 'text-red-400' : status === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'}`}>
              {status === 'CRITICAL' ? 'THERMAL EOL' : status === 'WARNING' ? 'DRIFT DETECTED' : 'NOMINAL'}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700/60">
            <span className="text-slate-400">Cycle:</span>
            <span className="text-cyan-400 font-bold">#{cycle}</span>
          </div>
        </div>
      </div>

      {/* SVG Engine Blueprint Architecture */}
      <div className="relative w-full overflow-hidden bg-slate-950/80 rounded-xl border border-cyan-500/20 p-2">
        <svg viewBox="0 0 920 320" className="w-full h-auto select-none">
          <defs>
            {/* Heatmap Gradients */}
            <linearGradient id="intakeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.35" />
            </linearGradient>

            <linearGradient id="lpcGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.5" />
            </linearGradient>

            <linearGradient id="hpcGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor={getHpcColor()} stopOpacity="0.75" />
            </linearGradient>

            <linearGradient id="combustorGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={getHpcColor()} stopOpacity="0.7" />
              <stop offset="50%" stopColor={getCombustorColor()} stopOpacity="0.9" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.7" />
            </linearGradient>

            <linearGradient id="turbineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.4" />
            </linearGradient>

            <linearGradient id="bypassGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.22" />
            </linearGradient>

            {/* Glow Filter */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Engine Nacelle Outer Cowling */}
          <path
            d="M 60 70 Q 240 30 540 45 L 860 100 L 840 120 L 520 85 Q 260 80 80 100 Z"
            fill="url(#bypassGrad)"
            stroke="#00f0ff"
            strokeWidth="1.2"
            opacity="0.8"
          />
          <path
            d="M 60 250 Q 240 290 540 275 L 860 220 L 840 200 L 520 235 Q 260 240 80 220 Z"
            fill="url(#bypassGrad)"
            stroke="#00f0ff"
            strokeWidth="1.2"
            opacity="0.8"
          />

          {/* Core Centerline Coaxial Shafts */}
          <line x1="80" y1="160" x2="840" y2="160" stroke="#00f0ff" strokeWidth="2.5" strokeDasharray="8 4" opacity="0.4" />
          <rect x="220" y="154" width="460" height="12" rx="4" fill="#0d1b33" stroke="#38bdf8" strokeWidth="1.5" />

          {/* --- STAGE 1: FRONT FAN (Intake & N1 Spool) --- */}
          <g
            className="cursor-pointer transition-opacity hover:opacity-100"
            onMouseEnter={() => setHoveredStage('fan')}
            onMouseLeave={() => setHoveredStage(null)}
          >
            {/* Fan Spinner Cone */}
            <path d="M 60 160 Q 110 135 150 145 L 150 175 Q 110 185 60 160 Z" fill="#1e293b" stroke="#00f0ff" strokeWidth="1.5" />
            
            {/* Fan Blades (Animated Rotation) */}
            <g className="animate-fan-normal" style={{ transformOrigin: '150px 160px' }}>
              <ellipse cx="150" cy="110" rx="14" ry="48" fill="#00f0ff" opacity="0.6" />
              <ellipse cx="150" cy="210" rx="14" ry="48" fill="#00f0ff" opacity="0.6" />
              <ellipse cx="120" cy="140" rx="38" ry="12" fill="#38bdf8" opacity="0.4" />
              <ellipse cx="180" cy="180" rx="38" ry="12" fill="#38bdf8" opacity="0.4" />
            </g>
            <text x="110" y="275" fill="#00f0ff" fontSize="11" fontFamily="JetBrains Mono" fontWeight="600">STAGE 1: FAN</text>
          </g>

          {/* --- STAGE 2: LOW PRESSURE COMPRESSOR (LPC) --- */}
          <g
            className="cursor-pointer transition-all"
            onMouseEnter={() => setHoveredStage('lpc')}
            onMouseLeave={() => setHoveredStage(null)}
          >
            <polygon points="190,120 280,132 280,188 190,200" fill="url(#lpcGrad)" stroke="#00f0ff" strokeWidth="1.2" />
            {/* Stator & Rotor Blades */}
            {[210, 235, 260].map((x, i) => (
              <line key={i} x1={x} y1={123 + i * 3} x2={x} y2={197 - i * 3} stroke="#f8fafc" strokeWidth="2.5" opacity="0.8" />
            ))}
            <text x="200" y="105" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono">LPC (T24: {s2.toFixed(0)}°R)</text>
          </g>

          {/* --- STAGE 3: HIGH PRESSURE COMPRESSOR (HPC) --- [DEGRADATION HOTSPOT] */}
          <g
            className="cursor-pointer transition-all"
            onMouseEnter={() => setHoveredStage('hpc')}
            onMouseLeave={() => setHoveredStage(null)}
          >
            <polygon
              points="285,133 430,145 430,175 285,187"
              fill="url(#hpcGrad)"
              stroke={getHpcColor()}
              strokeWidth={status === 'CRITICAL' ? '2.5' : '1.5'}
              filter={status === 'CRITICAL' ? 'url(#neonGlow)' : undefined}
            />
            {/* Multi-stage HPC disks */}
            {[305, 330, 355, 380, 405].map((x, i) => (
              <line key={i} x1={x} y1={135 + i * 2.5} x2={x} y2={185 - i * 2.5} stroke={getHpcColor()} strokeWidth="2" opacity="0.9" />
            ))}
            <rect x="290" y="210" width="135" height="22" rx="4" fill="rgba(15, 23, 42, 0.85)" stroke={getHpcColor()} strokeWidth="1" />
            <text x="298" y="225" fill={getHpcColor()} fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">
              HPC [T30: {s3.toFixed(0)}°R]
            </text>
          </g>

          {/* --- STAGE 4: COMBUSTOR --- */}
          <g
            className="cursor-pointer transition-all"
            onMouseEnter={() => setHoveredStage('combustor')}
            onMouseLeave={() => setHoveredStage(null)}
          >
            {/* Top & Bottom Annular Burners */}
            <path d="M 435 143 Q 485 138 520 143 L 520 152 Q 485 148 435 152 Z" fill="url(#combustorGrad)" stroke="#f59e0b" strokeWidth="1.2" />
            <path d="M 435 168 Q 485 172 520 168 L 520 177 Q 485 182 435 177 Z" fill="url(#combustorGrad)" stroke="#f59e0b" strokeWidth="1.2" />
            {/* Fuel Injection Sprays */}
            <circle cx="450" cy="147" r="3" fill="#ff4400" />
            <circle cx="450" cy="173" r="3" fill="#ff4400" />
            <text x="440" y="125" fill="#f59e0b" fontSize="10" fontFamily="JetBrains Mono">COMBUSTOR</text>
          </g>

          {/* --- STAGE 5: HIGH PRESSURE TURBINE (HPT) --- */}
          <g
            className="cursor-pointer transition-all"
            onMouseEnter={() => setHoveredStage('hpt')}
            onMouseLeave={() => setHoveredStage(null)}
          >
            <polygon points="525,142 585,138 585,182 525,178" fill="url(#turbineGrad)" stroke="#f59e0b" strokeWidth="1.2" />
            <line x1="555" y1="140" x2="555" y2="180" stroke="#fef08a" strokeWidth="2.5" />
            <text x="530" y="200" fill="#f59e0b" fontSize="9" fontFamily="JetBrains Mono">HPT</text>
          </g>

          {/* --- STAGE 6: LOW PRESSURE TURBINE (LPT) --- */}
          <g
            className="cursor-pointer transition-all"
            onMouseEnter={() => setHoveredStage('lpt')}
            onMouseLeave={() => setHoveredStage(null)}
          >
            <polygon points="590,137 680,126 680,194 590,183" fill="url(#turbineGrad)" stroke="#38bdf8" strokeWidth="1.2" />
            {[610, 635, 660].map((x, i) => (
              <line key={i} x1={x} y1={135 - i * 2} x2={x} y2={185 + i * 2} stroke="#38bdf8" strokeWidth="2" opacity="0.85" />
            ))}
            <text x="600" y="112" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono">LPT (T50: {s4.toFixed(0)}°R)</text>
          </g>

          {/* --- STAGE 7: EXHAUST MIXER & NOZZLE --- */}
          <polygon points="685,125 780,135 780,185 685,195" fill="rgba(30, 41, 59, 0.7)" stroke="#64748b" strokeWidth="1.2" />
          <path d="M 780 135 L 850 148 L 850 172 L 780 185 Z" fill="rgba(56, 189, 248, 0.15)" stroke="#00f0ff" strokeWidth="1" strokeDasharray="3 3" />
          <text x="730" y="163" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono">NOZZLE</text>

          {/* Airflow Particles / Velocity Indicators */}
          <g opacity="0.4">
            <line x1="80" y1="58" x2="520" y2="58" stroke="#00f0ff" strokeWidth="1.5" strokeDasharray="16 8" />
            <line x1="80" y1="262" x2="520" y2="262" stroke="#00f0ff" strokeWidth="1.5" strokeDasharray="16 8" />
          </g>
        </svg>

        {/* Hover Stage Detail Overlay */}
        {hoveredStage && (
          <div className="absolute bottom-3 left-3 right-3 p-3 rounded-lg bg-slate-900/95 border border-cyan-500/50 backdrop-blur-md flex items-center justify-between shadow-2xl transition-all">
            {(() => {
              const stage = stages.find(s => s.id === hoveredStage);
              const Icon = stage.icon;
              return (
                <>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 font-display">{stage.name}</h4>
                      <p className="text-xs text-slate-400">{stage.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 block">Temperature:</span>
                      <span className="text-amber-400 font-bold">{stage.temp}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Pressure:</span>
                      <span className="text-cyan-400 font-bold">{stage.press}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Speed / Regime:</span>
                      <span className="text-emerald-400 font-bold">{stage.speed}</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Sensor Quick Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-4 text-xs font-mono">
        <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">T24 (LPC Temp)</span>
          <span className="text-cyan-300 font-bold">{s2.toFixed(1)} °R</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">T30 (HPC Temp)</span>
          <span className={`font-bold ${s3 > 1600 ? 'text-amber-400' : 'text-cyan-300'}`}>{s3.toFixed(1)} °R</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">T50 (LPT Temp)</span>
          <span className="text-cyan-300 font-bold">{s4.toFixed(1)} °R</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">P30 (HPC Press)</span>
          <span className="text-cyan-300 font-bold">{s7.toFixed(1)} psia</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">N1 (Fan Speed)</span>
          <span className="text-cyan-300 font-bold">{Math.round(s8)} rpm</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">N2 (Core Speed)</span>
          <span className="text-cyan-300 font-bold">{Math.round(s9)} rpm</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">Ps30 (Static Press)</span>
          <span className="text-cyan-300 font-bold">{s11.toFixed(2)} psia</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/50 border border-slate-800">
          <span className="text-slate-400 block text-[10px]">Bypass Duct Press</span>
          <span className="text-cyan-300 font-bold">{s15.toFixed(2)} psia</span>
        </div>
      </div>
    </div>
  );
}
