# What Broke and How We Recovered: The Real Debugging & Hardening History

> *"A robust defense system is not one that claims perfection on day one, but one that systematically catches and corrects its own failure modes."*

This document provides a transparent, unvarnished record of the real engineering, statistical, and architectural bugs discovered during the development of **RazorVigil Sentinel**, how each was detected, and the rigorous fixes applied.

---

## Summary of Major Incidents

```
+---------------------------------------------------------------------------------------------------+
| INCIDENT & DISCOVERY                      ROOT CAUSE                     RIGOROUS FIX             |
+---------------------------------------------------------------------------------------------------+
| 1. Inflated PR-AUC (~0.999)               Random k-fold with leakage     Strict 60/20/20 3-way    |
|    "Too good to be true" metrics          and uncalibrated thresholds    split + 1,000 Boot CIs   |
|                                                                                                   |
| 2. Disjoint-Interval Separability         Clean non-overlapping bounds   Added 7.5% Hard Negative |
|    Synthetic generator was trivial        in toy data generation         Edge-Case Genuine Class  |
|                                                                                                   |
| 3. Fabricated "p=1.00" Statistic          Documentation overclaim;       Replaced with empirical  |
|    Claimed statistical certainty          no statistical test in code    1,000-resample Boot CIs  |
|                                                                                                   |
| 4. Self-Certifying Governance             Engineer approved own policy   Built independent        |
|    Pipeline evaluated on train data       on the training partition      Reviewer with frozen 15% |
|                                                                                                   |
| 5. Tuning-on-Test Drift Remediation       Trained on all 12 cohorts;     Strict temporal split    |
|    Claimed "100% recall restored"         evaluated on same distribution (M01-08 train, M09-12 val)|
+---------------------------------------------------------------------------------------------------+
```

---

## 1. The Initial Inflated PR-AUC Illusion (~0.999)

### What Was Found
In early prototypes, offline evaluation scripts reported near-perfect performance:
* PR-AUC: `0.9989`
* ROC-AUC: `0.9994`
* Precision: `99.8%` / Recall: `99.6%`

These numbers appeared extraordinary but violated basic machine learning reality for adversarial fraud detection.

### How It Was Caught
1. **Andrej Karpathy Behavioral Audit**: Applied the rule *"If metrics look too perfect, assume leakage or degenerate evaluation before celebrating."*
2. **Automated Guardrail (`eval_guardrail.py`)**: Built an automated verification hook that asserts:
   * Point estimates cannot exceed `0.995` without flagging a warning.
   * 95% bootstrap confidence interval width cannot collapse below `0.005` (which signals zero variance / toy test sets).

### The Fix
* **Strict 3-Way Stratified Split**: Rebuilt `backend/models/train.py` with a deterministic, non-overlapping partition:
  * **60% Train ($N=30,000$)**: SMOTE oversampling applied **only** to the training partition.
  * **20% Validation ($N=10,000$)**: Used exclusively for hyperparameter tuning and ensemble blend weight selection.
  * **20% Test ($N=10,000$)**: Strictly held-out and evaluated exactly once.
* **1,000-Resample Bootstrap Percentile CIs**: Computed non-parametric bootstrap intervals for every reported metric.
* **Resulting Honest Metrics**: PR-AUC adjusted to **`0.9412` (95% CI `[0.9234, 0.9581]`)** and ROC-AUC to **`0.9884` (95% CI `[0.9812, 0.9945]`)**.

---

## 2. Disjoint-Interval Synthetic Separability Bug

### What Was Found
When inspecting feature importances of the initial decision trees, models were achieving high recall using single-feature threshold rules (e.g. `cvv_cycle_attempts > 0` or `cluster_risk_score > 0.25`).

### How It Was Caught
Direct distributional inspection of the synthetic dataset (`generate_dataset_polars.py`) revealed that:
* `normal_genuine` traffic was generated with `cvv_cycle_attempts = np.zeros(...)` and `cluster_risk_score = rng.uniform(0.01, 0.15)`.
* `fraud` traffic was generated with `cvv_cycle_attempts = rng.integers(1, 5)` and `cluster_risk_score = rng.uniform(0.35, 0.90)`.

Because genuine and fraud populations had **zero density overlap** on these key features, any model could trivially achieve 100% separation without learning real behavioral dynamics.

### The Fix
* **Engineered Realistic Hard Negatives (`edge_case_genuine`)**:
  * Added legitimate corporate / shared VPN users (`ip_distinct_pan_count` 2–6, `device_distinct_ip_count` 2–6).
  * Added password manager autofill / fast typists (`time_on_page_s` 2.2–18s, `keystroke_entropy` 0.9–2.2).
  * Added multi-card family buyers (`bin_card_count` 2–7).
  * Added human CVV typo retries (`cvv_cycle_attempts` 1–2 with 20% probability).
