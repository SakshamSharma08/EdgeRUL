import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
try:
    from .data_loader import ACTIVE_FEATURES_FD001, DROP_SENSORS_FD001
except (ImportError, ValueError):
    from data_loader import ACTIVE_FEATURES_FD001, DROP_SENSORS_FD001

MAX_RUL_CLIP = 125

def compute_rul_labels(train_df: pd.DataFrame, max_clip: int = MAX_RUL_CLIP) -> pd.DataFrame:
    """
    Computes piecewise linear Remaining Useful Life (RUL) for each operational cycle.
    RUL = min(max_cycle - current_cycle, max_clip)
    """
    df = train_df.copy()
    max_cycles = df.groupby('engine_id')['cycle'].transform('max')
    df['RUL'] = max_cycles - df['cycle']
    df['RUL'] = df['RUL'].clip(upper=max_clip)
    return df

class CMAPSSPreprocessor:
    def __init__(self, feature_cols=None):
        self.feature_cols = feature_cols or ACTIVE_FEATURES_FD001
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self.scaler_params = {}

    def fit_transform_train(self, train_df: pd.DataFrame) -> pd.DataFrame:
        df = compute_rul_labels(train_df)
        scaled_features = self.scaler.fit_transform(df[self.feature_cols])
        scaled_df = pd.DataFrame(scaled_features, columns=self.feature_cols, index=df.index)
        scaled_df['engine_id'] = df['engine_id'].values
        scaled_df['cycle'] = df['cycle'].values
        scaled_df['RUL'] = df['RUL'].values

        # Store min/max params for edge/Node.js export
        self.scaler_params = {
            col: {
                "min": float(self.scaler.data_min_[i]),
                "max": float(self.scaler.data_max_[i]),
                "scale": float(self.scaler.scale_[i])
            }
            for i, col in enumerate(self.feature_cols)
        }
        return scaled_df

    def transform_test(self, test_df: pd.DataFrame) -> pd.DataFrame:
        df = test_df.copy()
        scaled_features = self.scaler.transform(df[self.feature_cols])
        scaled_df = pd.DataFrame(scaled_features, columns=self.feature_cols, index=df.index)
        scaled_df['engine_id'] = df['engine_id'].values
        scaled_df['cycle'] = df['cycle'].values
        return scaled_df

    def save(self, filepath_pkl: str, filepath_json: str):
        joblib.dump(self.scaler, filepath_pkl)
        with open(filepath_json, 'w') as f:
            json.dump({
                "feature_cols": self.feature_cols,
                "scaler_params": self.scaler_params
            }, f, indent=2)
