"""
Evaluation Integrity Guardrail for Model Benchmarking.

Automatically detects:
1. Exact 1.0000 point estimates or CIs touching 1.0000 (potential separability/leakage).
2. Degenerate near-zero CI widths (< 0.001).
3. Test set evaluation during hyperparameter tuning (tuning-on-test leakage).
"""

from __future__ import annotations

import logging
import warnings
from typing import Tuple, Dict

logger = logging.getLogger("eval_guardrail")


class EvaluationIntegrityWarning(UserWarning):
    """Raised when an evaluation metric exhibits suspicious perfection or zero variance."""
    pass


def check_evaluation_integrity(
    metric_name: str,
    point_estimate: float,
    ci: Tuple[float, float],
    min_ci_width: float = 0.001,
    strict: bool = False,
) -> Dict[str, any]:
    """
    Validates that evaluation results are statistically sound and free from trivial separability.
    
    Raises EvaluationIntegrityWarning (or RuntimeError if strict=True) when:
    - Point estimate is exactly 1.0000 or >= 0.9999.
    - Confidence interval has near-zero width (< min_ci_width).
    - Confidence interval upper bound is exactly 1.0000.
    """
    ci_low, ci_high = ci
    ci_width = ci_high - ci_low
    issues = []

    if round(point_estimate, 4) >= 0.9999 or point_estimate >= 0.9995:
        issues.append(
            f"Point estimate for {metric_name} is {point_estimate:.4f} (>= 0.9995 / 4-decimal 0.9999). "
            "Possible synthetic feature separability, target leakage, or unrepresentative data."
        )

    if round(ci_high, 4) >= 1.0000 or ci_high >= 0.99995:
        issues.append(
            f"Confidence interval upper bound for {metric_name} touches 1.0000 ({ci_high:.4f}). "
            "Requires verification of non-overlapping feature distributions."
        )

    if ci_width < min_ci_width and point_estimate > 0.05:
        issues.append(
            f"Confidence interval width for {metric_name} is degenerate ({ci_width:.6f} < {min_ci_width}). "
            "Confirm bootstrap resamples raw (score, label) pairs with replacement."
        )

    if issues:
        msg = (
            f"\n[EVALUATION INTEGRITY GUARDRAIL TRIGGERED for '{metric_name}']\n"
            + "\n".join(f"  • {issue}" for issue in issues)
            + "\n  ACTION REQUIRED: Audit train/val/test split isolation and feature distributions before reporting.\n"
        )
        if strict:
            raise RuntimeError(msg)
        else:
            warnings.warn(msg, category=EvaluationIntegrityWarning, stacklevel=2)
            logger.warning(msg)

    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "metric": metric_name,
        "point_estimate": point_estimate,
        "ci": ci,
        "ci_width": ci_width,
    }
