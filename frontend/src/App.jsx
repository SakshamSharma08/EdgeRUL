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

export default function App() {
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [selectedEngineId, setSelectedEngineId] = useState(1);
  const [engines, setEngines] = useState([]);
  const [currentEngineDetail, setCurrentEngineDetail] = useState({
    id: 1,
    cycleCount: 1,
    lastRul: 125,
    healthIndex: 100,
    status: 'HEALTHY',
    history: [],
    currentSensors: {}
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

  // Handle Engine Selection
  const handleSelectEngine = (id) => {
    setSelectedEngineId(id);
    fetchEngineDetail(id);
  };

  // Simulation Controls
  const handleTogglePlay = async () => {
    const nextState = !isSimRunning;
    setIsSimRunning(nextState);

    const endpoint = nextState ? 'start' : 'stop';
    await fetch(`${API_BASE}/simulation/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intervalMs: simSpeed })
    });
  };

  const handleSpeedChange = async (speed) => {
    setSimSpeed(speed);
    if (isSimRunning) {
      await fetch(`${API_BASE}/simulation/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalMs: speed })
      });
    }
  };

  const handleReset = async () => {
    setIsSimRunning(false);
    await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' });
    setAlerts([]);
    fetchEngineDetail(selectedEngineId);
  };

  // Inject High Pressure Compressor (HPC) Thermal Anomaly
  const handleInjectAnomaly = async () => {
    // Inject severely degraded HPC sensor measurements
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
