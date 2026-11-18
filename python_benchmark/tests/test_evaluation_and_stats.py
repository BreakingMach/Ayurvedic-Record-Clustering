"""Unit tests for evaluation metrics, shuffled-label control, and paired Wilcoxon statistics."""

from __future__ import annotations

import numpy as np
import pytest

from ayur_bench.data import load_config, load_tridosha_dataset
from ayur_bench.distances import gower_distance
from ayur_bench.evaluation import (
    evaluate_clustering,
    evaluate_distance_matrix,
    evaluate_knn_cv,
    evaluate_loo_retrieval,
)
from ayur_bench.stats import compare_metrics_paired, holm_bonferroni, paired_effect_size


def test_shuffled_label_control_near_chance() -> None:
    """
    (iv) Shuffled-label control on the real dataset distance matrix:
      Under random permutation of the 6 imbalanced Dosha classes
      (counts = [624, 264, 144, 72, 48, 48], N = 1200):
        - Exact expected macro-averaged LOO P@5 is sum(p_c)/6 = 1/6 = 0.1667.
          With n_min = 48, binomial SE on macro P@5 is ~0.008; tolerance +-0.04
          (~5 SE, i.e. [0.1267, 0.2067]) safely passes random permutations while
          catching any leakage.
        - Under imbalanced 5-NN majority voting on random labels, rare 4% classes
          seldom win a majority, so random-label macro-F1 sits near 0.11-0.16;
          we assert it stays in [0.05, 0.22] (well below any non-chance signal).
    """
    bundle = load_tridosha_dataset()
    D = gower_distance(
        bundle.X,
        numeric_cols=bundle.numeric_cols,
        categorical_cols=bundle.categorical_cols,
    )

    rng = np.random.default_rng(12345)
    y_shuffled = rng.permutation(bundle.y.to_numpy())

    knn_res = evaluate_knn_cv(D, y_shuffled, n_neighbors=5, n_splits=5, n_repeats=3, random_state=42)
    loo_res = evaluate_loo_retrieval(D, y_shuffled, ks=(1, 5, 10), smallest_n_classes=3)

    chance_macro_p5 = 1.0 / 6.0  # 0.1667
    observed_macro_p5 = loo_res["macro"]["p_at_5"]
    observed_macro_f1 = knn_res["macro_f1_mean"]

    assert abs(observed_macro_p5 - chance_macro_p5) <= 0.04, (
        f"Shuffled LOO macro P@5={observed_macro_p5:.4f} deviated from chance {chance_macro_p5:.4f}"
    )
    assert 0.05 <= observed_macro_f1 <= 0.22, (
        f"Shuffled kNN macro-F1={observed_macro_f1:.4f} not near chance"
    )


def test_loo_tie_breaking_is_deterministic_and_reports_smallest_three() -> None:
    # Construct a matrix with deliberate exact distance ties
    D = np.array(
        [
            [0.0, 0.5, 0.5, 0.5, 1.0, 1.0],
            [0.5, 0.0, 0.5, 0.5, 1.0, 1.0],
            [0.5, 0.5, 0.0, 0.5, 1.0, 1.0],
            [0.5, 0.5, 0.5, 0.0, 1.0, 1.0],
            [1.0, 1.0, 1.0, 1.0, 0.0, 0.5],
            [1.0, 1.0, 1.0, 1.0, 0.5, 0.0],
        ]
    )
    y = np.array(["A", "A", "A", "B", "C", "D"])
    res1 = evaluate_loo_retrieval(D, y, ks=(1, 2), smallest_n_classes=3)
    res2 = evaluate_loo_retrieval(D, y, ks=(1, 2), smallest_n_classes=3)

    assert res1 == res2
    assert list(res1["smallest_classes"].keys()) == ["B", "C", "D"]


def test_clustering_flags_silhouette_and_runs_both_linkages() -> None:
    cfg = load_config()
    bundle = load_tridosha_dataset()
    # Small stratified subset for fast structural check
    idx = np.arange(0, 1200, 10)
    X_sub = bundle.X.iloc[idx].reset_index(drop=True)
    y_sub = bundle.y.iloc[idx].to_numpy()
    D_sub = gower_distance(X_sub, numeric_cols=[], categorical_cols=bundle.categorical_cols)

    out = evaluate_distance_matrix(D_sub, y_sub, config=cfg)
    clu = out["clustering"]
    assert clu["silhouette_note"] == "not comparable across metrics"
    assert set(clu["linkages"].keys()) == {"average", "complete"}
    for link in ("average", "complete"):
        assert clu["linkages"][link]["silhouette_note"] == "not comparable across metrics"
        assert np.isfinite(clu["linkages"][link]["ari"])
        assert np.isfinite(clu["linkages"][link]["nmi"])


def test_stats_wilcoxon_holm_and_effect_size() -> None:
    scores = {
        "gower": [0.80, 0.82, 0.81, 0.83, 0.79, 0.84, 0.82, 0.81, 0.80, 0.83],
        "euclidean": [0.70, 0.71, 0.72, 0.73, 0.69, 0.72, 0.71, 0.70, 0.72, 0.71],
        "cosine_tie": [0.70, 0.71, 0.72, 0.73, 0.69, 0.72, 0.71, 0.70, 0.72, 0.71],
    }
    comp = compare_metrics_paired(scores, alpha=0.05)
    assert comp["correction"] == "holm"
    assert len(comp["pairwise"]) == 3

    by_pair = {(r["metric_a"], r["metric_b"]): r for r in comp["pairwise"]}
    # Identical vectors -> p_raw == 1.0, effect sizes == 0.0
    tie_row = by_pair[("euclidean", "cosine_tie")]
    assert tie_row["p_raw"] == 1.0
    assert tie_row["cohen_dz"] == 0.0
    assert tie_row["rank_biserial_r"] == 0.0

    # Clearly separated vectors -> significant even after Holm correction
    ge_row = by_pair[("gower", "euclidean")]
    assert ge_row["p_holm"] < 0.05
    assert ge_row["significant_holm"] is True
    assert ge_row["rank_biserial_r"] == 1.0

    # Holm monotonicity sanity check
    adj = holm_bonferroni([0.01, 0.04, 0.03])
    assert np.allclose(adj, [0.03, 0.06, 0.06])

    eff = paired_effect_size(scores["gower"], scores["euclidean"])
    assert eff["mean_diff"] > 0.09
    assert eff["cohen_dz"] > 5.0
