"""Vectorised, missing-aware mixed-type distance matrices (unsupervised, zero label access)."""

from __future__ import annotations

from typing import Iterable, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
from scipy.spatial.distance import cdist
from sklearn.metrics.pairwise import cosine_distances

FORBIDDEN_LABEL_NAMES = frozenset(
    {
        "dosha",
        "label",
        "labels",
        "target",
        "y",
        "y_vaidya",
        "class",
        "prakriti",
    }
)


def _assert_no_label_columns(
    df: pd.DataFrame,
    forbidden_cols: Optional[Iterable[str]] = None,
) -> None:
    """Reject any input DataFrame that appears to contain a target/label column (R2)."""
    forbidden = set(FORBIDDEN_LABEL_NAMES)
    if forbidden_cols is not None:
        forbidden.update(str(c).strip().lower() for c in forbidden_cols)
    found = [col for col in df.columns if str(col).strip().lower() in forbidden]
    if found:
        raise ValueError(
            f"Distance functions must not receive label columns; found forbidden column(s): {found}"
        )


def _infer_column_types(
    df: pd.DataFrame,
    numeric_cols: Optional[Sequence[str]] = None,
    categorical_cols: Optional[Sequence[str]] = None,
) -> Tuple[List[str], List[str]]:
    if numeric_cols is None and categorical_cols is None:
        num = df.select_dtypes(include=["number"]).columns.tolist()
        cat = [c for c in df.columns if c not in num]
        return num, cat
    num = list(numeric_cols) if numeric_cols is not None else []
    cat = list(categorical_cols) if categorical_cols is not None else []
    if numeric_cols is None:
        num = [c for c in df.columns if c not in cat]
    if categorical_cols is None:
        cat = [c for c in df.columns if c not in num]
    return num, cat


def _finalize_distance_matrix(D: np.ndarray) -> np.ndarray:
    """Enforce exact symmetry, zero diagonal, non-negativity, and finite float64 values."""
    D = np.asarray(D, dtype=np.float64)
    D = 0.5 * (D + D.T)
    D = np.maximum(D, 0.0)
    np.fill_diagonal(D, 0.0)
    if not np.all(np.isfinite(D)):
        raise ValueError("Computed distance matrix contains non-finite values.")
    return D


def _encode_mixed_for_vector_metrics(
    df: pd.DataFrame,
    numeric_cols: Sequence[str],
    categorical_cols: Sequence[str],
) -> np.ndarray:
    """
    Encode mixed data for Euclidean and Cosine distances (unsupervised, all rows):
      - Missing numerics are imputed with the column median (0.0 if entirely missing),
        then z-scored using full-column mean and population std (0.0 if constant).
      - Missing categoricals are imputed with the column mode (deterministic alphabetical
        tie-break; '__MISSING__' if entirely missing), then one-hot encoded retaining all
        sorted levels so every row has constant categorical L2 norm.
    """
    blocks: List[np.ndarray] = []
    n = len(df)

    if len(numeric_cols) > 0:
        num_block = np.empty((n, len(numeric_cols)), dtype=np.float64)
        for j, col in enumerate(numeric_cols):
            arr = pd.to_numeric(df[col], errors="coerce").to_numpy(dtype=np.float64)
            finite_mask = np.isfinite(arr)
            if not np.any(finite_mask):
                num_block[:, j] = 0.0
                continue
            median = float(np.median(arr[finite_mask]))
            filled = np.where(finite_mask, arr, median)
            mean = float(np.mean(filled))
            std = float(np.std(filled, ddof=0))
            num_block[:, j] = (filled - mean) / std if std > 0.0 else 0.0
        blocks.append(num_block)

    for col in categorical_cols:
        series = df[col].astype("object")
        missing_mask = pd.isna(series)
        observed = series[~missing_mask].astype(str)
        if len(observed) == 0:
            mode_val = "__MISSING__"
        else:
            counts = observed.value_counts()
            max_cnt = counts.max()
            # Deterministic tie-break: smallest lexicographic value among tied modes
            mode_val = sorted(counts[counts == max_cnt].index.tolist())[0]

        filled_vals = np.where(missing_mask.to_numpy(), mode_val, series.astype(str).to_numpy())
        levels = sorted(set(filled_vals.tolist()))
        level_to_idx = {lvl: idx for idx, lvl in enumerate(levels)}
        codes = np.array([level_to_idx[v] for v in filled_vals], dtype=np.int64)
        ohe = np.zeros((n, len(levels)), dtype=np.float64)
        ohe[np.arange(n), codes] = 1.0
        blocks.append(ohe)

    if not blocks:
        raise ValueError("No feature columns available to compute distances.")
    return np.hstack(blocks)


