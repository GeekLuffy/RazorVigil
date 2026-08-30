"""
Model inference wrapper.

Loads LightGBM classifier and IsolationForest from disk once at startup.
Both are called synchronously (they're fast enough: <15ms LightGBM, <5ms IF).

Research doc reference: §2 Layer 3 — Model selection.
"""

from __future__ import annotations

import logging
import os
import pickle
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)

_MODEL_DIR = Path(__file__).parent
_LGBM_PATH = _MODEL_DIR / "lgbm_model.pkl"
_CB_PATH = _MODEL_DIR / "catboost_model.pkl"
_IF_PATH = _MODEL_DIR / "if_model.pkl"


class RiskScorer:
    """
    Wraps LightGBM + CatBoost + IsolationForest.
    If model files don't exist (before first training run), returns neutral scores (0.5).
    """

    def __init__(self):
        self._lgbm = None
        self._catboost = None
        self._iso_forest = None
        self._if_score_min: float = -0.5
        self._if_score_range: float = 1.0
        self._load_models()

    def _load_models(self) -> None:
        if _LGBM_PATH.exists():
            with open(_LGBM_PATH, "rb") as f:
                self._lgbm = pickle.load(f)
            logger.info("[RiskScorer] LightGBM loaded from %s", _LGBM_PATH)
        else:
            logger.warning("[RiskScorer] LightGBM model not found at %s — run train.py first.", _LGBM_PATH)

        if _CB_PATH.exists():
            with open(_CB_PATH, "rb") as f:
                self._catboost = pickle.load(f)
            logger.info("[RiskScorer] CatBoost loaded from %s", _CB_PATH)
        else:
            logger.warning("[RiskScorer] CatBoost model not found at %s", _CB_PATH)

        if _IF_PATH.exists():
            with open(_IF_PATH, "rb") as f:
                data = pickle.load(f)
                self._iso_forest = data["model"]
                self._if_score_min = data["score_min"]
                self._if_score_range = data["score_range"]
            logger.info("[RiskScorer] IsolationForest loaded from %s", _IF_PATH)
        else:
            logger.warning("[RiskScorer] IsolationForest model not found at %s — run train.py first.", _IF_PATH)

    def score(self, feature_vec: np.ndarray) -> tuple[float, float, float]:
        """
        Returns (lgbm_prob, cb_prob, normalized_if_score), all in [0, 1].
        Falls back to 0.5 if models aren't loaded yet.
        """
        row = feature_vec.reshape(1, -1)

        # LightGBM: P(fraud)
        if self._lgbm is not None:
            lgbm_prob = float(self._lgbm.predict_proba(row)[0][1])
        else:
            lgbm_prob = 0.5

        # CatBoost: P(fraud)
        if self._catboost is not None:
            cb_prob = float(self._catboost.predict_proba(row)[0][1])
        else:
            cb_prob = lgbm_prob  # Fallback to LightGBM

        # IsolationForest: raw score is negative (more negative = more anomalous)
        if self._iso_forest is not None:
            raw_if = float(self._iso_forest.score_samples(row)[0])
            normalized_if = 1.0 - (raw_if - self._if_score_min) / max(self._if_score_range, 1e-6)
            normalized_if = float(np.clip(normalized_if, 0.0, 1.0))
        else:
            normalized_if = 0.5

        return lgbm_prob, cb_prob, normalized_if

    def compute_risk(self, lgbm_prob: float, cb_prob: float, if_score: float, cluster_score: float) -> float:
        """Computes stacked blended risk score with dynamic zero-day anomaly disagreement gating."""
        if self._catboost is not None:
            sup_risk = 0.55 * lgbm_prob + 0.45 * cb_prob
            static_blend = 0.45 * lgbm_prob + 0.35 * cb_prob + 0.10 * if_score + 0.10 * cluster_score
        else:
            sup_risk = lgbm_prob
            static_blend = 0.70 * lgbm_prob + 0.20 * if_score + 0.10 * cluster_score

        # Dynamic Disagreement Gate for Zero-Day Anomaly Protection:
        # If supervised models predict low risk (<=0.40) but unsupervised IF detects a strong anomaly (>=0.55),
        # bypass supervised dilution to intercept novel zero-day attack geometries.
        if if_score >= 0.55 and sup_risk <= 0.40:
            risk = max(static_blend, if_score)
        else:
            risk = static_blend

        return float(np.clip(risk, 0.0, 1.0))

    def reload(self) -> None:
        """Hot-reload models from disk (useful after retraining)."""
        self._load_models()
