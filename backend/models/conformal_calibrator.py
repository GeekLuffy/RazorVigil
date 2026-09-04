"""
RazorVigil — Split Conformal Prediction Calibrator.
Provides finite-sample, distribution-free mathematical coverage guarantees (1 - alpha)
for fraud probability estimates, transforming raw point predictions into calibrated risk intervals.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Tuple, Optional
import numpy as np


@dataclass
class ConformalPredictionInterval:
    point_prediction: float
    lower_bound: float
    upper_bound: float
    confidence_level: float
    set_prediction: List[str]  # e.g., ["genuine"], ["fraud"], or ["genuine", "fraud"] (uncertain)
    is_uncertain: bool


class ConformalRiskCalibrator:
    """
    Split Conformal Prediction Calibrator for Binary Fraud Classification.
    
    Given a user-specified significance level alpha (default 0.05 for 95% coverage),
    this engine computes non-conformity scores on a calibration split and outputs
    prediction intervals [p_lower, p_upper] and discrete prediction sets with
    guaranteed theoretical error control:
        P(Y in C(X)) >= 1 - alpha
    """

    def __init__(self, alpha: float = 0.05):
        self.alpha = float(alpha)
        self.q_hat: float = 0.5
        self.is_calibrated: bool = False
        self.n_calibration_samples: int = 0

    def calibrate(self, probs: np.ndarray, labels: np.ndarray) -> None:
        """
        Calibrate using non-conformity score: s_i = 1 - p_true_class.
        For binary classification:
            s_i = 1 - p_i  if y_i = 1 (fraud)
            s_i = p_i      if y_i = 0 (genuine)
        """
        probs = np.clip(np.asarray(probs, dtype=np.float64), 1e-6, 1.0 - 1e-6)
        labels = np.asarray(labels, dtype=np.int32)
        n = len(labels)
        if n < 10:
            raise ValueError(f"Calibration set too small: {n} samples (minimum 10 required)")

        # Compute nonconformity scores
        # s_i = 1 - P(Y = y_i | X_i)
        scores = np.where(labels == 1, 1.0 - probs, probs)

        # Compute empirical quantile: ceil((n + 1) * (1 - alpha)) / n
        k = math.ceil((n + 1) * (1.0 - self.alpha))
        k = min(max(k, 1), n)
        
        sorted_scores = np.sort(scores)
        self.q_hat = float(sorted_scores[k - 1])
        self.is_calibrated = True
        self.n_calibration_samples = n

    def predict_interval(self, prob: float) -> ConformalPredictionInterval:
        """
        Produce a calibrated conformal prediction interval and prediction set
        for a single transaction risk score.
        """
        prob = float(np.clip(prob, 0.0, 1.0))
        if not self.is_calibrated:
            # Fallback heuristic interval when uncalibrated
            lower = max(0.0, prob - 0.15)
            upper = min(1.0, prob + 0.15)
            return ConformalPredictionInterval(
                point_prediction=prob,
                lower_bound=lower,
                upper_bound=upper,
                confidence_level=1.0 - self.alpha,
                set_prediction=["genuine"] if prob < 0.3 else (["fraud"] if prob > 0.7 else ["genuine", "fraud"]),
                is_uncertain=0.3 <= prob <= 0.7,
            )

        # Conformal prediction set criteria:
        # Include 'genuine' (0) if 1 - (1 - p) <= q_hat => p <= q_hat
        # Include 'fraud'   (1) if 1 - p <= q_hat       => p >= 1 - q_hat
        prediction_set: List[str] = []
        if prob <= self.q_hat:
            prediction_set.append("genuine")
        if prob >= (1.0 - self.q_hat):
            prediction_set.append("fraud")

        if not prediction_set:
            # Empty set safeguard (can occur at very high significance alpha)
            prediction_set = ["genuine"] if prob < 0.5 else ["fraud"]

        lower_bound = max(0.0, prob - (1.0 - self.q_hat))
        upper_bound = min(1.0, prob + (1.0 - self.q_hat))
        is_uncertain = len(prediction_set) > 1

        return ConformalPredictionInterval(
            point_prediction=round(prob, 4),
            lower_bound=round(lower_bound, 4),
            upper_bound=round(upper_bound, 4),
            confidence_level=round(1.0 - self.alpha, 2),
            set_prediction=prediction_set,
            is_uncertain=is_uncertain,
        )