def gower_distance(
    df: pd.DataFrame,
    numeric_cols: Optional[Sequence[str]] = None,
    categorical_cols: Optional[Sequence[str]] = None,
    all_missing_pair_distance: float = 1.0,
    forbidden_cols: Optional[Iterable[str]] = None,
) -> np.ndarray:
    """
    Vectorised uniform-weight Gower dissimilarity matrix (N x N) with missing-value support.

    - Numeric features: range-normalised |x_ik - x_jk| / (max_k - min_k) across all rows
      (unsupervised, zero label access; constant features contribute 0 dissimilarity).
    - Categorical features: simple matching (0 if equal, 1 if unequal).
    - Missing values: pairwise average is computed strictly over features observed in
      BOTH rows i and j. If two distinct rows share zero mutually observed features,
      distance falls back to `all_missing_pair_distance` (default 1.0).
    """
    _assert_no_label_columns(df, forbidden_cols=forbidden_cols)
    num_cols, cat_cols = _infer_column_types(df, numeric_cols, categorical_cols)
    if len(num_cols) + len(cat_cols) == 0:
        raise ValueError("gower_distance requires at least one feature column.")

    n = len(df)
    num_sum = np.zeros((n, n), dtype=np.float64)
    den_sum = np.zeros((n, n), dtype=np.float64)

    for col in num_cols:
        arr = pd.to_numeric(df[col], errors="coerce").to_numpy(dtype=np.float64)
        valid = np.isfinite(arr)
        if not np.any(valid):
            continue
        pair_valid = np.outer(valid, valid)
        col_range = float(np.max(arr[valid]) - np.min(arr[valid]))
        if col_range > 0.0:
            filled = np.where(valid, arr, 0.0)
            diff = np.abs(filled[:, None] - filled[None, :]) / col_range
            num_sum += np.where(pair_valid, diff, 0.0)
        den_sum += pair_valid

    for col in cat_cols:
        series = df[col].astype("object")
        valid = (~pd.isna(series)).to_numpy()
        if not np.any(valid):
            continue
        pair_valid = np.outer(valid, valid)
        codes = pd.Categorical(series.where(valid, None)).codes
        diff = (codes[:, None] != codes[None, :]).astype(np.float64)
        num_sum += np.where(pair_valid, diff, 0.0)
        den_sum += pair_valid

    D = np.where(den_sum > 0.0, num_sum / np.maximum(den_sum, 1.0), float(all_missing_pair_distance))
    return _finalize_distance_matrix(D)


def euclidean_distance(
    df: pd.DataFrame,
    numeric_cols: Optional[Sequence[str]] = None,
    categorical_cols: Optional[Sequence[str]] = None,
    forbidden_cols: Optional[Iterable[str]] = None,
) -> np.ndarray:
    """
    Vectorised Euclidean distance matrix (N x N) on z-scored numerics + one-hot categoricals.

    Missing numerics are imputed with the column median; missing categoricals with the mode.
    """
    _assert_no_label_columns(df, forbidden_cols=forbidden_cols)
    num_cols, cat_cols = _infer_column_types(df, numeric_cols, categorical_cols)
    X_enc = _encode_mixed_for_vector_metrics(df, num_cols, cat_cols)
    D = cdist(X_enc, X_enc, metric="euclidean")
    return _finalize_distance_matrix(D)


def cosine_distance(
    df: pd.DataFrame,
    numeric_cols: Optional[Sequence[str]] = None,
    categorical_cols: Optional[Sequence[str]] = None,
    forbidden_cols: Optional[Iterable[str]] = None,
) -> np.ndarray:
    """
    Vectorised Cosine distance matrix (N x N) on the exact same encoded matrix as Euclidean.

    Missing numerics are imputed with the column median; missing categoricals with the mode.
    """
    _assert_no_label_columns(df, forbidden_cols=forbidden_cols)
    num_cols, cat_cols = _infer_column_types(df, numeric_cols, categorical_cols)
    X_enc = _encode_mixed_for_vector_metrics(df, num_cols, cat_cols)
    D = cosine_distances(X_enc)
    D = np.clip(D, 0.0, 2.0)
    return _finalize_distance_matrix(D)


def hamming_distance(
    df: pd.DataFrame,
    categorical_cols: Optional[Sequence[str]] = None,
    all_missing_pair_distance: float = 1.0,
    forbidden_cols: Optional[Iterable[str]] = None,
) -> np.ndarray:
    """
    Reference Hamming (simple matching) dissimilarity matrix (N x N) for categorical columns only.

    Averages mismatches strictly over categorical features present in both rows.
    """
    _assert_no_label_columns(df, forbidden_cols=forbidden_cols)
    _, cat_cols = _infer_column_types(df, numeric_cols=[], categorical_cols=categorical_cols)
    if categorical_cols is None:
        cat_cols = df.select_dtypes(exclude=["number"]).columns.tolist()
    if len(cat_cols) == 0:
        raise ValueError("hamming_distance requires at least one categorical column.")

    n = len(df)
    num_sum = np.zeros((n, n), dtype=np.float64)
    den_sum = np.zeros((n, n), dtype=np.float64)

    for col in cat_cols:
        series = df[col].astype("object")
        valid = (~pd.isna(series)).to_numpy()
        if not np.any(valid):
            continue
        pair_valid = np.outer(valid, valid)
        codes = pd.Categorical(series.where(valid, None)).codes
        diff = (codes[:, None] != codes[None, :]).astype(np.float64)
        num_sum += np.where(pair_valid, diff, 0.0)
        den_sum += pair_valid

    D = np.where(den_sum > 0.0, num_sum / np.maximum(den_sum, 1.0), float(all_missing_pair_distance))
    return _finalize_distance_matrix(D)
