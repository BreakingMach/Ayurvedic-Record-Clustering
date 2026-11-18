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
        "latent_class",
        "eval_label",
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
    numeric_scaling: str = "zscore",
) -> np.ndarray:
    """
    Encode mixed data for Euclidean and Cosine distances (unsupervised, all rows):
      - Missing numerics are imputed with the column median (0.0 if entirely missing),
        then scaled using either:
          * 'zscore': (filled - mean) / std (0.0 if constant)
          * 'range':  (filled - min) / (max - min) (0.0 if constant)
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
            if numeric_scaling == "zscore":
                mean = float(np.mean(filled))
                std = float(np.std(filled, ddof=0))
                num_block[:, j] = (filled - mean) / std if std > 0.0 else 0.0
            elif numeric_scaling == "range":
                c_min = float(np.min(filled))
                c_max = float(np.max(filled))
                c_range = c_max - c_min
                num_block[:, j] = (filled - c_min) / c_range if c_range > 0.0 else 0.0
            else:
                raise ValueError(f"Unknown numeric_scaling: {numeric_scaling}")
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
    numeric_scaling: str = "range",
    all_missing_pair_distance: float = 1.0,
    forbidden_cols: Optional[Iterable[str]] = None,
) -> np.ndarray:
    """
    Vectorised uniform-weight Gower dissimilarity matrix (N x N) with missing-value support.

    - Numeric features:
      * 'range' (standard): range-normalised |x_ik - x_jk| / (max_k - min_k) across all rows
        (unsupervised, zero label access; constant features contribute 0 dissimilarity).
      * 'zscore' (ablation): standard-deviation normalised |x_ik - x_jk| / std_k.
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
        if numeric_scaling == "range":
            col_scale = float(np.max(arr[valid]) - np.min(arr[valid]))
        elif numeric_scaling == "zscore":
            col_scale = float(np.std(arr[valid], ddof=0))
        else:
            raise ValueError(f"Unknown numeric_scaling: {numeric_scaling}")

        if col_scale > 0.0:
            filled = np.where(valid, arr, 0.0)
            diff = np.abs(filled[:, None] - filled[None, :]) / col_scale
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
    numeric_scaling: str = "zscore",
    forbidden_cols: Optional[Iterable[str]] = None,
) -> np.ndarray:
    """
    Vectorised Euclidean distance matrix (N x N) on scaled numerics + one-hot categoricals.

    numeric_scaling: 'zscore' (standard) or 'range' (ablation).
    Missing numerics are imputed with the column median; missing categoricals with the mode.
    """
    _assert_no_label_columns(df, forbidden_cols=forbidden_cols)
    num_cols, cat_cols = _infer_column_types(df, numeric_cols, categorical_cols)
    X_enc = _encode_mixed_for_vector_metrics(df, num_cols, cat_cols, numeric_scaling=numeric_scaling)
    D = cdist(X_enc, X_enc, metric="euclidean")
    return _finalize_distance_matrix(D)


def cosine_distance(
    df: pd.DataFrame,
    numeric_cols: Optional[Sequence[str]] = None,
    categorical_cols: Optional[Sequence[str]] = None,
    numeric_scaling: str = "zscore",
    forbidden_cols: Optional[Iterable[str]] = None,
) -> np.ndarray:
    """
    Vectorised Cosine distance matrix (N x N) on the exact same encoded matrix as Euclidean.

    numeric_scaling: 'zscore' (standard) or 'range' (ablation).
    Missing numerics are imputed with the column median; missing categoricals with the mode.
    """
    _assert_no_label_columns(df, forbidden_cols=forbidden_cols)
    num_cols, cat_cols = _infer_column_types(df, numeric_cols, categorical_cols)
    X_enc = _encode_mixed_for_vector_metrics(df, num_cols, cat_cols, numeric_scaling=numeric_scaling)
    D = cosine_distances(X_enc)
    D = np.clip(D, 0.0, 2.0)
    return _finalize_distance_matrix(D)


def gower_zscore_distance(
    df: pd.DataFrame,
    numeric_cols: Optional[Sequence[str]] = None,
    categorical_cols: Optional[Sequence[str]] = None,
    all_missing_pair_distance: float = 1.0,
    forbidden_cols: Optional[Iterable[str]] = None,
) -> np.ndarray:
    """Post-hoc ablation: Gower dissimilarity with z-score (std-dev normalised) numerics."""
    return gower_distance(
        df,
        numeric_cols=numeric_cols,
        categorical_cols=categorical_cols,
        numeric_scaling="zscore",
        all_missing_pair_distance=all_missing_pair_distance,
        forbidden_cols=forbidden_cols,
    )


