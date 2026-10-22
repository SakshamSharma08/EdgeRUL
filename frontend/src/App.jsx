import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import TurbofanSchematic from './components/TurbofanSchematic';
import RadialRULGauge from './components/RadialRULGauge';
import TelemetryOscilloscope from './components/TelemetryOscilloscope';
import FleetMonitor from './components/FleetMonitor';
import SimulationControls from './components/SimulationControls';
import AlertBanner from './components/AlertBanner';
import BenchmarkModal from './components/BenchmarkModal';

const getApiBase = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return window.location.port === '3001' ? `${window.location.origin}/api` : 'http://localhost:3001/api';
    }
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:3001/api';
};

const getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (typeof window !== 'undefined') {
    const isSecure = window.location.protocol === 'https:';
    const proto = isSecure ? 'wss:' : 'ws:';
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return window.location.port === '3001' ? `${proto}//${window.location.host}/ws/telemetry` : 'ws://localhost:3001/ws/telemetry';
    }
    return `${proto}//${window.location.host}/ws/telemetry`;
  }
  return 'ws://localhost:3001/ws/telemetry';
};

const API_BASE = getApiBase();
const WS_URL = getWsUrl();

const INITIAL_ENGINES = [
  { id: '1', cycleCount: 84, lastRul: 98, healthIndex: 89, status: 'HEALTHY', model: 'CFM LEAP-1B', lastUpdate: Date.now() },
  { id: '2', cycleCount: 132, lastRul: 62, healthIndex: 68, status: 'CAUTION', model: 'GE GEnx-1B', lastUpdate: Date.now() },
  { id: '3', cycleCount: 178, lastRul: 28, healthIndex: 32, status: 'CRITICAL', model: 'Trent XWB-97', lastUpdate: Date.now() },
  { id: '4', cycleCount: 45, lastRul: 125, healthIndex: 99, status: 'HEALTHY', model: 'PW1100G', lastUpdate: Date.now() }
];

const DEFAULT_SENSORS = {
  os1: { value: 0.0023 },
  os2: { value: 0.0003 },
  s2: { value: 642.3 },
  s3: { value: 1588.6 },
  s4: { value: 1404.2 },
  s7: { value: 553.8 },
  s8: { value: 2388.1 },
  s9: { value: 9054.6 },
  s11: { value: 47.4 },
  s12: { value: 521.9 },
  s13: { value: 2388.1 },
  s14: { value: 8132.8 },
  s15: { value: 8.44 },
  s17: { value: 392 },
  s20: { value: 38.8 },
  s21: { value: 23.3 }
};

const generateInitialHistory = (startCycle = 65, endCycle = 84) => {
  const hist = [];
  for (let c = startCycle; c <= endCycle; c++) {
    const rul = Math.max(0, 125 - (c - 50) * 0.8);
    hist.push({
      cycle: c,
      rul: Math.round(rul * 10) / 10,
      healthIndex: Math.round((rul / 125) * 100),
      status: rul > 65 ? 'HEALTHY' : rul > 30 ? 'CAUTION' : 'CRITICAL',
      latencyMs: Math.round((0.015 + Math.random() * 0.02) * 1000) / 1000,
      timestamp: Date.now() - (endCycle - c) * 3000
    });
  }
  return hist;
};

