import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import os

st.set_page_config(page_title="CMAPSS Explorer — EdgeRUL", page_icon="🔍", layout="wide")

st.title("🔍 NASA CMAPSS Dataset Explorer")
st.caption("Commercial Modular Aero-Propulsion System Simulation Telemetry")

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw"))

COLUMN_NAMES = [
    'engine_id', 'cycle',
    'os1', 'os2', 'os3',
    's1', 's2', 's3', 's4', 's5',
    's6', 's7', 's8', 's9', 's10',
    's11', 's12', 's13', 's14', 's15',
    's16', 's17', 's18', 's19', 's20', 's21'
]

dataset_choice = st.sidebar.selectbox("Dataset Subset", ["train_FD001.txt", "test_FD001.txt"])
file_path = os.path.join(DATA_DIR, dataset_choice)

if not os.path.exists(file_path):
    st.error(f"File {file_path} not found.")
    st.stop()

@st.cache_data
def load_data(path):
    return pd.read_csv(path, sep=r'\s+', header=None, names=COLUMN_NAMES)

df = load_data(file_path)

st.markdown(f"**Loaded {len(df):,} operational cycle records across {df['engine_id'].nunique()} turbofan engines.**")

tab1, tab2, tab3 = st.tabs(["Sensor Degradation Curves", "Correlation Heatmap", "Raw Data Table"])

with tab1:
    st.subheader("Sensor Time-Series Trajectory by Engine")
    col1, col2 = st.columns(2)
    with col1:
        eng_id = st.selectbox("Select Engine ID", sorted(df['engine_id'].unique()), index=0)
    with col2:
        sensor_choice = st.selectbox("Select Sensor Channel", ['s2 (LPC Temp)', 's3 (HPC Temp)', 's4 (LPT Temp)', 's7 (HPC Press)', 's8 (Fan Speed)', 's9 (Core Speed)', 's11 (Ps30 Static)', 's12 (Fuel Flow Ratio)', 's15 (Bypass Press)'], index=1)
    
    clean_sensor = sensor_choice.split()[0]
    eng_df = df[df['engine_id'] == eng_id]
    
    fig = px.line(
        eng_df,
        x='cycle',
        y=clean_sensor,
        title=f"Engine #{eng_id} — {sensor_choice} across {len(eng_df)} Flight Cycles",
        labels={'cycle': 'Flight Cycle Counter', clean_sensor: 'Sensor Measurement'}
    )
    fig.update_traces(line_color="#00f0ff", line_width=2.5)
    fig.update_layout(paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(13, 20, 36, 0.6)", font=dict(color="#f8fafc"))
    st.plotly_chart(fig, use_container_width=True)

with tab2:
    st.subheader("Multivariate Sensor Correlation Matrix")
    active_cols = ['s2', 's3', 's4', 's7', 's8', 's9', 's11', 's12', 's13', 's14', 's15', 's17', 's20', 's21']
    corr = df[active_cols].corr()
    fig_corr = px.imshow(
        corr,
        text_auto=".2f",
        aspect="auto",
        color_continuous_scale="RdBu_r",
        title="CMAPSS Sensor Inter-Correlation"
    )
    fig_corr.update_layout(paper_bgcolor="rgba(0,0,0,0)", font=dict(color="#f8fafc"), height=550)
    st.plotly_chart(fig_corr, use_container_width=True)

with tab3:
    st.subheader("Data Inspector")
    st.dataframe(df.head(100), use_container_width=True)
