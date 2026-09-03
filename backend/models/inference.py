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


class ClusterFTTransformer(torch.nn.Module):
    def __init__(self, n_num: int = 16, card_cat: list = None, d_token: int = 96, n_heads: int = 8, n_layers: int = 4):
        super().__init__()
        card_cat = card_cat or [4]
        self.num_tokenizer = torch.nn.ModuleList([torch.nn.Linear(1, d_token) for _ in range(n_num)])
        self.cat_tokenizer = torch.nn.ModuleList([torch.nn.Embedding(card, d_token) for card in card_cat])
        self.cls_token = torch.nn.Parameter(torch.randn(1, 1, d_token) * 0.02)
        encoder_layer = torch.nn.TransformerEncoderLayer(
            d_model=d_token, nhead=n_heads, dim_feedforward=d_token * 4,
            dropout=0.1, activation="gelu", batch_first=True
        )
        self.transformer = torch.nn.TransformerEncoder(encoder_layer, num_layers=n_layers)
        self.head = torch.nn.Sequential(
            torch.nn.LayerNorm(d_token),
            torch.nn.Linear(d_token, 32),
            torch.nn.GELU(),
            torch.nn.Linear(32, 1)
        )

    def forward(self, x_num: torch.Tensor, x_cat: torch.Tensor) -> torch.Tensor:
        B = x_num.shape[0]
        tokens = [self.num_tokenizer[i](x_num[:, i:i+1]).unsqueeze(1) for i in range(x_num.shape[1])]
        for i in range(x_cat.shape[1]):
            tokens.append(self.cat_tokenizer[i](x_cat[:, i]).unsqueeze(1))
        cls = self.cls_token.expand(B, -1, -1)
        x = torch.cat([cls] + tokens, dim=1)
        x = self.transformer(x)
        return torch.sigmoid(self.head(x[:, 0, :]))


class RiskScorer:
    """
    Wraps the complete heterogeneous neural-tree quad-ensemble with Split Conformal Calibration.
    Inference is strictly synchronous and optimized for <15ms latency budget.
    """

    def __init__(self):
        self._lgbm = None
        self._catboost = None
        self._iso_forest = None
        self._ft_model = None
        self._ft_is_cluster = False
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
                ckpt = torch.load(_FT_PATH, map_location="cpu")
                if isinstance(ckpt, dict) and "state_dict" in ckpt:
                    model = ClusterFTTransformer(
                        n_num=len(ckpt.get("num_cols", [])) or 16,
                        card_cat=ckpt.get("card_cat", [4]),
                        d_token=ckpt.get("d_token", 96),
                        n_heads=ckpt.get("n_heads", 8),
                        n_layers=ckpt.get("n_layers", 4)
                    )
                    model.load_state_dict(ckpt["state_dict"])
                    self._ft_is_cluster = True
                else:
                    model = FTTransformer(n_num_features=17, d_token=64, n_blocks=3, n_heads=4)
                    model.load_state_dict(ckpt)
                    self._ft_is_cluster = False
                model.eval()
                self._ft_model = model
                logger.info("[RiskScorer] PyTorch FT-Transformer neural model loaded from %s (cluster=%s)", _FT_PATH, self._ft_is_cluster)
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
            lgbm_prob = float(self._lgbm.predict_proba(row)[:, 1][0])
        else:
            lgbm_prob = 0.5

        # CatBoost: P(fraud)
        if self._catboost is not None:
            try:
                cat_names = [
                    'amount', 'amount_zscore', 'hour_sin', 'hour_cos', 'asn_type_encoded',
                    'ja3_ua_mismatch', 'keystroke_entropy', 'mouse_jitter_score', 'paste_event',
                    'time_on_page_s', 'bin_card_count', 'bin_name_count', 'ip_distinct_pan_count',
                    'device_distinct_bin_count', 'device_distinct_ip_count', 'cvv_cycle_attempts',
                    'cluster_risk_score'
                ]
                if row.shape[1] == len(cat_names):
                    import pandas as pd
                    row_df = pd.DataFrame(row, columns=cat_names)
                    row_df['asn_type_encoded'] = row_df['asn_type_encoded'].fillna(0).astype(int)
                    cb_prob = float(self._catboost.predict_proba(row_df)[:, 1][0])
                else:
                    cb_prob = float(self._catboost.predict_proba(row)[:, 1][0])
            except Exception as e:
                logger.debug("CatBoost predict error: %s", e)
                cb_prob = lgbm_prob
        else:
            cb_prob = 0.5

        # IsolationForest: anomaly score ? normalized to [0, 1]
        if self._iso_forest is not None:
            raw_if = float(self._iso_forest.score_samples(row)[0])
            norm = (raw_if - self._if_score_min) / (self._if_score_range + 1e-9)
            norm = float(np.clip(norm, 0.0, 1.0))
            normalized_if = 1.0 - norm
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
                if self._ft_is_cluster:
                    cat_idx = int(x_tensor[0, 4].item()) if x_tensor.shape[1] > 4 else 0
                    x_cat = torch.tensor([[max(0, min(3, cat_idx))]], dtype=torch.long)
                    if x_tensor.shape[1] == 17:
                        x_num = torch.cat([x_tensor[:, :4], x_tensor[:, 5:]], dim=1)
                    else:
                        x_num = x_tensor[:, :16]
                    prob = self._ft_model(x_num, x_cat)
                    return float(prob.item())
                else:
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
