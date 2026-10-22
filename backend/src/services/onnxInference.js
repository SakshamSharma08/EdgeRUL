const ort = require('onnxruntime-node');
const fs = require('fs');
const config = require('../config');

class ONNXInferenceService {
  constructor() {
    this.session = null;
    this.inputName = null;
    this.outputName = null;
    this.isReady = false;
    this.metrics = {
      totalInferences: 0,
      totalLatencyMs: 0,
      minLatencyMs: Infinity,
      maxLatencyMs: 0,
      lastLatencyMs: 0
    };
  }

  async init() {
    if (!fs.existsSync(config.ONNX_MODEL_PATH)) {
      throw new Error(`ONNX model not found at: ${config.ONNX_MODEL_PATH}`);
    }

    // Configure CPU session with single-threaded or auto thread settings for edge efficiency
    const sessionOptions = {
      executionProviders: ['cpu'],
      graphOptimizationLevel: 'all'
    };

    console.log(`[ONNX] Initializing Edge Runtime from: ${config.ONNX_MODEL_PATH}`);
    this.session = await ort.InferenceSession.create(config.ONNX_MODEL_PATH, sessionOptions);
    this.inputName = this.session.inputNames[0];
    this.outputName = this.session.outputNames[0];
    this.isReady = true;

    // Warm-up inference
    const warmupInput = new Float32Array(config.TOTAL_DIMENSIONS).fill(0.5);
    await this.predict(warmupInput);
    console.log(`[ONNX] Engine Edge Model Ready! Input: "${this.inputName}" [1, ${config.TOTAL_DIMENSIONS}], Output: "${this.outputName}"`);
  }

  async predict(featureVector560) {
    if (!this.isReady) {
      throw new Error('ONNX Inference session is not initialized.');
    }

    if (featureVector560.length !== config.TOTAL_DIMENSIONS) {
      throw new Error(`Expected feature vector of length ${config.TOTAL_DIMENSIONS}, got ${featureVector560.length}`);
    }

    const tensor = new ort.Tensor('float32', Float32Array.from(featureVector560), [1, config.TOTAL_DIMENSIONS]);
    const feeds = { [this.inputName]: tensor };

    const tStart = performance.now();
    const results = await this.session.run(feeds);
    const latency = performance.now() - tStart;

    const rawPrediction = results[this.outputName].data[0];
    const predictedRul = Math.max(0, Math.min(125, rawPrediction));

    // Update runtime metrics
    this.metrics.totalInferences++;
    this.metrics.totalLatencyMs += latency;
    this.metrics.lastLatencyMs = latency;
    if (latency < this.metrics.minLatencyMs) this.metrics.minLatencyMs = latency;
    if (latency > this.metrics.maxLatencyMs) this.metrics.maxLatencyMs = latency;

    return {
      rul: Math.round(predictedRul * 10) / 10,
      rawRul: rawPrediction,
      latencyMs: Math.round(latency * 1000) / 1000 // in ms with 3 decimal precision
    };
  }

  getMetrics() {
    return {
      ...this.metrics,
      avgLatencyMs: this.metrics.totalInferences > 0
        ? Math.round((this.metrics.totalLatencyMs / this.metrics.totalInferences) * 1000) / 1000
        : 0
    };
  }
}

module.exports = new ONNXInferenceService();
