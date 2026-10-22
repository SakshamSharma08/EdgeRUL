# EdgeRUL: Edge-AI Aircraft Engine Remaining Useful Life (RUL) Prediction System
> **Tata Technologies InnoVent-27 Hackathon Project**  
> *Low-Latency Edge Inference, Time-Series Feature Engineering, and Real-Time Aeronautical Telemetry Monitoring on NASA C-MAPSS*

---

## 🚀 Key Highlights & Differentiators

- **Dataset:** Real NASA C-MAPSS Turbofan Engine Simulator Benchmark (FD001 & FD002 run-to-failure trajectories).
- **Time-Series Sliding-Window Pipeline:** 30 operational cycles sliding window with 16 active sensors + 5 engineered statistical features (`mean`, `std`, `min`, `max`, `linear regression slope`) yielding a rich **560-dimensional temporal embedding** per cycle.
- **Model Benchmark & Metric Superiority:**
  - **Random Forest Baseline:** RMSE: 14.28 | MAE: 10.10 | NASA Asymmetric Score: 324.64
  - **XGBoost Regressor (Winning Model):** **RMSE: 13.43 | MAE: 9.95 | NASA Score: 268.18**
  - **17.4% Reduction in NASA Hazard Score:** Heavily penalizes dangerous late predictions over early scheduled checks.
- **Sub-Millisecond Edge Deployment:**
  - Exported to **ONNX Graph (OpSet 12)** (`rul_xgboost.onnx`, 422.7 KB).
  - Native edge execution via **Node.js C++ ONNX Runtime bindings (`onnxruntime-node`)**.
  - **P50 Edge Latency: ~0.01ms - 0.7ms**, enabling 20,000+ inferences/second on low-power edge gateways without Python runtime overhead.
- **Avionics Cyber-HUD (React + Vite):**
  - **Dynamic Turbofan Cross-Section:** Animated twin-spool engine schematic with spinning wide-chord fan blades and live thermal/pressure heatmaps mapped to High-Pressure Compressor (HPC) wear.
  - **Avionics Radial RUL Gauge:** Dual-arc HUD dial with remaining flight cycles, estimated flight hours, and health degradation index.
  - **Real-Time Oscilloscope:** Multi-channel synchronous sensor waveforms and RUL degradation curves.
  - **Live WebSocket Fleet Telemetry Stream:** Concurrently streams 4+ turbofans with interactive playback speeds (1x, 2x, 5x) and an **"Inject HPC Anomaly"** trigger.
- **Streamlit Analytics Suite:**
  - Multi-page application with Live Engine Monitor, Model Parity Scatter Plots, NASA Asymmetric Loss Visualizer, and CMAPSS Multivariate Sensor Correlation Matrix.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Edge-AI & ML** | Python 3.14, XGBoost 3.4, Scikit-Learn, ONNX 1.23, ONNX Runtime, ONNXMLTools |
| **Edge Gateway Backend** | Node.js v26, Express, `onnxruntime-node`, WebSocket (`ws`), CORS |
| **Avionics Cockpit Frontend**| React 19, Vite, Recharts, Lucide-React, Pure Vanilla CSS Design System |
| **Data Analytics Suite** | Streamlit, Plotly, Pandas, NumPy |

---

## 🏃 Running the Project

### 1. Edge Gateway Backend
```bash
cd backend
npm install
node src/index.js
```
*Listens on `http://localhost:3001` (REST) & `ws://localhost:3001/ws/telemetry` (WebSocket)*

### 2. React Cockpit HUD Frontend
```bash
cd frontend
npm install
npm run dev
```
*Accessible at `http://localhost:5173`*

### 3. Streamlit Analytics Suite
```bash
py -m streamlit run streamlit/app.py --server.port 8501
```
*Accessible at `http://localhost:8501`*

---

## 🎯 Hackathon Presentation Flow

1. Open **React Cockpit HUD** (`http://localhost:5173`).
2. Point out the **Turbofan Cross-Section Blueprint** and explain the High-Pressure Compressor (HPC) degradation model.
3. Click **"Stream Live Telemetry"** — observe real-time sensor cycles incrementing and the Radial RUL Gauge dynamically reacting.
4. Click **"Inject HPC Anomaly"** — demonstrate immediate real-time wear detection, alert banner dispatch, and audio-visual warning.
5. Click **"Benchmark Deck"** in the top navbar to reveal the verified Random Forest vs. XGBoost NASA score breakdown and sub-millisecond ONNX latency.
6. Switch to the **Streamlit Suite** (`http://localhost:8501`) to show the NASA asymmetric loss curve and multivariate correlation heatmaps.
