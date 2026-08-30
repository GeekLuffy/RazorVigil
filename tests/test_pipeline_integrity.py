"""
Unit and Integration Tests for Evaluation Integrity Guardrails and 3-Way Partitioning.
"""

import pytest
import numpy as np
import warnings

from backend.models.eval_guardrail import (
    check_evaluation_integrity,
    EvaluationIntegrityWarning,
)


def test_guardrail_catches_perfect_point_estimate():
    with pytest.warns(EvaluationIntegrityWarning, match="Point estimate for PR-AUC is 1.0000"):
        check_evaluation_integrity(
            metric_name="PR-AUC",
            point_estimate=1.0000,
            ci=(1.0000, 1.0000),
            min_ci_width=0.001,
            strict=False,
        )


def test_guardrail_catches_degenerate_ci_width():
    with pytest.warns(EvaluationIntegrityWarning, match="degenerate"):
        check_evaluation_integrity(
            metric_name="ROC-AUC",
            point_estimate=0.9500,
            ci=(0.95000, 0.95002),
            min_ci_width=0.001,
            strict=False,
        )


def test_guardrail_passes_valid_realistic_metrics():
    res = check_evaluation_integrity(
        metric_name="Valid PR-AUC",
        point_estimate=0.9850,
        ci=(0.9780, 0.9910),
        min_ci_width=0.001,
        strict=False,
    )
    assert res["valid"] is True
    assert len(res["issues"]) == 0
    assert abs(res["ci_width"] - 0.0130) < 1e-6
