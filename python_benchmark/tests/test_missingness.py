"""Tests for Part B — Missingness robustness on real categorical data."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from ayur_bench.data import load_tridosha_dataset
from ayur_bench.distances import compute_query_to_db_distances

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def test_missingness_mathematical_equivalences():
    """Verify that on categorical queries, observed-only and mode-impute variants satisfy exact math."""
    bundle = load_tridosha_dataset()
    X = bundle.X
    cat_cols = list(bundle.categorical_cols)

    # 10 test queries with partial missingness (some traits set to None)
    rng = np.random.default_rng(123)
    queries = []
    for i in range(10):
        q = dict(X.iloc[i])
        masked = rng.choice(cat_cols, size=6, replace=False)
        for m in masked:
            q[m] = None
        queries.append(q)
    q_df = pd.DataFrame(queries)

    db_df = X.copy()

    d_gower = compute_query_to_db_distances(q_df, db_df, "gower", categorical_cols=cat_cols)
    d_cos_obs = compute_query_to_db_distances(q_df, db_df, "cosine_observed_only", categorical_cols=cat_cols)
    d_euc_obs = compute_query_to_db_distances(q_df, db_df, "euclidean_observed_only", categorical_cols=cat_cols)
    d_euc_imp = compute_query_to_db_distances(q_df, db_df, "euclidean_modeimpute", categorical_cols=cat_cols)
    d_cos_imp = compute_query_to_db_distances(q_df, db_df, "cosine_modeimpute", categorical_cols=cat_cols)

    # 1. cosine_observed_only is numerically identical to gower
    assert np.allclose(d_gower, d_cos_obs, atol=1e-12)

    # 2. euclidean_observed_only rankings are identical to gower rankings
    for i in range(len(q_df)):
        order_gower = np.argsort(d_gower[i], kind="mergesort")
        order_euc_obs = np.argsort(d_euc_obs[i], kind="mergesort")
        assert np.array_equal(order_gower[:10], order_euc_obs[:10])

    # 3. cosine_modeimpute rankings are identical to euclidean_modeimpute rankings
    for i in range(len(q_df)):
        order_euc_imp = np.argsort(d_euc_imp[i], kind="mergesort")
        order_cos_imp = np.argsort(d_cos_imp[i], kind="mergesort")
        assert np.array_equal(order_euc_imp[:10], order_cos_imp[:10])


def test_missingness_results_structure():
    json_path = REPO_ROOT / "results" / "missingness.json"
    if not json_path.exists():
        pytest.skip("results/missingness.json not yet generated")

    with open(json_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    assert "Research prototype" in data["provenance"]["notice"]
    fractions = data["fractions"]
    for p_str in ["0.0", "0.1", "0.2", "0.3", "0.5", "0.7"]:
        assert p_str in fractions
        f_data = fractions[p_str]
        for v in data["provenance"]["variants"]:
            assert v in f_data["metrics"]
            assert "knn_macro_f1" in f_data["metrics"][v]
            assert "mean_kth_distance_ties" in f_data["metrics"][v]

    # Verify that ties at k=5 increase as missingness p increases
    ties_p0 = fractions["0.0"]["metrics"]["gower"]["mean_kth_distance_ties"]["mean"]
    ties_p7 = fractions["0.7"]["metrics"]["gower"]["mean_kth_distance_ties"]["mean"]
    assert ties_p7 > ties_p0
