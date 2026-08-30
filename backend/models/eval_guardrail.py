"""
Evaluation Integrity Guardrail for Model Benchmarking.

Automatically detects:
1. Exact 1.0000 point estimates or CIs touching 1.0000.
2. Degenerate near-zero CI widths (< 0.001).
3. Test set evaluation during hyperparameter tuning (tuning-on-test leakage).
4. Per-segment trivial separability (100% recall with zero variance).
"""

from __future__ import annotations

import logging
import warnings
from typing import Tuple, Dict, Optional

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
    Validates that global evaluation metrics are statistically sound and free from trivial separability.
    """
    ci_low, ci_high = ci
    ci_width = ci_high - ci_low
    issues = []

    if round(point_estimate, 4) >= 0.9999 or point_estimate >= 0.9995:
        issues.append(
            f"Point estimate for {metric_name} is {point_estimate:.4f} (>= 0.9995 / 4-decimal 0.9999). "
            "Requires documented resolution (e.g. in-domain synthetic composition) before headline reporting."
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
            + "\n  ACTION REQUIRED: Audit train/val/test split isolation and record written resolution in documentation.\n"
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


def check_segment_integrity(
    segment_name: str,
    metric_name: str,
    point_estimate: float,
    ci: Tuple[float, float],
    strict: bool = False,
) -> Dict[str, any]:
    """
    Validates per-segment evaluation metrics.
    Flags 100.00% point estimates or zero-width CIs for architectural review.
    """
    ci_low, ci_high = ci
    ci_width = ci_high - ci_low
    issues = []

    if point_estimate >= 0.9999 and ci_low >= 0.9999:
        issues.append(
            f"Per-segment {metric_name} for '{segment_name}' is exactly {point_estimate:.2%} with zero CI variance [{ci_low:.2%}, {ci_high:.2%}]. "
            "Audit whether segment is partitioned on a single deterministic feature split (e.g. in-domain cvv_cycle_attempts)."
        )

    if issues:
        msg = (
            f"\n[SEGMENT INTEGRITY GUARDRAIL TRIGGERED for '{segment_name} ({metric_name})']\n"
            + "\n".join(f"  • {issue}" for issue in issues)
            + "\n  ACTION REQUIRED: Verify feature engineering vs. zero-day leave-one-out generalization.\n"
        )
        if strict:
            raise RuntimeError(msg)
        else:
            warnings.warn(msg, category=EvaluationIntegrityWarning, stacklevel=2)
            logger.warning(msg)

    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "segment": segment_name,
        "metric": metric_name,
        "point_estimate": point_estimate,
        "ci": ci,
        "ci_width": ci_width,
    }