* **Empirical Impact**: Creates authentic distribution overlap between genuine and fraudulent checkouts, forcing models to rely on multi-modal feature combinations rather than simple rule bypasses.

---

## 3. Fabricated "p=1.00" Statistic in Co-Evolution

### What Was Found
In early governance documentation and code strings in `coevolution.py`, the arms-race generator output was labeled:
```json
{
  "status": "CERTIFIED_ROBUST",
  "p_value": 1.00,
  "evasion_drop": "96.84%"
}
```

### How It Was Caught
A rigorous code-level audit of `backend/governance/coevolution.py` was conducted to identify which statistical test (e.g. Wilcoxon, binomial test, or permutation test) produced p=1.00. 

The audit confirmed:
1. `scipy.stats` was not imported anywhere in the module.
2. There was **no statistical test code at all**—the condition was simply `if n_evasions == 0: status = "CERTIFIED_ROBUST"`.
3. The "p=1.00" string was fabricated in documentation text.

### The Fix
* **Stripped `CERTIFIED_ROBUST` & Fabricated Stats**: Removed all references to regulatory certification and uncalculated p-values.
* **Added `_bootstrap_evasion_rate_ci()`**: Implemented a real 1,000-resample bootstrap confidence interval over the per-generation evasion-rate trajectory.
* **Renamed Status**: Changed to `EVASION_RESISTANCE_MEASURED` with an explicit limitation note: *"The measured CI is bounded by the sampled candidate space ($N=150$), not all possible external attack strategies."*

---

## 4. Self-Certifying Governance Pipeline

### What Was Found
In the initial `autonomous_engineer.py` loop:
1. The autonomous engineer trained candidate policy trees on `backend/dataset/synthetic_transactions_50k.csv`.
2. The engineer then ran the 6-gate verification suite (`policy_verifier.py`) **on the exact same dataset**.
3. Upon passing, the engineer self-promoted the candidate to `APPROVAL_ELIGIBLE`.

This constituted a critical governance flaw: **the builder agent was acting as its own auditor on its own training data**.

### How It Was Caught
Architectural audit of the policy promotion lifecycle revealed that zero held-out validation data was being reserved for the verification step.

### The Fix
* **Built Independent Review Agent (`reviewer.py`)**:
  * Created a structurally isolated module with separate RNG seeds (`seed + 999`).
  * Carved out a **frozen 15% stratified validation slice ($N=1,500$)** that is withheld from `autonomous_engineer.py`.
* **Separation of Duties**:
  * `autonomous_engineer.py` terminal status changed to `PENDING_INDEPENDENT_REVIEW`.
  * `reviewer.py` evaluates all 6 gates strictly on the frozen validation slice.
  * Reviewer returns `RECOMMENDED_FOR_HUMAN_APPROVAL` or `REJECTED` with explicit rejection reasons.
  * **Human Approval Required**: Live production activation cannot occur without explicit human sign-off.

---

## 5. Tuning-on-Test in Temporal Drift Monitor

### What Was Found
The drift remediation module originally reported *"100% recall restored across all 12 months"*.

### How It Was Caught
Audit of `remediate_drift()` revealed:
1. The remediation tree was fitted on data from all 12 months (M01–M12).
2. It was then evaluated on a re-sampled cohort from the exact same 12-month distributions.
3. Evaluating on data from the same temporal distribution that was used for training guaranteed an artificial 100% score.

### The Fix
* **Strict Temporal Isolation**:
  * **Training Window**: Months 01–08 ($N=4,000$, seed s).
  * **Held-Out Evaluation Window**: Months 09–12 ($N=2,000$, seed s + 1000), generated after training and never seen by the model.
* **Measured Outcome**:
  * While static baseline rules collapse to **0.00% recall** by Month 07, the remediated policy sustains **69.64% aggregate held-out recall** across Months 09–12.
  * In Month 12, recall naturally degrades to **50.00%** under extreme sub-second micro-strikes, honestly demonstrating concept drift degradation rather than an artificial flat 100%.

---

## Key Lessons Learned

1. **Synthetic data easily creates artificial perfection**: Without hard negatives, decision trees latch onto clean boundaries that do not exist in production.
2. **Confidence intervals are mandatory**: Point estimates without bootstrap distributions hide small-sample variance.
3. **Auditing requires structural isolation**: An AI agent cannot objectively evaluate a policy on data it used to generate that policy.
4. **Transparent imperfection builds real credibility**: Documenting an honest 69.64% held-out drift recall with a 50% Month 12 floor is infinitely more valuable to risk teams than claiming a fabricated 100% perfection.
