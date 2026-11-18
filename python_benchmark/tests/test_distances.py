"""Unit tests for data loading and mixed-type distance matrices."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest
from scipy.stats import spearmanr

from ayur_bench.data import CANONICAL_CLASSES, load_tridosha_dataset
from ayur_bench.distances import (
    cosine_distance,
    euclidean_distance,
    gower_distance,
    hamming_distance,
)


def _sample_mixed_frame(with_missing: bool = False) -> pd.DataFrame:
    df = pd.DataFrame(
        {
            "num_a": [10.0, 20.0, 30.0, 40.0, 50.0, 60.0],
            "num_b": [1.5, 2.0, 2.5, 3.0, 3.5, 4.0],
            "cat_a": ["low", "low", "med", "med", "high", "high"],
            "cat_b": ["x", "y", "x", "z", "y", "z"],
        }
    )
    if with_missing:
        df.loc[0, "num_a"] = np.nan
        df.loc[2, "cat_a"] = None
        df.loc[4, "num_b"] = np.nan
        df.loc[5, "cat_b"] = pd.NA
    return df


def test_data_loader_normalizes_and_reports_duplicate() -> None:
    bundle = load_tridosha_dataset()
    assert bundle.X.shape == (1200, 29)
    assert len(bundle.numeric_cols) == 0
    assert len(bundle.categorical_cols) == 29
    assert set(bundle.y.unique().tolist()) == set(CANONICAL_CLASSES)
    assert bundle.metadata["duplicate_row_count"] == 1
    assert bundle.metadata["duplicates_retained"] is True
    assert bundle.metadata["class_counts"] == {
        "Vata+Pitta": 624,
        "Vata": 264,
        "Pitta": 144,
        "Kapha": 72,
        "Pitta+Kapha": 48,
        "Vata+Kapha": 48,
    }


@pytest.mark.parametrize("with_missing", [False, True])
@pytest.mark.parametrize(
    "metric_fn",
    [gower_distance, euclidean_distance, cosine_distance, hamming_distance],
)
def test_distance_matrix_properties_symmetric_zero_diag_finite(
    metric_fn, with_missing: bool
) -> None:
    """(i) gower, euclidean, cosine (and hamming) are symmetric, zero-diagonal, finite."""
    df = _sample_mixed_frame(with_missing=with_missing)
    D = metric_fn(df)

    assert D.shape == (len(df), len(df))
    assert np.all(np.isfinite(D)), f"{metric_fn.__name__} produced non-finite entries"
    assert np.all(D >= 0.0), f"{metric_fn.__name__} produced negative distances"
    assert np.allclose(D, D.T, atol=1e-12), f"{metric_fn.__name__} is not symmetric"
    assert np.allclose(np.diag(D), 0.0, atol=1e-12), f"{metric_fn.__name__} diagonal is non-zero"


def test_gower_averages_only_mutually_observed_features() -> None:
    df = pd.DataFrame(
        {
            "num": [0.0, 10.0, 10.0],
            "cat": ["a", "a", None],
        }
    )
    D = gower_distance(df)
    # Pair (0, 1): both num (diff=1.0) and cat (diff=0.0) observed -> mean = 0.5
    assert np.isclose(D[0, 1], 0.5)
    # Pair (0, 2): only num observed (diff=1.0) -> mean over observed = 1.0
    assert np.isclose(D[0, 2], 1.0)
    # Pair (1, 2): only num observed (diff=0.0) -> mean over observed = 0.0
    assert np.isclose(D[1, 2], 0.0)


def test_equivalence_on_real_categorical_data() -> None:
    """
    (ii) On the real categorical-only data (Updated_Prakriti_With_Features.csv),
    Gower, Euclidean (one-hot), and Cosine (one-hot) are exact monotone transforms
    of Hamming distance, so pairwise Spearman rank correlation must be >= 0.9999.
    """
    bundle = load_tridosha_dataset()
    X = bundle.X

    D_gower = gower_distance(X, numeric_cols=bundle.numeric_cols, categorical_cols=bundle.categorical_cols)
    D_euc = euclidean_distance(X, numeric_cols=bundle.numeric_cols, categorical_cols=bundle.categorical_cols)
    D_cos = cosine_distance(X, numeric_cols=bundle.numeric_cols, categorical_cols=bundle.categorical_cols)
    D_ham = hamming_distance(X, categorical_cols=bundle.categorical_cols)

    tri = np.triu_indices(len(X), k=1)
    v_g = D_gower[tri]
    v_e = D_euc[tri]
    v_c = D_cos[tri]
    v_h = D_ham[tri]

    assert np.allclose(D_gower, D_ham, atol=1e-12)
    assert np.allclose(D_gower, D_cos, atol=1e-12)

    rho_ge = float(spearmanr(v_g, v_e).statistic)
    rho_gc = float(spearmanr(v_g, v_c).statistic)
    rho_ec = float(spearmanr(v_e, v_c).statistic)

    assert rho_ge >= 0.9999, f"Expected Spearman(Gower, Euclidean) >= 0.9999, got {rho_ge}"
    assert rho_gc >= 0.9999, f"Expected Spearman(Gower, Cosine) >= 0.9999, got {rho_gc}"
    assert rho_ec >= 0.9999, f"Expected Spearman(Euclidean, Cosine) >= 0.9999, got {rho_ec}"


@pytest.mark.parametrize("bad_col", ["Dosha", "dosha", "label", "target", "y"])
@pytest.mark.parametrize(
    "metric_fn",
    [gower_distance, euclidean_distance, cosine_distance, hamming_distance],
)
def test_distance_functions_raise_if_given_label_column(metric_fn, bad_col: str) -> None:
    """(iii) All distance functions must raise ValueError if passed a label column."""
    df = _sample_mixed_frame(with_missing=False)
    df[bad_col] = ["Vata", "Pitta", "Kapha", "Vata", "Pitta", "Kapha"]
    with pytest.raises(ValueError, match="forbidden column"):
        metric_fn(df)
