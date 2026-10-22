import numpy as np
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

def nasa_scoring_function(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """
    Computes NASA's asymmetric Prognostics & Health Management (PHM) benchmark score:
    d = y_pred - y_true
    score = sum( exp(-d / 13) - 1 for d < 0 ) + sum( exp(d / 10) - 1 for d >= 0 )
    Penalizes late predictions (hazard of unexpected in-flight failure) much more strictly
    than early predictions (premature maintenance check).
    """
    d = y_pred - y_true
    scores = np.where(d < 0, np.exp(-d / 13.0) - 1.0, np.exp(d / 10.0) - 1.0)
    return float(np.sum(scores))

def evaluate_predictions(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    mae = float(mean_absolute_error(y_true, y_pred))
    r2 = float(r2_score(y_true, y_pred))
    score = nasa_scoring_function(y_true, y_pred)
    return {
        "rmse": round(rmse, 3),
        "mae": round(mae, 3),
        "r2": round(r2, 4),
        "nasa_score": round(score, 2)
    }
