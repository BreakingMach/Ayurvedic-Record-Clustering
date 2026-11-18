"""Tests for Part D — Parity fixtures verification against Python implementation."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from ayur_bench.data import load_tridosha_dataset
from ayur_bench.distances import compute_query_to_db_distances
from ayur_bench.synth import NUMERIC_VITAL_COLS

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


@pytest.fixture
def parity_fixtures():
    json_path = REPO_ROOT / "tests" / "fixtures" / "parity.json"
    if not json_path.exists():
        pytest.skip(f"Parity fixture file {json_path} does not exist.")
    with open(json_path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def test_parity_fixtures_counts_and_structure(parity_fixtures):
    assert "datasets" in parity_fixtures
    datasets = parity_fixtures["datasets"]
    assert "real" in datasets
    assert "synthetic" in datasets

    assert len(datasets["real"]["queries"]) == 60
    assert len(datasets["synthetic"]["queries"]) == 60

    for d_name in ("real", "synthetic"):
        queries = datasets[d_name]["queries"]
        for q in queries:
            assert "query_id" in q
            assert "query_type" in q
            assert "metrics" in q
            for v in [
                "gower",
                "euclidean_modeimpute",
                "cosine_modeimpute",
                "euclidean_observed_only",
                "cosine_observed_only",
            ]:
                assert v in q["metrics"]
                assert len(q["metrics"][v]["neighbor_indices"]) == 10
                assert len(q["metrics"][v]["neighbor_distances"]) == 10


def test_parity_fixtures_recomputation_real(parity_fixtures):
    """Verify that recomputing distances in Python matches the fixture top-10 neighbor indices."""
    bundle = load_tridosha_dataset()
    db_df = bundle.X
    cat_cols = list(bundle.categorical_cols)

    queries = parity_fixtures["datasets"]["real"]["queries"][:5]  # verify first 5 queries
    for q in queries:
        q_df = pd.DataFrame([q["traits"]])
        for v in ["gower", "euclidean_modeimpute", "cosine_modeimpute", "euclidean_observed_only", "cosine_observed_only"]:
            d_vec = compute_query_to_db_distances(q_df, db_df, variant=v, categorical_cols=cat_cols)[0]
            order = np.argsort(d_vec, kind="mergesort")
            expected_indices = q["metrics"][v]["neighbor_indices"]
            assert list(order[:10]) == expected_indices
