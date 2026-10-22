import streamlit as st
import requests
import plotly.graph_objects as go
import pandas as pd
import time

st.set_page_config(page_title="Live Engine Monitor — EdgeRUL", page_icon="📡", layout="wide")

st.title("📡 Live Turbofan Engine Health Monitor")
st.caption("Real-Time Telemetry Stream via Node.js Gateway & ONNX Runtime")

BACKEND_URL = "http://localhost:3001/api"

# Fetch active engines
try:
    res = requests.get(f"{BACKEND_URL}/engines", timeout=2).json()
    engines = res.get("engines", [])
except Exception:
    engines = []

if not engines:
    st.warning("No engines currently active in memory. Start the simulator below or stream from the React HUD.")

# Engine Selector
selected_id = st.sidebar.selectbox(
    "Select Engine ID",
    options=[1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    index=0
)

# Fetch detail
try:
    detail = requests.get(f"{BACKEND_URL}/engines/{selected_id}", timeout=2).json()
except Exception:
    detail = {
        "id": selected_id,
        "cycleCount": 1,
        "lastRul": 125,
        "healthIndex": 100,
        "status": "HEALTHY",
        "history": []
    }

rul = detail.get("lastRul", 125)
status = detail.get("status", "HEALTHY")
cycle = detail.get("cycleCount", 1)
health = detail.get("healthIndex", 100)
history = detail.get("history", [])

col_gauge, col_trend = st.columns([1, 2])

with col_gauge:
    st.subheader(f"Engine #{str(selected_id).zfill(3)} Remaining Useful Life")
    
    # Plotly Radial Gauge
    gauge_color = "#ef4444" if status == "CRITICAL" else "#f59e0b" if status == "WARNING" else "#10b981"
    
    fig = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=rul,
        domain={'x': [0, 1], 'y': [0, 1]},
        title={'text': "RUL (Operational Cycles)", 'font': {'size': 18, 'color': '#00f0ff'}},
        delta={'reference': 125, 'increasing': {'color': "#10b981"}, 'decreasing': {'color': "#ef4444"}},
        gauge={
            'axis': {'range': [0, 125], 'tickwidth': 1, 'tickcolor': "#94a3b8"},
            'bar': {'color': gauge_color},
            'bgcolor': "rgba(13, 20, 36, 0.8)",
            'borderwidth': 2,
            'bordercolor': "rgba(0, 240, 255, 0.4)",
            'steps': [
                {'range': [0, 30], 'color': "rgba(239, 68, 68, 0.25)"},
                {'range': [30, 65], 'color': "rgba(245, 158, 11, 0.25)"},
                {'range': [65, 95], 'color': "rgba(6, 182, 212, 0.2)"},
                {'range': [95, 125], 'color': "rgba(16, 185, 129, 0.2)"}
            ],
            'threshold': {
                'line': {'color': "red", 'width': 4},
                'thickness': 0.75,
                'value': 30
            }
        }
    ))
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        font={'color': "#f8fafc", 'family': "JetBrains Mono"},
        height=320,
        margin=dict(l=20, r=20, t=50, b=20)
    )
    st.plotly_chart(fig, use_container_width=True)

    st.markdown(f"""
    - **Current Cycle:** `#{cycle}`
    - **Health Degradation Index:** `{health}%`
    - **Aeronautical Status:** `:{'red' if status=='CRITICAL' else 'orange' if status=='WARNING' else 'green'}[{status}]`
    """)

with col_trend:
    st.subheader("Historical Degradation Trajectory")
    if history:
        df_hist = pd.DataFrame(history)
        fig_trend = go.Figure()
        fig_trend.add_trace(go.Scatter(
            x=df_hist['cycle'],
            y=df_hist['rul'],
            mode='lines+markers',
            name='Predicted RUL',
            line=dict(color='#00f0ff', width=3),
            marker=dict(size=4)
        ))
        fig_trend.add_hline(y=30, line_dash="dash", line_color="#ef4444", annotation_text="CRITICAL (30)", annotation_position="bottom right")
        fig_trend.add_hline(y=65, line_dash="dash", line_color="#f59e0b", annotation_text="WARNING (65)", annotation_position="bottom right")
        fig_trend.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(13, 20, 36, 0.5)",
            font={'color': "#94a3b8", 'family': "JetBrains Mono"},
            xaxis_title="Flight Cycle",
            yaxis_title="Remaining Useful Life (Cycles)",
            height=320,
            margin=dict(l=20, r=20, t=20, b=20)
        )
        st.plotly_chart(fig_trend, use_container_width=True)
    else:
        st.info("Start simulation playback to view the live time-series trajectory.")

st.markdown("---")

# Quick Simulation Controls from Streamlit
col_btn1, col_btn2, col_btn3 = st.columns(3)
with col_btn1:
    if st.button("▶️ Start Live Telemetry Stream", use_container_width=True):
        requests.post(f"{BACKEND_URL}/simulation/start", json={"intervalMs": 450})
        st.success("Simulation streaming!")
with col_btn2:
    if st.button("⏸️ Pause Telemetry Stream", use_container_width=True):
        requests.post(f"{BACKEND_URL}/simulation/stop")
        st.info("Simulation paused.")
with col_btn3:
    if st.button("🔄 Reset Cycles", use_container_width=True):
        requests.post(f"{BACKEND_URL}/simulation/reset")
        st.rerun()
