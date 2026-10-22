const express = require('express');
const fs = require('fs');
const router = express.Router();
const config = require('../config');
const onnxInference = require('../services/onnxInference');
const engineStore = require('../services/engineStore');
const alertEngine = require('../services/alertEngine');
const telemetrySimulator = require('../services/telemetrySimulator');

// System Health & Edge Status
router.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'EdgeRUL Edge-AI Predictive Maintenance Gateway',
    timestamp: Date.now(),
    modelReady: onnxInference.isReady,
    edgeMetrics: onnxInference.getMetrics(),
    activeEnginesCount: engineStore.getAllEngines().length,
    simulation: telemetrySimulator.getStatus()
  });
});

// NASA CMAPSS Benchmark Data (Model Performance & Edge Latency)
router.get('/benchmark', (req, res) => {
  if (fs.existsSync(config.BENCHMARK_PATH)) {
    const data = JSON.parse(fs.readFileSync(config.BENCHMARK_PATH, 'utf-8'));
    res.json(data);
  } else {
    res.status(404).json({ error: 'Benchmark summary not yet generated.' });
  }
});

// Sensor Metadata & Descriptions
router.get('/sensors/meta', (req, res) => {
  res.json({
    activeFeatures: config.ACTIVE_FEATURES,
    metadata: config.SENSOR_METADATA,
    thresholds: config.THRESHOLDS
  });
});

// List All Monitored Engines
router.get('/engines', (req, res) => {
  res.json({
    engines: engineStore.getAllEngines()
  });
});

// Specific Engine Trajectory & Detailed State
router.get('/engines/:id', (req, res) => {
  const engineId = req.params.id;
  const detail = engineStore.getEngineDetail(engineId);
  res.json(detail);
});

// Active Alerts List
router.get('/alerts', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json({
    alerts: alertEngine.getRecentAlerts(limit)
  });
});

// Single Cycle Inference Request (Edge REST API)
router.post('/predict/single', async (req, res) => {
  try {
    const { engineId, sensors, cycle } = req.body;
    if (!engineId || !sensors) {
      return res.status(400).json({ error: 'Missing engineId or sensors payload.' });
    }

    // Push reading to rolling buffer
    engineStore.pushReading(engineId, sensors, cycle);

    // Extract sliding window features
    const featureVector = engineStore.extractFeatureVector(engineId);

    // Run low-latency ONNX inference
    const { rul, latencyMs } = await onnxInference.predict(featureVector);

    // Update state & check alerts
    const updated = engineStore.updateEnginePrediction(engineId, rul, latencyMs);
    const alert = alertEngine.checkAlerts(updated);

    res.json({
      engineId,
      cycle: updated.cycleCount,
      rul,
      healthIndex: updated.healthIndex,
      status: updated.status,
      latencyMs,
      alertGenerated: alert !== null,
      isWindowReady: engineStore.isWindowReady(engineId)
    });
  } catch (err) {
    console.error('[API] /predict/single error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Batch CSV / JSON Prediction
router.post('/predict/batch', async (req, res) => {
  try {
    const { readings } = req.body; // array of { engineId, cycle, sensors }
    if (!Array.isArray(readings) || readings.length === 0) {
      return res.status(400).json({ error: 'Payload must be a non-empty array of readings.' });
    }

    const tStart = performance.now();
    const results = [];

    for (const item of readings) {
      engineStore.pushReading(item.engineId, item.sensors, item.cycle);
      const featureVector = engineStore.extractFeatureVector(item.engineId);
      const { rul, latencyMs } = await onnxInference.predict(featureVector);
      const updated = engineStore.updateEnginePrediction(item.engineId, rul, latencyMs);

      results.push({
        engineId: item.engineId,
        cycle: updated.cycleCount,
        rul,
        healthIndex: updated.healthIndex,
        status: updated.status,
        latencyMs
      });
    }

    const totalBatchMs = performance.now() - tStart;

    res.json({
      totalProcessed: results.length,
      totalBatchMs: Math.round(totalBatchMs * 100) / 100,
      avgLatencyPerItemMs: Math.round((totalBatchMs / results.length) * 1000) / 1000,
      results
    });
  } catch (err) {
    console.error('[API] /predict/batch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Telemetry Simulation Controls
router.post('/simulation/start', (req, res) => {
  const { engineIds, intervalMs } = req.body || {};
  telemetrySimulator.start(engineIds, intervalMs);
  res.json({
    message: 'Simulation started',
    status: telemetrySimulator.getStatus()
  });
});

router.post('/simulation/stop', (req, res) => {
  telemetrySimulator.stop();
  res.json({
    message: 'Simulation paused',
    status: telemetrySimulator.getStatus()
  });
});

router.post('/simulation/reset', (req, res) => {
  telemetrySimulator.reset();
  res.json({
    message: 'Simulation and engine stores reset',
    status: telemetrySimulator.getStatus()
  });
});

router.get('/simulation/status', (req, res) => {
  res.json(telemetrySimulator.getStatus());
});

module.exports = router;
