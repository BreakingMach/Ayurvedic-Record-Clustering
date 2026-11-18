"""Tests for Part A — Post-hoc scaling ablation on synthetic cohorts."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from ayur_bench.distances import (
    cosine_distance,
    cosine_range_distance,
    euclidean_distance,
    euclidean_range_distance,
    gower_distance,
    gower_zscore_distance,
)

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


@pytest.fixture
def sample_mixed_df() -> pd.DataFrame:
    rng = np.random.default_rng(42)
    n = 20
    return pd.DataFrame(
        {
            "num1": rng.normal(50.0, 10.0, size=n),
            "num2": rng.normal(120.0, 15.0, size=n),
            "cat1": rng.choice(["A", "B", "C"], size=n),
            "cat2": rng.choice(["X", "Y"], size=n),
        }
    )


def test_ablation_distance_properties(sample_mixed_df: pd.DataFrame):
    for func in [gower_zscore_distance, euclidean_range_distance, cosine_range_distance]:
        D = func(sample_mixed_df, numeric_cols=["num1", "num2"], categorical_cols=["cat1", "cat2"])
        assert D.shape == (20, 20)
        assert np.allclose(np.diag(D), 0.0)
        assert np.allclose(D, D.T)
        assert np.all(D >= 0.0)
        assert np.all(np.isfinite(D))


def test_ablation_constant_numeric_graceful():
    df = pd.DataFrame(
        {
            "num_const": [10.0] * 10,
            "cat": ["A", "B"] * 5,
        }
    )
    for func in [gower_zscore_distance, euclidean_range_distance, cosine_range_distance]:
        D = func(df, numeric_cols=["num_const"], categorical_cols=["cat"])
        assert D.shape == (10, 10)
        assert np.all(np.isfinite(D))
        assert np.all(D >= 0.0)


def test_scaling_ablation_results_structure():
    json_path = REPO_ROOT / "results" / "synthetic_scaling_ablation.json"
    if not json_path.exists():
        pytest.skip("results/synthetic_scaling_ablation.json not yet generated")

    with open(json_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    assert data["provenance"]["status"] == "EXPLORATORY and POST-HOC"
    assert "Research prototype" in data["provenance"]["notice"]
    assert len(data["sweeps"]["numeric_cohens_d"]) == 5
    assert len(data["sweeps"]["categorical_eps"]) == 5

    # Check baseline cell
    base_id = data["provenance"]["baseline_cell_id"]
    assert base_id in data["cells"]
    cell = data["cells"][base_id]
    for m in ["gower", "gower_zscore", "euclidean", "euclidean_range", "cosine", "cosine_range"]:
        assert m in cell["metrics"]
        assert "knn_macro_f1" in cell["metrics"][m]
        assert "loo_macro_p_at_5" in cell["metrics"][m]
