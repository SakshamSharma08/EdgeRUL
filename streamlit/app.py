import streamlit as st
import requests
import json
import os

st.set_page_config(
    page_title="EdgeRUL — Edge-AI Turbofan Health Monitor",
    page_icon="✈️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Cyber-Avionics CSS
st.markdown("""
<style>
    .main {
        background-color: #060913;
        color: #f8fafc;
    }
    .metric-card {
        background: rgba(13, 20, 36, 0.75);
        border: 1px solid rgba(0, 240, 255, 0.25);
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    .metric-val {
        font-family: 'JetBrains Mono', monospace;
        font-size: 28px;
        font-weight: 700;
        color: #00f0ff;
    }
    .metric-sub {
        font-size: 12px;
        color: #94a3b8;
    }
</style>
""", unsafe_allow_html=True)

st.title("✈️ EdgeRUL: Edge-AI Aircraft Engine RUL Gateway")
st.caption("Tata Technologies InnoVent-27 Hackathon · Real-Time Edge Inference on NASA CMAPSS")

# Backend Health Status
BACKEND_URL = "http://localhost:3001/api"

try:
    health_res = requests.get(f"{BACKEND_URL}/health", timeout=2).json()
    is_online = health_res.get("status") == "ONLINE"
    edge_metrics = health_res.get("edgeMetrics", {})
    sim_status = health_res.get("simulation", {})
except Exception:
    is_online = False
    edge_metrics = {}
    sim_status = {}

col1, col2, col3, col4 = st.columns(4)

with col1:
    st.markdown("""
    <div class="metric-card">
        <div class="metric-sub">GATEWAY STATUS</div>
        <div class="metric-val" style="color: {};">{}</div>
    </div>
    """.format("#10b981" if is_online else "#ef4444", "ONLINE (Edge)" if is_online else "OFFLINE"), unsafe_allow_html=True)

with col2:
    p50_lat = edge_metrics.get("lastLatencyMs", 0.02)
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-sub">ONNX EDGE LATENCY</div>
        <div class="metric-val">{p50_lat:.3f} ms</div>
    </div>
    """, unsafe_allow_html=True)

with col3:
    total_inf = edge_metrics.get("totalInferences", 0)
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-sub">INFERENCES EXECUTED</div>
        <div class="metric-val">{total_inf:,}</div>
    </div>
    """, unsafe_allow_html=True)

with col4:
    active_eng = len(sim_status.get("activeEngineIds", []))
    st.markdown(f"""
    <div class="metric-card">
        <div class="metric-sub">ACTIVE TELEMETRY FLEET</div>
        <div class="metric-val">{active_eng} Turbofans</div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("---")

st.subheader("System Architecture")
st.markdown("""
- **Dataset:** NASA CMAPSS Turbofan Engine Degradation Simulation (FD001 / FD002)
- **Model:** Gradient-Boosted Trees (XGBoost Regressor) trained over 30-cycle sliding windows (560 features)
- **Edge Conversion:** Serialized to **ONNX Graph (OpSet 12)**; executed via **ONNX Runtime Node.js C++ bindings**
- **Dashboard Interfaces:**
  1. **React / Vite HUD:** High-precision avionics UI with live interactive turbofan cross-section schematic and WebSocket stream
  2. **Streamlit Analytics:** Multi-page ML engineering suite for telemetry exploration, model benchmarks, and residual inspection
""")

st.info("👈 Select a page from the sidebar to inspect the **Live Engine Monitor**, **Model Benchmarks**, or the **NASA CMAPSS Data Explorer**.")
