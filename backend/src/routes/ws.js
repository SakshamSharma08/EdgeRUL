const WebSocket = require('ws');
const telemetrySimulator = require('../services/telemetrySimulator');
const alertEngine = require('../services/alertEngine');

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: '/ws/telemetry' });
  const clients = new Set();

  console.log('[WebSocket] Server initialized on /ws/telemetry');

  wss.on('connection', (ws, req) => {
    clients.add(ws);
    console.log(`[WebSocket] Client connected (Total active clients: ${clients.size})`);

    // Send initial status handshake
    ws.send(JSON.stringify({
      type: 'INIT_HANDSHAKE',
      system: 'EdgeRUL Edge-AI Predictive Maintenance Gateway',
      serverTime: Date.now(),
      simulation: telemetrySimulator.getStatus()
    }));

    ws.on('message', (message) => {
      try {
        const payload = JSON.parse(message);
        if (payload.action === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        } else if (payload.action === 'START_SIMULATION') {
          telemetrySimulator.start(payload.engineIds, payload.intervalMs);
        } else if (payload.action === 'STOP_SIMULATION') {
          telemetrySimulator.stop();
        } else if (payload.action === 'RESET_SIMULATION') {
          telemetrySimulator.reset();
        }
      } catch (err) {
        console.error('[WebSocket] Failed to parse client message:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`[WebSocket] Client disconnected (Total active clients: ${clients.size})`);
    });

    ws.on('error', (err) => {
      console.error('[WebSocket] Socket error:', err.message);
      clients.delete(ws);
    });
  });

  // Broadcast helper
  function broadcast(data) {
    const messageStr = JSON.stringify(data);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    }
  }

  // Subscribe to simulator ticks
  telemetrySimulator.onTick((tick, alert) => {
    broadcast(tick);
    if (alert) {
      broadcast({
        type: 'ALERT_EVENT',
        alert
      });
    }
  });

  // Subscribe to alert engine events
  alertEngine.onAlert((alert) => {
    broadcast({
      type: 'ALERT_EVENT',
      alert
    });
  });

  return { wss, broadcast };
}

module.exports = setupWebSocket;
