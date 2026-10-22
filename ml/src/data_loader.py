import os
import pandas as pd

COLUMN_NAMES = [
    'engine_id', 'cycle',
    'os1', 'os2', 'os3',
    's1', 's2', 's3', 's4', 's5',
    's6', 's7', 's8', 's9', 's10',
    's11', 's12', 's13', 's14', 's15',
    's16', 's17', 's18', 's19', 's20', 's21'
]

# Flat/constant sensors in FD001 with near-zero standard deviation
DROP_SENSORS_FD001 = ['s1', 's5', 's6', 's10', 's16', 's18', 's19', 'os3']

# The 16 active features retained after feature selection
ACTIVE_FEATURES_FD001 = [
    'os1', 'os2',
    's2', 's3', 's4', 's7', 's8', 's9',
    's11', 's12', 's13', 's14', 's15', 's17', 's20', 's21'
]

def load_cmapss_data(data_dir: str, subset: str = "FD001"):
    """
    Loads train, test, and true RUL for a CMAPSS subset.
    Returns (train_df, test_df, rul_true_df)
    """
    train_path = os.path.join(data_dir, f"train_{subset}.txt")
    test_path = os.path.join(data_dir, f"test_{subset}.txt")
    rul_path = os.path.join(data_dir, f"RUL_{subset}.txt")

    train_df = pd.read_csv(train_path, sep=r'\s+', header=None, names=COLUMN_NAMES)
    test_df = pd.read_csv(test_path, sep=r'\s+', header=None, names=COLUMN_NAMES)
    rul_true_df = pd.read_csv(rul_path, sep=r'\s+', header=None, names=['RUL'])

    return train_df, test_df, rul_true_df

if __name__ == "__main__":
    raw_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw"))
    train_df, test_df, rul_df = load_cmapss_data(raw_dir)
    print(f"Loaded FD001: train {train_df.shape}, test {test_df.shape}, RUL {rul_df.shape}")
    print(f"Total engines in train: {train_df['engine_id'].nunique()}")
    print(f"Total engines in test: {test_df['engine_id'].nunique()}")
