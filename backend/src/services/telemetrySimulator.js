const fs = require('fs');
const path = require('path');
const readline = require('readline');
const config = require('../config');
const engineStore = require('./engineStore');
const onnxInference = require('./onnxInference');
const alertEngine = require('./alertEngine');

class TelemetrySimulator {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.playbackIntervalMs = 450; // default interval per cycle
    this.currentDataset = 'test_FD001.txt';
    this.activeEngineIds = [1, 2, 3, 4]; // default fleet
    this.engineStreams = new Map(); // engineId -> { rows: [], currentIndex: 0 }
    this.tickListeners = [];
    this.isLoaded = false;
  }

  onTick(listener) {
    this.tickListeners.push(listener);
  }

  loadDataset(filename = 'test_FD001.txt') {
    const filePath = path.join(config.RAW_DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`[Simulator] Dataset file not found: ${filePath}`);
      return false;
    }

    console.log(`[Simulator] Parsing CMAPSS file: ${filePath}`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.trim().split('\n');

    this.engineStreams.clear();

    for (const line of lines) {
      if (!line.trim()) continue;
      const parts = line.trim().split(/\s+/).map(Number);
      const engineId = parts[0];
      const cycle = parts[1];
      const os1 = parts[2];
      const os2 = parts[3];
      const os3 = parts[4];
      const sensors = parts.slice(5); // 21 sensors

      // Build 16 active features
      // ACTIVE_FEATURES: ['os1', 'os2', 's2', 's3', 's4', 's7', 's8', 's9', 's11', 's12', 's13', 's14', 's15', 's17', 's20', 's21']
      // Sensor indices in CMAPSS (1-based: s1 is parts[5], s2 is parts[6], etc.)
      const activeObj = {
        os1,
        os2,
        s2: sensors[1],  // s2
        s3: sensors[2],  // s3
        s4: sensors[3],  // s4
        s7: sensors[6],  // s7
        s8: sensors[7],  // s8
        s9: sensors[8],  // s9
        s11: sensors[10], // s11
        s12: sensors[11], // s12
        s13: sensors[12], // s13
        s14: sensors[13], // s14
        s15: sensors[14], // s15
        s17: sensors[16], // s17
        s20: sensors[19], // s20
        s21: sensors[20]  // s21
      };

      if (!this.engineStreams.has(engineId)) {
        this.engineStreams.set(engineId, {
          rows: [],
          currentIndex: 0
        });
      }

      this.engineStreams.get(engineId).rows.push({
        cycle,
        activeObj
      });
    }

    console.log(`[Simulator] Successfully indexed ${this.engineStreams.size} engines from ${filename}`);
    this.isLoaded = true;
    return true;
  }

  async stepEngine(engineId) {
    const stream = this.engineStreams.get(engineId);
    if (!stream || stream.currentIndex >= stream.rows.length) {
      // Loop or restart engine stream if reached end
      if (stream) stream.currentIndex = 0;
      return null;
    }

    const { cycle, activeObj } = stream.rows[stream.currentIndex];
    stream.currentIndex++;

    // 1. Push into sliding window store
    engineStore.pushReading(engineId, activeObj, cycle);

    // 2. Extract feature vector and run inference
    const featureVector = engineStore.extractFeatureVector(engineId);
    const { rul, latencyMs } = await onnxInference.predict(featureVector);

    // 3. Update engine in-memory status
    const updatedEngine = engineStore.updateEnginePrediction(engineId, rul, latencyMs);

    // 4. Check alerts
    const alert = alertEngine.checkAlerts(updatedEngine);

    // 5. Construct broadcast tick
    const tick = {
      type: 'TELEMETRY_TICK',
      engineId,
      cycle,
      rul,
      healthIndex: updatedEngine.healthIndex,
      status: updatedEngine.status,
      latencyMs,
      sensors: activeObj,
      timestamp: Date.now(),
      progressPercent: Math.round((stream.currentIndex / stream.rows.length) * 100),
      isWindowReady: engineStore.isWindowReady(engineId)
    };

    // Notify listeners
    for (const listener of this.tickListeners) {
      listener(tick, alert);
    }

    return tick;
  }

  start(engineIds = null, intervalMs = 450) {
    if (!this.isLoaded) {
      this.loadDataset('test_FD001.txt');
    }

    if (engineIds && Array.isArray(engineIds) && engineIds.length > 0) {
      this.activeEngineIds = engineIds;
    }
    this.playbackIntervalMs = intervalMs;

    if (this.isRunning) {
      clearInterval(this.intervalId);
    }

    this.isRunning = true;
    console.log(`[Simulator] Starting telemetry stream for engines [${this.activeEngineIds.join(', ')}] at ${intervalMs}ms interval`);

    this.intervalId = setInterval(async () => {
      for (const engineId of this.activeEngineIds) {
        try {
          await this.stepEngine(engineId);
        } catch (err) {
          console.error(`[Simulator] Error stepping engine ${engineId}:`, err);
        }
      }
    }, this.playbackIntervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[Simulator] Telemetry stream stopped.');
  }

  reset() {
    this.stop();
    for (const stream of this.engineStreams.values()) {
      stream.currentIndex = 0;
    }
    engineStore.resetAll();
    alertEngine.clearAlerts();
    console.log('[Simulator] Simulation state reset.');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      playbackIntervalMs: this.playbackIntervalMs,
      activeEngineIds: this.activeEngineIds,
      totalEnginesLoaded: this.engineStreams.size,
      currentDataset: this.currentDataset
    };
  }
}

module.exports = new TelemetrySimulator();
