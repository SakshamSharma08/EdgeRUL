const config = require('../config');

class AlertEngine {
  constructor() {
    this.alerts = [];
    this.alertListeners = [];
    this.lastAlertState = new Map(); // engineId -> status
  }

  onAlert(listener) {
    this.alertListeners.push(listener);
  }

  checkAlerts(engineSnapshot) {
    const { id, cycleCount, lastRul, status } = engineSnapshot;
    const prevStatus = this.lastAlertState.get(id) || 'HEALTHY';
    let newAlert = null;

    if (status === 'CRITICAL' && prevStatus !== 'CRITICAL') {
      newAlert = {
        id: `alt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        engineId: id,
        severity: 'CRITICAL',
        code: 'AERO_CRITICAL_RUL_EXHAUSTION',
        title: `CRITICAL: Engine #${id} Near End-of-Life`,
        message: `Estimated Remaining Useful Life is ${lastRul} cycles (<= ${config.THRESHOLDS.CRITICAL}). Risk of High-Pressure Compressor (HPC) stall/failure. Ground aircraft immediately for maintenance depot dispatch.`,
        cycle: cycleCount,
        rul: lastRul,
        timestamp: Date.now()
      };
    } else if (status === 'WARNING' && prevStatus !== 'WARNING' && prevStatus !== 'CRITICAL') {
      newAlert = {
        id: `alt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        engineId: id,
        severity: 'WARNING',
        code: 'AERO_DEGRADATION_THRESHOLD',
        title: `WARNING: Accelerated Wear on Engine #${id}`,
        message: `Estimated RUL dropped to ${lastRul} cycles. Sensor thermal drift detected across HPC and combustor channels. Schedule priority shop-visit within 30 flight cycles.`,
        cycle: cycleCount,
        rul: lastRul,
        timestamp: Date.now()
      };
    } else if (status === 'CAUTION' && prevStatus === 'HEALTHY') {
      newAlert = {
        id: `alt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        engineId: id,
        severity: 'CAUTION',
        code: 'AERO_EARLY_DRIFT',
        title: `ADVISORY: Engine #${id} Initial Degradation`,
        message: `Sensor variance indicates transition from baseline healthy regime into wear trajectory (RUL: ${lastRul} cycles).`,
        cycle: cycleCount,
        rul: lastRul,
        timestamp: Date.now()
      };
    }

    this.lastAlertState.set(id, status);

    if (newAlert) {
      this.alerts.unshift(newAlert);
      if (this.alerts.length > 50) this.alerts.pop();
      // Notify listeners
      for (const cb of this.alertListeners) {
        cb(newAlert);
      }
    }

    return newAlert;
  }

  getRecentAlerts(limit = 20) {
    return this.alerts.slice(0, limit);
  }

  clearAlerts() {
    this.alerts = [];
    this.lastAlertState.clear();
  }
}

module.exports = new AlertEngine();
