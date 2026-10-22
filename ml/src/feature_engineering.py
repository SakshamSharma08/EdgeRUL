import numpy as np
import pandas as pd
from typing import Tuple, List

WINDOW_SIZE = 30
T_INDEX = np.arange(WINDOW_SIZE, dtype=np.float32)
T_MEAN = float(np.mean(T_INDEX))
S_TT = float(np.sum((T_INDEX - T_MEAN) ** 2)) # 2247.5 for window 30

def extract_window_features(window_2d: np.ndarray) -> np.ndarray:
    """
    Given a window of shape (window_size, num_features) e.g. (30, 16),
    returns a 1D feature vector of length 560:
    - 480 flattened raw readings (temporal sequence)
    - 80 statistical features:
      For each of the 16 features: [mean, std, min, max, slope]
    """
    flat_seq = window_2d.flatten() # 480 floats

    means = np.mean(window_2d, axis=0)
    stds = np.std(window_2d, axis=0)
    mins = np.min(window_2d, axis=0)
    maxs = np.max(window_2d, axis=0)

    # Fast linear slope calculation for each column
    diff_y = window_2d - means
    diff_t = (T_INDEX - T_MEAN)[:, np.newaxis]
    slopes = np.sum(diff_t * diff_y, axis=0) / S_TT

    # Interleave or concatenate stat features
    stats = np.column_stack([means, stds, mins, maxs, slopes]).flatten() # 16 * 5 = 80 floats

    return np.concatenate([flat_seq, stats]).astype(np.float32)

def build_training_windows(scaled_train_df: pd.DataFrame, feature_cols: List[str], window_size: int = WINDOW_SIZE) -> Tuple[np.ndarray, np.ndarray]:
    """
    Generates sliding window samples across all training engine trajectories.
    """
    X_list = []
    y_list = []

    for engine_id, group in scaled_train_df.groupby('engine_id'):
        feature_data = group[feature_cols].values
        rul_data = group['RUL'].values
        n_cycles = len(group)

        if n_cycles < window_size:
            continue

        for i in range(window_size, n_cycles + 1):
            window = feature_data[i - window_size:i]
            x_feat = extract_window_features(window)
            X_list.append(x_feat)
            y_list.append(rul_data[i - 1])

    return np.array(X_list, dtype=np.float32), np.array(y_list, dtype=np.float32)

def build_test_windows(scaled_test_df: pd.DataFrame, rul_true_df: pd.DataFrame, feature_cols: List[str], window_size: int = WINDOW_SIZE) -> Tuple[np.ndarray, np.ndarray]:
    """
    Extracts the final sliding window (last 30 cycles) for each test engine,
    paired with its ground-truth RUL at test termination.
    """
    X_list = []
    y_list = []

    test_engines = sorted(scaled_test_df['engine_id'].unique())

    for idx, engine_id in enumerate(test_engines):
        group = scaled_test_df[scaled_test_df['engine_id'] == engine_id]
        feature_data = group[feature_cols].values
        n_cycles = len(group)

        # True remaining useful life from RUL_FD00x.txt
        true_rul = float(rul_true_df.iloc[idx]['RUL'])

        if n_cycles >= window_size:
            window = feature_data[-window_size:]
        else:
            # Zero-pad if test sequence shorter than window
            pad_rows = window_size - n_cycles
            pad = np.repeat(feature_data[0:1], pad_rows, axis=0)
            window = np.vstack([pad, feature_data])

        x_feat = extract_window_features(window)
        X_list.append(x_feat)
        y_list.append(true_rul)

    return np.array(X_list, dtype=np.float32), np.array(y_list, dtype=np.float32)
