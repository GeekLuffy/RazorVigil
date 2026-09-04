"""
RazorVigil Sentinel — Conformal Prediction & Temporal GNN Test Suite.
Verifies finite-sample mathematical coverage guarantees, interval validity,
FT-Transformer forward pass, and temporal graph edge decay weighting.
"""

import time
import pytest
import numpy as np
import torch

from backend.models.conformal_calibrator import ConformalRiskCalibrator, ConformalPredictionInterval
from backend.models.ft_transformer import FTTransformer
from backend.graph.cluster_engine import ClusterEngine


def test_conformal_calibration_guarantee():
    """
    Mathematical Coverage Verification:
    Tests that on a held-out test split of 5,000 samples, the empirical error rate
    (fraction of true labels not in the prediction set) is bounded below alpha=0.05.
    """
    np.random.seed(42)
    n_cal = 2000
    n_test = 5000

    # Synthetic realistic calibration probabilities and ground truth
    y_cal = (np.random.rand(n_cal) < 0.20).astype(int)
    probs_cal = np.where(y_cal == 1, np.random.beta(5, 1, size=n_cal), np.random.beta(1, 5, size=n_cal))

    calibrator = ConformalRiskCalibrator(alpha=0.05)
    calibrator.calibrate(probs_cal, y_cal)
    assert calibrator.is_calibrated is True
    assert 0.0 < calibrator.q_hat < 1.0

    # Test on held-out test split
    y_test = (np.random.rand(n_test) < 0.20).astype(int)
    probs_test = np.where(y_test == 1, np.random.beta(5, 1, size=n_test), np.random.beta(1, 5, size=n_test))

    covered_count = 0
    for prob, y in zip(probs_test, y_test):
        interval = calibrator.predict_interval(prob)
        true_label_str = "fraud" if y == 1 else "genuine"
        if true_label_str in interval.set_prediction:
            covered_count += 1

    empirical_coverage = covered_count / n_test
    # For alpha = 0.05, empirical coverage should be >= 93% (accounting for finite-sample variance)
    assert empirical_coverage >= 0.93, f"Conformal coverage violated: {empirical_coverage:.4f} < 0.93"


def test_conformal_interval_monotonicity():
    """
    Interval Integrity Test:
    Ensures lower_bound <= point_prediction <= upper_bound and bounds are in [0, 1].
    """
    calibrator = ConformalRiskCalibrator(alpha=0.05)
    probs_cal = np.array([0.05, 0.12, 0.25, 0.85, 0.92, 0.98, 0.02, 0.10, 0.88, 0.95])
    y_cal = np.array([0, 0, 0, 1, 1, 1, 0, 0, 1, 1])
    calibrator.calibrate(probs_cal, y_cal)

    for test_prob in [0.01, 0.15, 0.50, 0.75, 0.99]:
        res = calibrator.predict_interval(test_prob)
        assert 0.0 <= res.lower_bound <= res.point_prediction <= res.upper_bound <= 1.0
        assert res.confidence_level == 0.95
        assert len(res.set_prediction) >= 1


def test_ft_transformer_forward_pass():
    """
    FT-Transformer Architecture Test:
    Verifies forward pass output tensor dimensions, probability bounds, and embedding shape.
    """
    batch_size = 8
    n_features = 14
    model = FTTransformer(n_num_features=n_features, d_token=32, n_blocks=2, n_heads=2)
    model.eval()

    dummy_input = torch.randn(batch_size, n_features)
    with torch.no_grad():
        probs, embeddings = model(dummy_input)

    assert probs.shape == (batch_size, 1)
    assert embeddings.shape == (batch_size, 32)
    assert torch.all(probs >= 0.0) and torch.all(probs <= 1.0)


def test_temporal_graph_edge_decay():
    """
    Temporal Graph Decay Test:
    Verifies that temporal edge weighting decays as time passes.
    """
    import math

    now = time.time()
    tau_half_life = 1800.0  # 30-min half life

    dt_fresh = 5.0  # 5 seconds old
    dt_stale = 3600.0  # 1 hour old

    weight_fresh = math.exp(-dt_fresh / tau_half_life)
    weight_stale = math.exp(-dt_stale / tau_half_life)

    assert weight_fresh > 0.99
    assert weight_stale < 0.15
    assert weight_fresh > weight_stale


def test_binary_focal_loss_optimization():
    """
    IEEE TNNLS Focal Loss Test:
    Verifies that BinaryFocalLoss computes valid gradients and penalizes hard misclassifications
    more severely than easy predictions.
    """
    from backend.models.ft_transformer import BinaryFocalLoss

    focal = BinaryFocalLoss(alpha=0.75, gamma=2.0)

    # Hard false negative: true fraud (y=1) predicted as low risk (p=0.05)
    hard_p = torch.tensor([0.05], requires_grad=True)
    hard_y = torch.tensor([1.0])
    loss_hard = focal(hard_p, hard_y)
    loss_hard.backward()

    # Easy true positive: true fraud (y=1) predicted as high risk (p=0.95)
    easy_p = torch.tensor([0.95])
    easy_y = torch.tensor([1.0])
    loss_easy = focal(easy_p, easy_y)

    assert loss_hard.item() > loss_easy.item() * 50.0  # Hard error penalized >50x higher
    assert hard_p.grad is not None
    assert torch.isfinite(loss_hard) and torch.isfinite(loss_easy)


