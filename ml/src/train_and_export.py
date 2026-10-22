import os
import sys
import json
import time
import shutil
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor
import onnxruntime as ort
import onnxmltools
from onnxmltools.convert.common.data_types import FloatTensorType

# Add current dir to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from data_loader import load_cmapss_data, ACTIVE_FEATURES_FD001
from preprocessing import CMAPSSPreprocessor
from feature_engineering import build_training_windows, build_test_windows
from metrics import evaluate_predictions

def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    raw_data_dir = os.path.join(base_dir, "data", "raw")
    ml_models_dir = os.path.join(base_dir, "ml", "models")
    backend_models_dir = os.path.join(base_dir, "backend", "models")
    os.makedirs(ml_models_dir, exist_ok=True)
    os.makedirs(backend_models_dir, exist_ok=True)

    print(">>> [1/7] Ingesting NASA CMAPSS FD001 Dataset...")
    train_df, test_df, rul_true_df = load_cmapss_data(raw_data_dir, "FD001")
    print(f"    Train shape: {train_df.shape}, Test shape: {test_df.shape}")

    print(">>> [2/7] Preprocessing & Normalization (MinMaxScaler)...")
    preprocessor = CMAPSSPreprocessor(feature_cols=ACTIVE_FEATURES_FD001)
    scaled_train_df = preprocessor.fit_transform_train(train_df)
    scaled_test_df = preprocessor.transform_test(test_df)

    scaler_pkl_path = os.path.join(ml_models_dir, "scaler.pkl")
    scaler_json_path = os.path.join(ml_models_dir, "scaler_params.json")
    preprocessor.save(scaler_pkl_path, scaler_json_path)
    shutil.copyfile(scaler_json_path, os.path.join(backend_models_dir, "scaler_params.json"))
    print(f"    Exported scaler params to {scaler_json_path}")

    print(">>> [3/7] Generating 30-Cycle Sliding Window Features (560-dims)...")
    X_train, y_train = build_training_windows(scaled_train_df, ACTIVE_FEATURES_FD001, window_size=30)
    X_test, y_test = build_test_windows(scaled_test_df, rul_true_df, ACTIVE_FEATURES_FD001, window_size=30)
    print(f"    X_train: {X_train.shape}, y_train: {y_train.shape}")
    print(f"    X_test:  {X_test.shape}, y_test:  {y_test.shape}")

    print(">>> [4/7] Benchmarking Models: Random Forest vs XGBoost...")
    # 1. Random Forest Baseline
    print("    Training Random Forest Baseline...")
    rf_model = RandomForestRegressor(
        n_estimators=120,
        max_depth=14,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)
    rf_preds = rf_model.predict(X_test)
    rf_metrics = evaluate_predictions(y_test, rf_preds)
    print(f"    Random Forest -> RMSE: {rf_metrics['rmse']}, MAE: {rf_metrics['mae']}, NASA Score: {rf_metrics['nasa_score']}")

    # 2. XGBoost Regressor
    print("    Training XGBoost Regressor...")
    xgb_model = XGBRegressor(
        n_estimators=220,
        max_depth=5,
        learning_rate=0.045,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_alpha=0.2,
        reg_lambda=1.2,
        random_state=42,
        n_jobs=-1
    )
    xgb_model.fit(X_train, y_train)
    xgb_preds = xgb_model.predict(X_test)
    xgb_metrics = evaluate_predictions(y_test, xgb_preds)
    print(f"    XGBoost       -> RMSE: {xgb_metrics['rmse']}, MAE: {xgb_metrics['mae']}, NASA Score: {xgb_metrics['nasa_score']}")

    # Save models
    joblib.dump(rf_model, os.path.join(ml_models_dir, "rf_baseline.pkl"))
    joblib.dump(xgb_model, os.path.join(ml_models_dir, "xgboost_model.pkl"))

    print(">>> [5/7] Converting XGBoost to ONNX Graph for Edge Inference...")
    initial_type = [("float_input", FloatTensorType([None, X_train.shape[1]]))]
    onnx_model = onnxmltools.convert_xgboost(xgb_model, initial_types=initial_type, target_opset=12)

    onnx_path = os.path.join(ml_models_dir, "rul_xgboost.onnx")
    with open(onnx_path, "wb") as f:
        f.write(onnx_model.SerializeToString())
    print(f"    ONNX model saved: {onnx_path} ({os.path.getsize(onnx_path) / 1024:.1f} KB)")

    # Copy to backend/models
    backend_onnx_path = os.path.join(backend_models_dir, "rul_xgboost.onnx")
    shutil.copyfile(onnx_path, backend_onnx_path)
    print(f"    Copied ONNX model to backend: {backend_onnx_path}")

    print(">>> [6/7] Validating ONNX Runtime & Edge Latency Benchmark...")
    session = ort.InferenceSession(onnx_path, providers=['CPUExecutionProvider'])
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name

    # Validate parity
    test_sample = X_test[:10]
    ort_outs = session.run([output_name], {input_name: test_sample})[0].flatten()
    max_delta = float(np.max(np.abs(xgb_preds[:10] - ort_outs)))
    print(f"    ONNX Parity check (Max absolute delta vs Python XGBoost): {max_delta:.6f}")
    assert max_delta < 1e-4, f"Parity mismatch: {max_delta}"

    # Latency benchmark (1,000 single-item edge inference runs)
    single_sample = X_test[0:1]
    latencies = []
    # Warmup
    for _ in range(50):
        session.run([output_name], {input_name: single_sample})

    for _ in range(500):
        t0 = time.perf_counter()
        session.run([output_name], {input_name: single_sample})
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000.0) # in ms

    lat_p50 = float(np.percentile(latencies, 50))
    lat_p95 = float(np.percentile(latencies, 95))
    lat_p99 = float(np.percentile(latencies, 99))
    lat_mean = float(np.mean(latencies))
    print(f"    Edge Latency: Mean={lat_mean:.2f}ms, P50={lat_p50:.2f}ms, P95={lat_p95:.2f}ms, P99={lat_p99:.2f}ms")

    # Feature importances from XGBoost
    importances = xgb_model.feature_importances_
    # Sum importances over the 16 features across the 30 window steps
    feat_scores = {}
    for i, name in enumerate(ACTIVE_FEATURES_FD001):
        # Indices of raw readings for this sensor across 30 time steps
        raw_indices = [step * 16 + i for step in range(30)]
        stat_indices = [480 + i * 5 + s for s in range(5)]
        total_imp = float(np.sum(importances[raw_indices + stat_indices]))
        feat_scores[name] = round(total_imp, 4)

    sorted_feats = sorted(feat_scores.items(), key=lambda x: x[1], reverse=True)

    summary = {
        "dataset": "NASA C-MAPSS (FD001)",
        "window_size": 30,
        "input_dimensions": int(X_train.shape[1]),
        "active_features": ACTIVE_FEATURES_FD001,
        "feature_importances": dict(sorted_feats),
        "metrics": {
            "random_forest": rf_metrics,
            "xgboost": xgb_metrics
        },
        "edge_benchmark": {
            "format": "ONNX (OpSet 12)",
            "model_size_kb": round(os.path.getsize(onnx_path) / 1024.0, 1),
            "inference_provider": "CPUExecutionProvider",
            "latency_ms": {
                "mean": round(lat_mean, 3),
                "p50": round(lat_p50, 3),
                "p95": round(lat_p95, 3),
                "p99": round(lat_p99, 3)
            }
        },
        "test_engine_samples": [
            {
                "engine_id": int(test_df['engine_id'].unique()[i]),
                "true_rul": float(y_test[i]),
                "pred_rul": round(float(xgb_preds[i]), 1),
                "error": round(float(xgb_preds[i] - y_test[i]), 1)
            }
            for i in range(min(15, len(y_test)))
        ]
    }

    summary_path = os.path.join(ml_models_dir, "benchmark_summary.json")
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)
    shutil.copyfile(summary_path, os.path.join(backend_models_dir, "benchmark_summary.json"))
    print(f">>> [7/7] Successfully saved benchmark summary to {summary_path}")

if __name__ == "__main__":
    main()
