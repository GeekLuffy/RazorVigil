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
_IF_PATH = _MODEL_DIR / "if_model.pkl"


class RiskScorer:
    """
    Wraps LightGBM + IsolationForest.
    If model files don't exist (before first training run), returns neutral scores (0.5).
    """

    def __init__(self):
        self._lgbm = None
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

        if _IF_PATH.exists():
            with open(_IF_PATH, "rb") as f:
                data = pickle.load(f)
                self._iso_forest = data["model"]
                self._if_score_min = data["score_min"]
                self._if_score_range = data["score_range"]
            logger.info("[RiskScorer] IsolationForest loaded from %s", _IF_PATH)
        else:
            logger.warning("[RiskScorer] IsolationForest model not found at %s — run train.py first.", _IF_PATH)

    def score(self, feature_vec: np.ndarray) -> tuple[float, float]:
        """
        Returns (lgbm_prob, normalized_if_score), both in [0, 1].
        Falls back to (0.5, 0.5) if models aren't loaded yet.
        """
        row = feature_vec.reshape(1, -1)

        # LightGBM: P(fraud)
        if self._lgbm is not None:
            lgbm_prob = float(self._lgbm.predict_proba(row)[0][1])
        else:
            lgbm_prob = 0.5

        # IsolationForest: raw score is negative (more negative = more anomalous)
        # Normalise to [0,1] where 1 = most anomalous
        if self._iso_forest is not None:
            raw_if = float(self._iso_forest.score_samples(row)[0])
            # Clip and normalise using calibration bounds saved at training time
            normalized_if = 1.0 - (raw_if - self._if_score_min) / max(self._if_score_range, 1e-6)
            normalized_if = float(np.clip(normalized_if, 0.0, 1.0))
        else:
            normalized_if = 0.5

        return lgbm_prob, normalized_if

    def reload(self) -> None:
        """Hot-reload models from disk (useful after retraining)."""
        self._load_models()
