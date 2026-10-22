const fs = require('fs');
const config = require('../config');

// Precomputed constants for 30-step linear slope calculation
const WINDOW_SIZE = config.WINDOW_SIZE; // 30
const T_INDICES = Array.from({ length: WINDOW_SIZE }, (_, i) => i);
const T_MEAN = 14.5;
const S_TT = 2247.5; // sum((t - 14.5)^2 for t in 0..29)

class EngineStore {
  constructor() {
    this.engines = new Map();
    this.scalerParams = null;
    this.loadScalerParams();
  }

  loadScalerParams() {
    if (fs.existsSync(config.SCALER_PARAMS_PATH)) {
      const data = JSON.parse(fs.readFileSync(config.SCALER_PARAMS_PATH, 'utf-8'));
      this.scalerParams = data.scaler_params;
      console.log('[EngineStore] Loaded MinMaxScaler parameters for', Object.keys(this.scalerParams).length, 'features');
    } else {
      console.warn('[EngineStore] Warning: scaler_params.json not found at', config.SCALER_PARAMS_PATH);
    }
  }

  normalizeReading(rawValues) {
    // rawValues: object with keys e.g. { os1, os2, s2, s3, ... } or array in order of ACTIVE_FEATURES
    const normalized = [];
    for (let i = 0; i < config.ACTIVE_FEATURES.length; i++) {
      const featName = config.ACTIVE_FEATURES[i];
      const val = Array.isArray(rawValues) ? rawValues[i] : (rawValues[featName] ?? 0);
      if (this.scalerParams && this.scalerParams[featName]) {
        const { min, scale } = this.scalerParams[featName];
        // MinMaxScaler transform: (val - min) * scale
        const normVal = (val - min) * scale;
        normalized.push(normVal);
      } else {
        normalized.push(val);
      }
    }
    return normalized;
  }

  getEngine(engineId) {
    const id = String(engineId);
    if (!this.engines.has(id)) {
      this.engines.set(id, {
        id,
        cycleCount: 0,
        buffer: [], // rolling array of up to 30 normalized [16] readings
        rawBuffer: [], // rolling array of up to 30 raw [16] readings for UI
        lastRul: 125,
        healthIndex: 100, // 0 - 100%
        status: 'HEALTHY', // 'HEALTHY' | 'CAUTION' | 'WARNING' | 'CRITICAL'
        history: [], // recent history of { cycle, rul, healthIndex, status, timestamp }
        lastUpdate: Date.now()
      });
    }
    return this.engines.get(id);
  }

  pushReading(engineId, rawFeatures, cycleNumber = null) {
    const engine = this.getEngine(engineId);
    const normalized = this.normalizeReading(rawFeatures);

    engine.cycleCount = cycleNumber !== null ? cycleNumber : engine.cycleCount + 1;
    engine.buffer.push(normalized);
    engine.rawBuffer.push(Array.isArray(rawFeatures) ? rawFeatures : config.ACTIVE_FEATURES.map(f => rawFeatures[f]));

    if (engine.buffer.length > WINDOW_SIZE) {
      engine.buffer.shift();
      engine.rawBuffer.shift();
    }
    engine.lastUpdate = Date.now();

    return engine;
  }

  isWindowReady(engineId) {
    const engine = this.getEngine(engineId);
    return engine.buffer.length >= WINDOW_SIZE;
  }

  extractFeatureVector(engineId) {
    const engine = this.getEngine(engineId);
    let windowData = engine.buffer;

    // Pad if buffer is not full yet (warm-up phase)
    if (windowData.length < WINDOW_SIZE) {
      const padCount = WINDOW_SIZE - windowData.length;
      const padRow = windowData.length > 0 ? windowData[0] : new Array(config.NUM_FEATURES).fill(0.5);
      const padding = Array.from({ length: padCount }, () => padRow);
      windowData = [...padding, ...windowData];
    }

    // 1. Flattened sequence (30 * 16 = 480 floats)
    const flatSeq = [];
    for (let r = 0; r < WINDOW_SIZE; r++) {
      for (let c = 0; c < config.NUM_FEATURES; c++) {
        flatSeq.push(windowData[r][c]);
      }
    }

    // 2. Statistical features per sensor (16 * 5 = 80 floats: mean, std, min, max, slope)
    const statFeats = [];
    for (let c = 0; c < config.NUM_FEATURES; c++) {
      let sum = 0;
      let minVal = Infinity;
      let maxVal = -Infinity;

      for (let r = 0; r < WINDOW_SIZE; r++) {
        const val = windowData[r][c];
        sum += val;
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }

      const meanVal = sum / WINDOW_SIZE;

      let varSum = 0;
      let slopeNumerator = 0;
      for (let r = 0; r < WINDOW_SIZE; r++) {
        const diffY = windowData[r][c] - meanVal;
        varSum += diffY * diffY;
        const diffT = T_INDICES[r] - T_MEAN;
        slopeNumerator += diffT * diffY;
      }

      const stdVal = Math.sqrt(varSum / WINDOW_SIZE);
      const slopeVal = slopeNumerator / S_TT;

      statFeats.push(meanVal, stdVal, minVal, maxVal, slopeVal);
    }

    return new Float32Array([...flatSeq, ...statFeats]);
  }

  updateEnginePrediction(engineId, rul, latencyMs) {
    const engine = this.getEngine(engineId);
    engine.lastRul = rul;
    engine.healthIndex = Math.max(0, Math.min(100, Math.round((rul / 125) * 100)));

    if (rul <= config.THRESHOLDS.CRITICAL) {
      engine.status = 'CRITICAL';
    } else if (rul <= config.THRESHOLDS.WARNING) {
      engine.status = 'WARNING';
    } else if (rul <= config.THRESHOLDS.CAUTION) {
      engine.status = 'CAUTION';
    } else {
      engine.status = 'HEALTHY';
    }

    const snapshot = {
      cycle: engine.cycleCount,
      rul,
      healthIndex: engine.healthIndex,
      status: engine.status,
      latencyMs,
      timestamp: Date.now()
    };

    engine.history.push(snapshot);
    if (engine.history.length > 150) {
      engine.history.shift();
    }

    return engine;
  }

  getAllEngines() {
    return Array.from(this.engines.values()).map(e => ({
      id: e.id,
      cycleCount: e.cycleCount,
      lastRul: e.lastRul,
      healthIndex: e.healthIndex,
      status: e.status,
      lastUpdate: e.lastUpdate,
      windowProgress: Math.min(100, Math.round((e.buffer.length / WINDOW_SIZE) * 100)),
      historyCount: e.history.length
    }));
  }

  getEngineDetail(engineId) {
    const engine = this.getEngine(engineId);
    const lastReadingRaw = engine.rawBuffer.length > 0 ? engine.rawBuffer[engine.rawBuffer.length - 1] : null;
    const sensorMap = {};
    if (lastReadingRaw) {
      config.ACTIVE_FEATURES.forEach((f, idx) => {
        sensorMap[f] = {
          value: lastReadingRaw[idx],
          meta: config.SENSOR_METADATA[f]
        };
      });
    }

    return {
      id: engine.id,
      cycleCount: engine.cycleCount,
      lastRul: engine.lastRul,
      healthIndex: engine.healthIndex,
      status: engine.status,
      history: engine.history,
      recentRawReadings: engine.rawBuffer.slice(-10),
      currentSensors: sensorMap,
      windowReady: engine.buffer.length >= WINDOW_SIZE,
      windowFill: engine.buffer.length
    };
  }

  resetAll() {
    this.engines.clear();
  }
}

module.exports = new EngineStore();
