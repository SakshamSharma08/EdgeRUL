const ort = require('onnxruntime-node');
const path = require('path');

async function test() {
  const modelPath = path.join(__dirname, 'models', 'rul_xgboost.onnx');
  console.log('Loading ONNX model from:', modelPath);
  const session = await ort.InferenceSession.create(modelPath);
  console.log('Session initialized. Inputs:', session.inputNames, 'Outputs:', session.outputNames);

  // 560 dummy float features
  const testData = new Float32Array(560).fill(0.5);
  const tensor = new ort.Tensor('float32', testData, [1, 560]);
  const feeds = { [session.inputNames[0]]: tensor };

  const start = performance.now();
  const results = await session.run(feeds);
  const latency = (performance.now() - start).toFixed(2);

  const outputName = session.outputNames[0];
  const rulPrediction = results[outputName].data[0];
  console.log(`Inference result: RUL = ${rulPrediction.toFixed(2)} cycles | Latency = ${latency} ms`);
}

test().catch(err => {
  console.error('ORT test failed:', err);
  process.exit(1);
});