def euclidean_range_distance(
    df: pd.DataFrame,
    numeric_cols: Optional[Sequence[str]] = None,
    categorical_cols: Optional[Sequence[str]] = None,
    forbidden_cols: Optional[Iterable[str]] = None,
) -> np.ndarray:
    """Post-hoc ablation: Euclidean distance with range-normalised [0, 1] numerics."""
    return euclidean_distance(
        df,
        numeric_cols=numeric_cols,
        categorical_cols=categorical_cols,
        numeric_scaling="range",
        forbidden_cols=forbidden_cols,
    )


def cosine_range_distance(
    df: pd.DataFrame,
    numeric_cols: Optional[Sequence[str]] = None,
    categorical_cols: Optional[Sequence[str]] = None,
    forbidden_cols: Optional[Iterable[str]] = None,
) -> np.ndarray:
    """Post-hoc ablation: Cosine distance with range-normalised [0, 1] numerics."""
    return cosine_distance(
        df,
        numeric_cols=numeric_cols,
        categorical_cols=categorical_cols,
        numeric_scaling="range",
        forbidden_cols=forbidden_cols,
    )


def compute_query_to_db_distances(
    query_df: pd.DataFrame,
    db_df: pd.DataFrame,
    variant: str,
    numeric_cols: Optional[Sequence[str]] = None,
    categorical_cols: Optional[Sequence[str]] = None,
    forbidden_cols: Optional[Iterable[str]] = None,
) -> np.ndarray:
    """
    Compute pairwise distances between Q query rows (query_df) and N database records (db_df).

    Variants supported:
      - 'gower': pairwise over features observed in query (and db)
      - 'euclidean_modeimpute': missing features in query imputed with database mode (categoricals) / median (numerics)
      - 'cosine_modeimpute': exact same mode-imputed representation, cosine distance
      - 'euclidean_observed_only': Euclidean distance computed only on features observed in the query
      - 'cosine_observed_only': Cosine distance computed only on features observed in the query
    Returns:
      (Q, N) np.ndarray of pairwise distances.
    """
    _assert_no_label_columns(query_df, forbidden_cols=forbidden_cols)
    _assert_no_label_columns(db_df, forbidden_cols=forbidden_cols)
    num_cols, cat_cols = _infer_column_types(db_df, numeric_cols, categorical_cols)

    q_len = len(query_df)
    db_len = len(db_df)

    if variant == "gower":
        num_sum = np.zeros((q_len, db_len), dtype=np.float64)
        den_sum = np.zeros((q_len, db_len), dtype=np.float64)

        for col in num_cols:
            db_arr = pd.to_numeric(db_df[col], errors="coerce").to_numpy(dtype=np.float64)
            q_arr = pd.to_numeric(query_df[col], errors="coerce").to_numpy(dtype=np.float64)
            db_val = np.isfinite(db_arr)
            q_val = np.isfinite(q_arr)
            pair_valid = np.outer(q_val, db_val)

            if np.any(db_val):
                c_range = float(np.max(db_arr[db_val]) - np.min(db_arr[db_val]))
                if c_range > 0.0:
                    diff = np.abs(q_arr[:, None] - db_arr[None, :]) / c_range
                    num_sum += np.where(pair_valid, diff, 0.0)
            den_sum += pair_valid

        for col in cat_cols:
            db_s = db_df[col].astype("object")
            q_s = query_df[col].astype("object")
            db_val = (~pd.isna(db_s)).to_numpy()
            q_val = (~pd.isna(q_s)).to_numpy()
            pair_valid = np.outer(q_val, db_val)

            q_vals = q_s.to_numpy()
            db_vals = db_s.to_numpy()
            diff = (q_vals[:, None] != db_vals[None, :]).astype(np.float64)
            num_sum += np.where(pair_valid, diff, 0.0)
            den_sum += pair_valid

        D = np.where(den_sum > 0.0, num_sum / np.maximum(den_sum, 1.0), 1.0)
        return np.maximum(D, 0.0)

    elif variant in ("euclidean_modeimpute", "cosine_modeimpute"):
        q_blocks: List[np.ndarray] = []
        db_blocks: List[np.ndarray] = []

        if len(num_cols) > 0:
            q_num = np.empty((q_len, len(num_cols)), dtype=np.float64)
            db_num = np.empty((db_len, len(num_cols)), dtype=np.float64)
            for j, col in enumerate(num_cols):
                db_arr = pd.to_numeric(db_df[col], errors="coerce").to_numpy(dtype=np.float64)
                q_arr = pd.to_numeric(query_df[col], errors="coerce").to_numpy(dtype=np.float64)
                db_finite = np.isfinite(db_arr)
                if not np.any(db_finite):
                    q_num[:, j] = 0.0
                    db_num[:, j] = 0.0
                    continue
                median = float(np.median(db_arr[db_finite]))
                filled_db = np.where(db_finite, db_arr, median)
                filled_q = np.where(np.isfinite(q_arr), q_arr, median)
                mean = float(np.mean(filled_db))
                std = float(np.std(filled_db, ddof=0))
                db_num[:, j] = (filled_db - mean) / std if std > 0.0 else 0.0
                q_num[:, j] = (filled_q - mean) / std if std > 0.0 else 0.0
            q_blocks.append(q_num)
            db_blocks.append(db_num)

        for col in cat_cols:
            db_s = db_df[col].astype("object")
            q_s = query_df[col].astype("object")
            db_missing = pd.isna(db_s)
            q_missing = pd.isna(q_s)
            observed_db = db_s[~db_missing].astype(str)
            if len(observed_db) == 0:
                mode_val = "__MISSING__"
            else:
                counts = observed_db.value_counts()
                max_cnt = counts.max()
                mode_val = sorted(counts[counts == max_cnt].index.tolist())[0]

            filled_db = np.where(db_missing.to_numpy(), mode_val, db_s.astype(str).to_numpy())
            filled_q = np.where(q_missing.to_numpy(), mode_val, q_s.astype(str).to_numpy())
            levels = sorted(set(filled_db.tolist()).union(set(filled_q.tolist())))
            lvl_to_idx = {l: i for i, l in enumerate(levels)}

            ohe_db = np.zeros((db_len, len(levels)), dtype=np.float64)
            ohe_db[np.arange(db_len), [lvl_to_idx[v] for v in filled_db]] = 1.0

            ohe_q = np.zeros((q_len, len(levels)), dtype=np.float64)
            ohe_q[np.arange(q_len), [lvl_to_idx[v] for v in filled_q]] = 1.0

            db_blocks.append(ohe_db)
            q_blocks.append(ohe_q)

        X_db = np.hstack(db_blocks)
        X_q = np.hstack(q_blocks)

        if variant == "euclidean_modeimpute":
            return cdist(X_q, X_db, metric="euclidean")
        else:
            D = cdist(X_q, X_db, metric="cosine")
            D = np.nan_to_num(D, nan=1.0)
            return np.clip(D, 0.0, 2.0)

    elif variant in ("euclidean_observed_only", "cosine_observed_only"):
        D_out = np.zeros((q_len, db_len), dtype=np.float64)
        for i in range(q_len):
            q_row = query_df.iloc[i]
            # Find which features are observed for this specific query
            obs_num = [c for c in num_cols if pd.notna(q_row[c])]
            obs_cat = [c for c in cat_cols if pd.notna(q_row[c])]

            if len(obs_num) + len(obs_cat) == 0:
                D_out[i, :] = 1.0
                continue

            # Encode query and db on observed features only
            q_parts: List[np.ndarray] = []
            db_parts: List[np.ndarray] = []

            if len(obs_num) > 0:
                q_num = np.empty((1, len(obs_num)), dtype=np.float64)
                db_num = np.empty((db_len, len(obs_num)), dtype=np.float64)
                for j, col in enumerate(obs_num):
                    db_arr = pd.to_numeric(db_df[col], errors="coerce").to_numpy(dtype=np.float64)
                    db_finite = np.isfinite(db_arr)
                    median = float(np.median(db_arr[db_finite])) if np.any(db_finite) else 0.0
                    filled_db = np.where(db_finite, db_arr, median)
                    mean = float(np.mean(filled_db))
                    std = float(np.std(filled_db, ddof=0))
                    val_q = float(pd.to_numeric(q_row[col], errors="coerce"))
                    q_num[0, j] = (val_q - mean) / std if std > 0.0 else 0.0
                    db_num[:, j] = (filled_db - mean) / std if std > 0.0 else 0.0
                q_parts.append(q_num)
                db_parts.append(db_num)

            for col in obs_cat:
                db_s = db_df[col].astype("object")
                db_missing = pd.isna(db_s)
                observed_db = db_s[~db_missing].astype(str)
                levels = sorted(set(observed_db.tolist()).union({str(q_row[col])}))
                lvl_to_idx = {l: idx for idx, l in enumerate(levels)}

                ohe_db = np.zeros((db_len, len(levels)), dtype=np.float64)
                valid_db_idx = np.where(~db_missing.to_numpy())[0]
                codes = [lvl_to_idx[str(db_s.iloc[idx])] for idx in valid_db_idx]
                ohe_db[valid_db_idx, codes] = 1.0

                ohe_q = np.zeros((1, len(levels)), dtype=np.float64)
                ohe_q[0, lvl_to_idx[str(q_row[col])]] = 1.0

                q_parts.append(ohe_q)
                db_parts.append(ohe_db)

            X_q = np.hstack(q_parts)
            X_db = np.hstack(db_parts)

            if variant == "euclidean_observed_only":
                D_out[i, :] = cdist(X_q, X_db, metric="euclidean")[0]
            else:
                dist = cdist(X_q, X_db, metric="cosine")[0]
                dist = np.nan_to_num(dist, nan=1.0)
                D_out[i, :] = np.clip(dist, 0.0, 2.0)

        return D_out

    else:
        raise ValueError(f"Unknown metric variant: {variant}")


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
