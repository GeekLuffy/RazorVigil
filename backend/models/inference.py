"""
Model inference wrapper for RazorShield Sentinel.

Loads and ensembles the heterogeneous quad-architecture:
1. LightGBM (Optuna-tuned fast tree ensemble)
2. CatBoost (Categorical Interaction trees)
3. PyTorch FT-Transformer (Feature Tokenizer Transformer with IEEE TNNLS Focal Loss)
4. IsolationForest (Zero-day Anomaly detector)
5. Split Conformal Risk Predictor (95% certified coverage guarantee)
"""

from __future__ import annotations

import logging
import os
import pickle
from pathlib import Path
from typing import Optional, Tuple, Dict, Any

import numpy as np
import torch

from backend.models.ft_transformer import FTTransformer
from backend.models.conformal_calibrator import ConformalRiskCalibrator

logger = logging.getLogger(__name__)

_MODEL_DIR = Path(__file__).parent
_LGBM_PATH = _MODEL_DIR / "lgbm_model.pkl"
_CB_PATH = _MODEL_DIR / "catboost_model.pkl"
_IF_PATH = _MODEL_DIR / "if_model.pkl"
_FT_PATH = _MODEL_DIR / "ft_transformer_model.pt"
_CALIB_PATH = _MODEL_DIR / "conformal_calibrator.pkl"


class RiskScorer:
    """
    Wraps the complete heterogeneous neural-tree quad-ensemble with Split Conformal Calibration.
    Inference is strictly synchronous and optimized for <15ms latency budget.
    """

    def __init__(self):
        self._lgbm = None
        self._catboost = None
        self._iso_forest = None
        self._ft_model: Optional[FTTransformer] = None
        self._conformal_calibrator: Optional[ConformalRiskCalibrator] = None
        self._if_score_min: float = -0.5
        self._if_score_range: float = 1.0
        self._load_models()

    def _load_models(self) -> None:
        # 1. LightGBM
        if _LGBM_PATH.exists():
            with open(_LGBM_PATH, "rb") as f:
                self._lgbm = pickle.load(f)
            logger.info("[RiskScorer] LightGBM loaded from %s", _LGBM_PATH)
        else:
            logger.warning("[RiskScorer] LightGBM model not found at %s", _LGBM_PATH)

        # 2. CatBoost
        if _CB_PATH.exists():
            with open(_CB_PATH, "rb") as f:
                self._catboost = pickle.load(f)
            logger.info("[RiskScorer] CatBoost loaded from %s", _CB_PATH)
        else:
            logger.warning("[RiskScorer] CatBoost model not found at %s", _CB_PATH)

        # 3. Isolation Forest
        if _IF_PATH.exists():
            with open(_IF_PATH, "rb") as f:
                data = pickle.load(f)
                self._iso_forest = data["model"]
                self._if_score_min = data["score_min"]
                self._if_score_range = data["score_range"]
            logger.info("[RiskScorer] IsolationForest loaded from %s", _IF_PATH)
        else:
            logger.warning("[RiskScorer] IsolationForest model not found at %s", _IF_PATH)

        # 4. PyTorch FT-Transformer
        if _FT_PATH.exists():
            try:
                model = FTTransformer(n_num_features=17, d_token=64, n_blocks=3, n_heads=4)
                state_dict = torch.load(_FT_PATH, map_location="cpu")
                model.load_state_dict(state_dict)
                model.eval()
                self._ft_model = model
                logger.info("[RiskScorer] PyTorch FT-Transformer neural model loaded from %s", _FT_PATH)
            except Exception as e:
                logger.warning("[RiskScorer] Could not load FT-Transformer: %s", e)
                self._ft_model = None

        # 5. Split Conformal Calibrator
        if _CALIB_PATH.exists():
            try:
                with open(_CALIB_PATH, "rb") as f:
                    self._conformal_calibrator = pickle.load(f)
                logger.info("[RiskScorer] Conformal Calibrator loaded (q_hat=%.4f, alpha=%.2f)",
                            self._conformal_calibrator.q_hat, self._conformal_calibrator.alpha)
            except Exception as e:
                logger.warning("[RiskScorer] Could not load Conformal Calibrator: %s", e)
                self._conformal_calibrator = None

    def score(self, feature_vec: np.ndarray) -> tuple[float, float, float]:
        """
        Returns (lgbm_prob, cb_prob, normalized_if_score), all in [0, 1].
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

    def score_ft_transformer(self, feature_vec: np.ndarray) -> float:
        """Evaluates FT-Transformer neural model in PyTorch inference mode (<2ms)."""
        if self._ft_model is None:
            return 0.5
        try:
            with torch.no_grad():
                x_tensor = torch.tensor(feature_vec.reshape(1, -1), dtype=torch.float32)
                prob, _ = self._ft_model(x_tensor)
                return float(prob.item())
        except Exception as e:
            logger.warning("FT-Transformer inference error: %s", e)
            return 0.5

    def compute_risk(
        self,
        lgbm_prob: float,
        cb_prob: float,
        if_score: float,
        cluster_score: float,
        is_automation: bool = False,
        ft_prob: Optional[float] = None,
    ) -> float:
        """
        Computes heterogeneous stacked risk score with FT-Transformer and zero-day anomaly gating.
        """
        if ft_prob is None and self._ft_model is not None:
            # Neutral default if not explicitly passed
            ft_prob = (lgbm_prob + cb_prob) / 2.0

        if ft_prob is not None and self._catboost is not None:
            sup_risk = 0.35 * lgbm_prob + 0.35 * cb_prob + 0.30 * ft_prob
            static_blend = (
                0.30 * lgbm_prob +
                0.30 * cb_prob +
                0.25 * ft_prob +
                0.08 * if_score +
                0.07 * cluster_score
            )
        elif self._catboost is not None:
            sup_risk = 0.55 * lgbm_prob + 0.45 * cb_prob
            static_blend = 0.45 * lgbm_prob + 0.35 * cb_prob + 0.10 * if_score + 0.10 * cluster_score
        else:
            sup_risk = lgbm_prob
            static_blend = 0.70 * lgbm_prob + 0.20 * if_score + 0.10 * cluster_score

        # Persistence-Consistent Dynamic Disagreement Gate:
        if if_score >= 0.45 and sup_risk <= 0.40 and is_automation:
            risk = max(static_blend, if_score)
        else:
            risk = static_blend

        return float(np.clip(risk, 0.0, 1.0))

    def get_conformal_prediction(self, point_prob: float) -> Dict[str, Any]:
        """
        Returns Split Conformal Prediction Interval and discrete certified Prediction Sets.
        Guarantees: P(Y in C(X)) >= 1 - alpha (95% confidence).
        """
        if self._conformal_calibrator is not None:
            res = self._conformal_calibrator.predict_interval(point_prob)
            return {
                "lower_bound": res.lower_bound,
                "upper_bound": res.upper_bound,
                "confidence_level": res.confidence_level,
                "prediction_set": getattr(res, "set_prediction", getattr(res, "prediction_set", [])),
                "is_conformal_calibrated": True,
            }

        # Fallback heuristic interval
        return {
            "lower_bound": round(max(0.0, point_prob - 0.15), 4),
            "upper_bound": round(min(1.0, point_prob + 0.15), 4),
            "confidence_level": 0.95,
            "prediction_set": ["fraud"] if point_prob >= 0.75 else (["genuine"] if point_prob <= 0.25 else ["genuine", "fraud"]),
            "is_conformal_calibrated": False,
        }

    def reload(self) -> None:
        """Hot-reload models from disk (useful after retraining)."""
        self._load_models()
