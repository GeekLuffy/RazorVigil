// AUTO-GENERATED from docs/metrics.json via scripts/generate_docs.py. DO NOT EDIT DIRECTLY.

export const GENERATED_METRICS = Object.freeze({
  meta: Object.freeze({
    version: "1.0.0",
    lastUpdated: "2026-08-31T03:00:00Z",
    heldOutTestCount: 10000,
    bootstrapResamples: 1000,
  }),
  fullFunnelCatchRate: 0.9957,
  mlLayerPrAuc: 0.9958,
  adversarialRealisticRecall: 0.97,
  zeroDayRecall: 0.768,
  tabularGbdtPrAuc: 0.9997,
  tabularGbdtRocAuc: 0.9999,
  static4WayPrAuc: 0.9991,
  static4WayRocAuc: 0.9996,
  persistenceGatedPrAuc: 0.9963,
  persistenceGatedRocAuc: 0.9986,
  sequentialLatency: Object.freeze({
    p50: 9.08,
    p95: 11.81,
    p99: 13.86,
  }),
  concurrentLatency: Object.freeze({
    p50: 9.44,
    p95: 18.62,
    p99: 28.06,
  }),
  segments: Object.freeze([
  {
    "segment": "normal",
    "display_name": "Normal Genuine",
    "n_test": 6500,
    "base_rate": 0.0,
    "tabular_fpr": 0.0,
    "static_4way_fpr": 0.0,
    "persistence_gated_fpr": 0.0009
  },
  {
    "segment": "edge_genuine",
    "display_name": "Edge-Case Genuine (VPN/Travelers)",
    "n_test": 500,
    "base_rate": 0.0,
    "tabular_fpr": 0.06,
    "static_4way_fpr": 0.056,
    "persistence_gated_fpr": 0.106,
    "routing_action": "Soft-Risk UPI Recovery"
  },
  {
    "segment": "slow_carding",
    "display_name": "Slow Distributed Carding",
    "n_test": 1000,
    "base_rate": 1.0,
    "tabular_rec": {
      "point": 1.0,
      "ci": [
        1.0,
        1.0
      ]
    },
    "static_4way_rec": {
      "point": 1.0,
      "ci": [
        1.0,
        1.0
      ]
    },
    "persistence_gated_rec": {
      "point": 1.0,
      "ci": [
        1.0,
        1.0
      ]
    }
  },
  {
    "segment": "burst",
    "display_name": "Rapid Burst Script Botnets",
    "n_test": 1000,
    "base_rate": 1.0,
    "tabular_rec": {
      "point": 1.0,
      "ci": [
        1.0,
        1.0
      ]
    },
    "static_4way_rec": {
      "point": 1.0,
      "ci": [
        1.0,
        1.0
      ]
    },
    "persistence_gated_rec": {
      "point": 1.0,
      "ci": [
        1.0,
        1.0
      ]
    }
  },
  {
    "segment": "adversarial_realistic",
    "display_name": "Adversarial Realistic Bots",
    "n_test": 500,
    "base_rate": 1.0,
    "tabular_rec": {
      "point": 0.976,
      "ci": [
        0.962,
        0.988
      ]
    },
    "static_4way_rec": {
      "point": 0.97,
      "ci": [
        0.956,
        0.984
      ]
    },
    "persistence_gated_rec": {
      "point": 0.97,
      "ci": [
        0.956,
        0.984
      ]
    }
  },
  {
    "segment": "cvv_cycling",
    "display_name": "CVV Cycling (In-Domain)",
    "n_test": 500,
    "base_rate": 1.0,
    "tabular_rec": {
      "point": 1.0,
      "ci": [
        1.0,
        1.0
      ]
    },
    "static_4way_rec": {
      "point": 1.0,
      "ci": [
        1.0,
        1.0
      ]
    },
    "persistence_gated_rec": {
      "point": 1.0,
      "ci": [
        1.0,
        1.0
      ]
    }
  }
]),
  leaveOneOut: Object.freeze([
  {
    "component": "Dynamic Disagreement (Persistence-Gated P2)",
    "unseen_recall": 0.768,
    "ci": [
      0.734,
      0.804
    ],
    "mechanism": "Compound Automation & Anomaly Bypass Gate"
  },
  {
    "component": "Isolation Forest Standalone (Unsupervised)",
    "unseen_recall": 0.752,
    "ci": [
      0.716,
      0.7881
    ],
    "mechanism": "Unsupervised Anomaly Boundary (No labels required)"
  },
  {
    "component": "GNN / Cluster Risk Standalone (Structural)",
    "unseen_recall": 0.298,
    "ci": [
      0.256,
      0.336
    ],
    "mechanism": "Relational Entity Graph Clustering"
  },
  {
    "component": "LightGBM Standalone (Supervised)",
    "unseen_recall": 0.09,
    "ci": [
      0.064,
      0.114
    ],
    "mechanism": "Supervised Trees (Fails on unseen attack geometry)"
  },
  {
    "component": "CatBoost Standalone (Supervised)",
    "unseen_recall": 0.066,
    "ci": [
      0.046,
      0.088
    ],
    "mechanism": "Supervised Trees (Fails on unseen attack geometry)"
  },
  {
    "component": "Tabular GBDT Blend (0.55 LGB / 0.45 CB)",
    "unseen_recall": 0.082,
    "ci": [
      0.058,
      0.106
    ],
    "mechanism": "Supervised Tabular Blend"
  },
  {
    "component": "Static 4-Way Stacked Blend (0.45/0.35/0.10/0.10)",
    "unseen_recall": 0.082,
    "ci": [
      0.058,
      0.106
    ],
    "mechanism": "Static Blend (0.80 supervised weight dilutes IF)"
  }
]),
  governanceDrift: Object.freeze({
  "training_window": "Months 01\u201308 (N=4,000)",
  "held_out_window": "Months 09\u201312 (N=2,000, frozen holdout)",
  "static_baseline_held_out_recall": 0.0,
  "static_baseline_collapse_month": "Month 07 (0.00% recall)",
  "remediated_held_out_fraud_recall": {
    "point": 0.6964,
    "ci": [
      0.6746,
      0.754
    ],
    "month_09_recall": 0.881,
    "month_10_recall": 0.746,
    "month_11_recall": 0.6587,
    "month_12_floor_recall": 0.5
  },
  "month_01_tradeoff": {
    "remediated_recall": 0.9921,
    "static_recall": 1.0,
    "remediated_precision": 0.9542,
    "static_precision": 0.9265,
    "explanation": "Deliberate precision/recall tradeoff: multi-modal policy trades 1 edge fraud case (-0.79% recall) for +2.77% precision improvement to reduce legitimate buyer checkout friction."
  },
  "normal_genuine_fpr": {
    "point": 0.0,
    "ci": [
      0.0,
      0.0
    ],
    "false_positives": 0,
    "total_evaluated": 1348
  },
  "edge_case_genuine_hard_negative_fpr": {
    "point": 0.0811,
    "ci": [
      0.0378,
      0.1243
    ],
    "false_positives": 12,
    "total_evaluated": 148,
    "small_n_caveat": "Each month has N=38 edge-case genuine transactions (7.5% of 500); month-level FPR variations reflect small-N binomial variance. The aggregate held-out statistic (N=148, 95% CI [3.78%, 12.43%]) is the canonical reference."
  }
}),
  governanceOpe: Object.freeze({
  "evaluation_partition": "Full Governance Dataset (N=10,000)",
  "doubly_robust_policy_value_rupees": 194.29,
  "static_baseline_policy_value_rupees": -72.29,
  "net_economic_lift_rupees": 266.58,
  "direct_method_agreement": 0.972,
  "ipw_clip_threshold": 20.0,
  "sensitivity_analysis": {
    "capped_5x_lift_rupees": 266.56,
    "capped_20x_lift_rupees": 266.58,
    "uncapped_lift_rupees": 266.58
  }
}),
});

export default GENERATED_METRICS;