export default function App() {
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [selectedEngineId, setSelectedEngineId] = useState(1);
  const [engines, setEngines] = useState(INITIAL_ENGINES);
  const [currentEngineDetail, setCurrentEngineDetail] = useState({
    id: 1,
    cycleCount: 84,
    lastRul: 98,
    healthIndex: 89,
    status: 'HEALTHY',
    history: generateInitialHistory(65, 84),
    currentSensors: DEFAULT_SENSORS,
    lastLatencyMs: 0.018
  });

  const [alerts, setAlerts] = useState([]);
  const [isSimRunning, setIsSimRunning] = useState(false);
  const [simSpeed, setSimSpeed] = useState(450);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);

  const wsRef = useRef(null);

  // 1. Initial REST API Data Fetch
  useEffect(() => {
    async function fetchInitial() {
      try {
        const [healthRes, benchRes, enginesRes, alertsRes] = await Promise.all([
          fetch(`${API_BASE}/health`).then(r => r.json()).catch(() => null),
          fetch(`${API_BASE}/benchmark`).then(r => r.json()).catch(() => null),
          fetch(`${API_BASE}/engines`).then(r => r.json()).catch(() => null),
          fetch(`${API_BASE}/alerts`).then(r => r.json()).catch(() => null)
        ]);

        if (benchRes) setBenchmarkData(benchRes);
        if (enginesRes?.engines) setEngines(enginesRes.engines);
        if (alertsRes?.alerts) setAlerts(alertsRes.alerts);
        if (healthRes?.simulation) setIsSimRunning(healthRes.simulation.isRunning);

        // Fetch selected engine details
        fetchEngineDetail(selectedEngineId);
      } catch (err) {
        console.error('Initial data fetch failed:', err);
      }
    }

    fetchInitial();
  }, []);

  const fetchEngineDetail = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/engines/${id}`).then(r => r.json());
      if (res && res.id) {
        setCurrentEngineDetail(res);
      }
    } catch (err) {
      console.warn('Failed to fetch engine detail:', err);
    }
  };

  // 2. WebSocket Connection & Stream Ingestion
  useEffect(() => {
    let reconnectTimeout = null;

    function connectWs() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsWsConnected(true);
        console.log('[App] Connected to live EdgeRUL Telemetry WebSocket');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'TELEMETRY_TICK') {
            // Update fleet overview list
            setEngines(prev => {
              const idx = prev.findIndex(e => String(e.id) === String(data.engineId));
              const updatedItem = {
                id: String(data.engineId),
                cycleCount: data.cycle,
                lastRul: data.rul,
                healthIndex: data.healthIndex,
                status: data.status,
                lastUpdate: Date.now()
              };

              if (idx >= 0) {
                const next = [...prev];
                next[idx] = updatedItem;
                return next;
              }
              return [...prev, updatedItem];
            });

            // If tick corresponds to currently selected engine, update HUD
            if (String(data.engineId) === String(selectedEngineId)) {
              setCurrentEngineDetail(prev => {
                const newHistory = [
                  ...(prev.history || []),
                  {
                    cycle: data.cycle,
                    rul: data.rul,
                    healthIndex: data.healthIndex,
                    status: data.status,
                    latencyMs: data.latencyMs,
                    timestamp: data.timestamp
                  }
                ].slice(-100);

                // Format current sensors
                const formattedSensors = {};
                if (data.sensors) {
                  Object.entries(data.sensors).forEach(([k, v]) => {
                    formattedSensors[k] = { value: v };
                  });
                }

                return {
                  ...prev,
                  id: data.engineId,
                  cycleCount: data.cycle,
                  lastRul: data.rul,
                  healthIndex: data.healthIndex,
                  status: data.status,
                  history: newHistory,
                  currentSensors: formattedSensors,
                  lastLatencyMs: data.latencyMs
                };
              });
            }
          } else if (data.type === 'ALERT_EVENT' && data.alert) {
            setAlerts(prev => [data.alert, ...prev.filter(a => a.id !== data.alert.id)].slice(0, 20));
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        setIsWsConnected(false);
        reconnectTimeout = setTimeout(connectWs, 2000);
      };

      ws.onerror = () => {
        setIsWsConnected(false);
        ws.close();
      };
    }

    connectWs();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [selectedEngineId]);

  // Standalone Client Simulation Loop (Active when WebSocket is disconnected and user starts simulation)
  useEffect(() => {
    if (!isSimRunning || isWsConnected) return;

    const timer = setInterval(() => {
      setCurrentEngineDetail(prev => {
        const nextCycle = (prev.cycleCount || 84) + 1;
        const decayRate = 0.35 + Math.random() * 0.3;
        const nextRul = Math.max(0, Math.round(((prev.lastRul || 98) - decayRate) * 10) / 10);
        const healthIndex = Math.max(0, Math.min(100, Math.round((nextRul / 125) * 100)));
        const status = nextRul > 65 ? 'HEALTHY' : nextRul > 30 ? 'CAUTION' : 'CRITICAL';

        // Dynamic realistic sensor readings with minor operational jitter
        const s = prev.currentSensors || DEFAULT_SENSORS;
        const s3Val = Math.round((1588.6 + ((nextCycle - 84) * 0.15) + (Math.random() - 0.5) * 1.5) * 10) / 10;
        const s7Val = Math.round((553.8 - ((nextCycle - 84) * 0.05) + (Math.random() - 0.5) * 0.4) * 10) / 10;
        const updatedSensors = {
          ...s,
          s3: { value: s3Val },
          s7: { value: s7Val },
          s8: { value: Math.round((2388.1 + (Math.random() - 0.5) * 4) * 10) / 10 },
          s9: { value: Math.round((9054.6 + (Math.random() - 0.5) * 6) * 10) / 10 },
          s11: { value: Math.round((47.4 + ((nextCycle - 84) * 0.01) + (Math.random() - 0.5) * 0.1) * 10) / 10 }
        };

        const newPoint = {
          cycle: nextCycle,
          rul: nextRul,
          healthIndex,
          status,
          latencyMs: Math.round((0.012 + Math.random() * 0.018) * 1000) / 1000,
          timestamp: Date.now()
        };

        return {
          ...prev,
          cycleCount: nextCycle,
          lastRul: nextRul,
          healthIndex,
          status,
          currentSensors: updatedSensors,
          history: [...(prev.history || []), newPoint].slice(-100),
          lastLatencyMs: newPoint.latencyMs
        };
      });

      // Update fleet monitor for selected engine
      setEngines(prev => prev.map(e => {
        if (String(e.id) === String(selectedEngineId)) {
          return {
            ...e,
            cycleCount: (e.cycleCount || 84) + 1,
            lastUpdate: Date.now()
          };
        }
        return e;
      }));
    }, simSpeed);

    return () => clearInterval(timer);
  }, [isSimRunning, isWsConnected, simSpeed, selectedEngineId]);

  // Handle Engine Selection
  const handleSelectEngine = (id) => {
    setSelectedEngineId(id);
    if (isWsConnected) {
      fetchEngineDetail(id);
    } else {
      const match = engines.find(e => String(e.id) === String(id));
      if (match) {
        setCurrentEngineDetail(prev => ({
          ...prev,
          id: match.id,
          cycleCount: match.cycleCount,
          lastRul: match.lastRul,
          healthIndex: match.healthIndex,
          status: match.status,
          history: generateInitialHistory(Math.max(1, match.cycleCount - 20), match.cycleCount)
        }));
      }
    }
  };

  // Simulation Controls
  const handleTogglePlay = async () => {
    const nextState = !isSimRunning;
    setIsSimRunning(nextState);

    if (isWsConnected) {
      try {
        const endpoint = nextState ? 'start' : 'stop';
        await fetch(`${API_BASE}/simulation/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intervalMs: simSpeed })
        });
      } catch (e) {
        console.warn('Backend simulation toggle error:', e);
      }
    }
  };

  const handleSpeedChange = async (speed) => {
    setSimSpeed(speed);
    if (isSimRunning && isWsConnected) {
      try {
        await fetch(`${API_BASE}/simulation/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intervalMs: speed })
        });
      } catch (e) {
        console.warn('Backend speed change error:', e);
      }
    }
  };

  const handleReset = async () => {
    setIsSimRunning(false);
    setAlerts([]);

    if (isWsConnected) {
      try {
        await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' });
        fetchEngineDetail(selectedEngineId);
      } catch (e) {
        console.warn('Backend reset error:', e);
      }
    } else {
      const match = INITIAL_ENGINES.find(e => String(e.id) === String(selectedEngineId)) || INITIAL_ENGINES[0];
      setEngines(INITIAL_ENGINES);
      setCurrentEngineDetail({
        id: match.id,
        cycleCount: match.cycleCount,
        lastRul: match.lastRul,
        healthIndex: match.healthIndex,
        status: match.status,
        history: generateInitialHistory(Math.max(1, match.cycleCount - 20), match.cycleCount),
        currentSensors: DEFAULT_SENSORS,
        lastLatencyMs: 0.015
      });
    }
  };

  // Inject High Pressure Compressor (HPC) Thermal Anomaly
  const handleInjectAnomaly = async () => {
    const anomalySensors = {
      os1: 0.001,
      os2: 0.0002,
      s2: 644.8,
      s3: 1618.5, // severe thermal spike in HPC (>1610°R)
      s4: 1445.0, // severe thermal spike in LPT
      s7: 546.0,  // severe pressure drop in HPC outlet
      s8: 2387.9,
      s9: 9020.0,
      s11: 48.4,  // elevated static pressure
      s12: 520.1,
      s13: 2388.0,
      s14: 8120.0,
      s15: 8.6,
      s17: 398,
      s20: 38.1,
      s21: 22.8
    };

    if (isWsConnected) {
      try {
        const nextCycle = (currentEngineDetail.cycleCount || 50) + 1;
        await fetch(`${API_BASE}/predict/single`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            engineId: selectedEngineId,
            sensors: anomalySensors,
            cycle: nextCycle
          })
        });
        fetchEngineDetail(selectedEngineId);
        return;
      } catch (e) {
        console.warn('Backend prediction error, applying client-side anomaly:', e);
      }
    }

    // Standalone Anomaly Simulation
    const nextCycle = (currentEngineDetail.cycleCount || 84) + 1;
    const formattedAnomalySensors = {};
    Object.entries(anomalySensors).forEach(([k, v]) => {
      formattedAnomalySensors[k] = { value: v };
    });

    const anomalyPoint = {
      cycle: nextCycle,
      rul: 14.2,
      healthIndex: 11,
      status: 'CRITICAL',
      latencyMs: 0.019,
      timestamp: Date.now()
    };

    setCurrentEngineDetail(prev => ({
      ...prev,
      cycleCount: nextCycle,
      lastRul: 14.2,
      healthIndex: 11,
      status: 'CRITICAL',
      currentSensors: formattedAnomalySensors,
      history: [...(prev.history || []), anomalyPoint].slice(-100),
      lastLatencyMs: 0.019
    }));

    setAlerts(prev => [
      {
        id: `alert-${Date.now()}`,
        severity: 'CRITICAL',
        title: 'HPC THERMAL RUNAWAY ANOMALY DETECTED',
        message: `Engine #${selectedEngineId} HPC outlet temperature spiked to 1618.5°R with pressure drop to 546 psia. Projected RUL reduced to 14.2 cycles. Immediate maintenance action required!`,
        timestamp: new Date().toLocaleTimeString(),
        engineId: selectedEngineId
      },
      ...prev
    ].slice(0, 20));
  };

  const handleDismissAlert = (alertId) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  // Export history log as CSV
  const handleExportCsv = () => {
    const history = currentEngineDetail.history || [];
    if (history.length === 0) {
      alert('No flight history recorded yet for this engine.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,Cycle,Predicted_RUL,Health_Index,Status,Latency_MS,Timestamp\n';
    history.forEach(row => {
      csvContent += `${row.cycle},${row.rul},${row.healthIndex},${row.status},${row.latencyMs || 0.01},${new Date(row.timestamp).toISOString()}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Engine_${String(selectedEngineId).padStart(3, '0')}_RUL_Telemetry.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col font-main">
      {/* Top Avionics Navigation */}
      <Navbar
        isWsConnected={isWsConnected}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        onExportCsv={handleExportCsv}
        activeEnginesCount={engines.length}
      />

      {/* Main Command Center Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Active Emergency Alert Banner */}
        <AlertBanner alerts={alerts} onDismiss={handleDismissAlert} />

        {/* Telemetry Stream Simulation Controls */}
        <SimulationControls
          isRunning={isSimRunning}
          playbackSpeed={simSpeed}
          selectedEngineId={selectedEngineId}
          onTogglePlay={handleTogglePlay}
          onSpeedChange={handleSpeedChange}
          onReset={handleReset}
          onInjectAnomaly={handleInjectAnomaly}
          onSelectEngine={handleSelectEngine}
        />

        {/* Fleet Multi-Engine Monitoring Deck */}
        <FleetMonitor
          engines={engines}
          selectedEngineId={selectedEngineId}
          onSelectEngine={handleSelectEngine}
        />

        {/* Core HUD Deck: Dynamic Cross-Section Schematic + Radial RUL Gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <TurbofanSchematic
              sensors={currentEngineDetail.currentSensors}
              status={currentEngineDetail.status}
              rul={currentEngineDetail.lastRul}
              cycle={currentEngineDetail.cycleCount}
            />
          </div>

          <div className="lg:col-span-1">
            <RadialRULGauge
              rul={currentEngineDetail.lastRul}
              status={currentEngineDetail.status}
              latencyMs={currentEngineDetail.lastLatencyMs || 0.02}
              cycle={currentEngineDetail.cycleCount}
            />
          </div>
        </div>

        {/* Live Degradation Telemetry Oscilloscope */}
        <TelemetryOscilloscope
          history={currentEngineDetail.history}
          currentSensors={currentEngineDetail.currentSensors}
        />
      </main>

      {/* Verification Benchmark Deck Modal */}
      <BenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
        benchmarkData={benchmarkData}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 px-6 text-center text-xs font-mono text-slate-500">
        <p>
          EdgeRUL · Edge-AI Turbofan Prognostics & Health Management · InnoVent-27 Hackathon 2026
        </p>
      </footer>
    </div>
  );
}
