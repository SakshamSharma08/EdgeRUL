const http = require('http');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const config = require('./config');
const apiRoutes = require('./routes/api');
const setupWebSocket = require('./routes/ws');
const onnxInference = require('./services/onnxInference');
const telemetrySimulator = require('./services/telemetrySimulator');

dotenv.config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Mount REST API
app.use('/api', apiRoutes);

// Serve static frontend build if available (production deployment)
const path = require('path');
const fs = require('fs');
const frontendDist = path.resolve(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  // Root greeting
  app.get('/', (req, res) => {
    res.json({
      project: 'EdgeRUL — Edge-AI Aircraft Engine RUL Prediction',
      hackathon: 'Tata Technologies InnoVent-27',
      status: 'SYSTEM_OPERATIONAL',
      endpoints: {
        health: '/api/health',
        benchmark: '/api/benchmark',
        engines: '/api/engines',
        alerts: '/api/alerts',
        sensorsMeta: '/api/sensors/meta',
        websocket: 'ws://localhost:' + config.PORT + '/ws/telemetry'
      }
    });
  });
}

const server = http.createServer(app);

// Initialize WebSocket
setupWebSocket(server);

// Boot sequence
async function startServer() {
  try {
    console.log('====================================================');
    console.log('    EdgeRUL: Edge-AI Turbofan RUL Prediction Gateway ');
    console.log('    Tata Technologies InnoVent-27 Hackathon          ');
    console.log('====================================================');

    // 1. Initialize ONNX runtime model
    await onnxInference.init();

    // 2. Pre-load CMAPSS test dataset into simulator
    telemetrySimulator.loadDataset('test_FD001.txt');

    // 3. Start listening
    server.listen(config.PORT, () => {
      console.log(`[HTTP] Gateway listening at http://localhost:${config.PORT}`);
      console.log(`[WS]   Live stream ready at ws://localhost:${config.PORT}/ws/telemetry`);
      console.log('====================================================');
    });
  } catch (err) {
    console.error('[FATAL] Failed to initialize EdgeRUL Gateway:', err);
    process.exit(1);
  }
}

startServer();
