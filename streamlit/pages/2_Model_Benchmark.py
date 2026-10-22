import streamlit as st
import json
import os
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd

st.set_page_config(page_title="Model Benchmark — EdgeRUL", page_icon="📊", layout="wide")

st.title("📊 Model Benchmark & Edge Verification")
st.caption("Random Forest Baseline vs. XGBoost Regressor on NASA CMAPSS (FD001)")

BENCHMARK_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ml", "models", "benchmark_summary.json"))

if not os.path.exists(BENCHMARK_PATH):
    st.error(f"Benchmark summary not found at {BENCHMARK_PATH}. Run training pipeline first.")
    st.stop()

with open(BENCHMARK_PATH, "r") as f:
    data = json.load(f)

rf = data["metrics"]["random_forest"]
xgb = data["metrics"]["xgboost"]
edge = data["edge_benchmark"]
features = data["feature_importances"]
samples = data["test_engine_samples"]

# KPI Metrics
c1, c2, c3, c4 = st.columns(4)
with c1:
    st.metric("XGBoost RMSE", f"{xgb['rmse']}", delta=f"{rf['rmse'] - xgb['rmse']:.2f} better than RF")
with c2:
    st.metric("XGBoost MAE", f"{xgb['mae']}", delta=f"{rf['mae'] - xgb['mae']:.2f} better than RF")
with c3:
    st.metric("NASA Asymmetric Score", f"{xgb['nasa_score']}", delta=f"{rf['nasa_score'] - xgb['nasa_score']:.1f} penalty drop", delta_color="normal")
with c4:
    st.metric("ONNX Edge Latency (P50)", f"{edge['latency_ms']['p50']} ms", delta="Sub-millisecond")

st.markdown("---")

col_scatter, col_loss = st.columns(2)

with col_scatter:
    st.subheader("Predicted RUL vs. Ground Truth (Test Set)")
    df_samples = pd.DataFrame(samples)
    fig_scat = px.scatter(
        df_samples,
        x="true_rul",
        y="pred_rul",
        text="engine_id",
        labels={"true_rul": "Actual True RUL (Cycles)", "pred_rul": "Predicted RUL (Cycles)"},
        title="Parity Plot (FD001 Test Trajectories)"
    )
    # Ideal 1:1 line
    max_val = max(df_samples["true_rul"].max(), df_samples["pred_rul"].max()) + 10
    fig_scat.add_trace(go.Scatter(
        x=[0, max_val], y=[0, max_val],
        mode='lines', line=dict(dash='dash', color='#ef4444'), name='Ideal 1:1 Parity'
    ))
    fig_scat.update_traces(marker=dict(size=10, color='#00f0ff', line=dict(width=1, color='white')))
    fig_scat.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(13, 20, 36, 0.6)", font=dict(color="#f8fafc"))
    st.plotly_chart(fig_scat, use_container_width=True)

with col_loss:
    st.subheader("NASA Asymmetric PHM Scoring Function")
    st.markdown("""
    Standard metrics like MSE/MAE treat early and late predictions symmetrically. However, in aviation:
    - **Early prediction ($d < 0$):** Unnecessary early maintenance inspection (minor cost).
    - **Late prediction ($d > 0$):** Catastrophic in-flight failure (exponential hazard penalty).
    """)
    d_range = np.linspace(-30, 30, 200)
    score_curve = np.where(d_range < 0, np.exp(-d_range / 13.0) - 1.0, np.exp(d_range / 10.0) - 1.0)

    fig_loss = go.Figure()
    fig_loss.add_trace(go.Scatter(x=d_range, y=score_curve, mode='lines', name='NASA Score Penalty', line=dict(color='#f59e0b', width=3)))
    fig_loss.add_vline(x=0, line_dash="dash", line_color="#00f0ff")
    fig_loss.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(13, 20, 36, 0.6)",
        font=dict(color="#f8fafc"),
        xaxis_title="Error d = (Predicted RUL - True RUL)",
        yaxis_title="NASA Penalty Score",
        height=320
    )
    st.plotly_chart(fig_loss, use_container_width=True)

st.markdown("---")

st.subheader("Sensor Degradation Drivers (Feature Importances)")
df_feat = pd.DataFrame(list(features.items()), columns=["Sensor", "Importance"]).sort_values(by="Importance", ascending=True)
fig_feat = px.bar(
    df_feat,
    x="Importance",
    y="Sensor",
    orientation='h',
    title="XGBoost 30-Cycle Sliding Window Feature Weights",
    color="Importance",
    color_continuous_scale="Viridis"
)
fig_feat.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(13, 20, 36, 0.6)", font=dict(color="#f8fafc"), height=380)
st.plotly_chart(fig_feat, use_container_width=True)
