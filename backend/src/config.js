const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3001,
  ONNX_MODEL_PATH: path.join(__dirname, '..', 'models', 'rul_xgboost.onnx'),
  SCALER_PARAMS_PATH: path.join(__dirname, '..', 'models', 'scaler_params.json'),
  BENCHMARK_PATH: path.join(__dirname, '..', 'models', 'benchmark_summary.json'),
  RAW_DATA_DIR: path.join(__dirname, '..', '..', 'data', 'raw'),

  WINDOW_SIZE: 30,
  NUM_FEATURES: 16,
  TOTAL_DIMENSIONS: 560, // 30 * 16 + 16 * 5

  ACTIVE_FEATURES: [
    'os1', 'os2',
    's2', 's3', 's4', 's7', 's8', 's9',
    's11', 's12', 's13', 's14', 's15', 's17', 's20', 's21'
  ],

  // Sensor human-readable metadata for rich avionics UI
  SENSOR_METADATA: {
    os1: { name: 'Altitude / TRA', unit: 'kft', desc: 'Throttle Resolver Angle' },
    os2: { name: 'Mach Number', unit: 'Mach', desc: 'Flight Mach Number' },
    s2: { name: 'Total Temp LPC Outlet', unit: '°R', desc: 'Low Pressure Compressor Temp' },
    s3: { name: 'Total Temp HPC Outlet', unit: '°R', desc: 'High Pressure Compressor Outlet Temp' },
    s4: { name: 'Total Temp LPT Outlet', unit: '°R', desc: 'Low Pressure Turbine Outlet Temp' },
    s7: { name: 'Total Press HPC Outlet', unit: 'psia', desc: 'Combustor Inlet Total Pressure' },
    s8: { name: 'Physical Fan Speed', unit: 'rpm', desc: 'Fan Rotational Velocity' },
    s9: { name: 'Physical Core Speed', unit: 'rpm', desc: 'Core Shaft Rotational Velocity' },
    s11: { name: 'Static Press HPC Outlet', unit: 'psia', desc: 'Diffuser Static Pressure' },
    s12: { name: 'Fuel Flow Ratio (Ps30)', unit: 'pps/psi', desc: 'Burner Fuel-to-Pressure Ratio' },
    s13: { name: 'Corrected Fan Speed', unit: 'rpm', desc: 'Standardized N1 Fan Speed' },
    s14: { name: 'Corrected Core Speed', unit: 'rpm', desc: 'Standardized N2 Core Speed' },
    s15: { name: 'Bypass Duct Static Press', unit: 'psia', desc: 'Bypass Stream Static Pressure' },
    s17: { name: 'Bleed Enthalpy', unit: 'BTU/lbm', desc: 'HPC Bleed Work Enthalpy' },
    s20: { name: 'HPT Coolant Bleed', unit: 'lbm/s', desc: 'High Pressure Turbine Cooling Bleed' },
    s21: { name: 'LPT Coolant Bleed', unit: 'lbm/s', desc: 'Low Pressure Turbine Cooling Bleed' }
  },

  THRESHOLDS: {
    CRITICAL: 30, // cycles until failure
    WARNING: 65,
    CAUTION: 95
  }
};
