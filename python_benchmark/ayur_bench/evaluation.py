"""Leak-free evaluation routines operating strictly on precomputed distance matrices."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Sequence

import numpy as np
import pandas as pd
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics import (
    accuracy_score,
    adjusted_rand_score,
    f1_score,
    normalized_mutual_info_score,
    silhouette_score,
)
from sklearn.model_selection import RepeatedStratifiedKFold
from sklearn.neighbors import KNeighborsClassifier

from .data import load_config


def _validate_matrix_and_labels(D: np.ndarray, y: Sequence[Any]) -> tuple[np.ndarray, np.ndarray]:
    D_arr = np.asarray(D, dtype=np.float64)
    y_arr = np.asarray(y)
    if D_arr.ndim != 2 or D_arr.shape[0] != D_arr.shape[1]:
        raise ValueError(f"Distance matrix must be square (N, N); got shape {D_arr.shape}")
    if D_arr.shape[0] != len(y_arr):
        raise ValueError(
            f"Distance matrix size {D_arr.shape[0]} does not match label length {len(y_arr)}"
        )
    if not np.all(np.isfinite(D_arr)):
        raise ValueError("Distance matrix contains non-finite values.")
    return D_arr, y_arr


def evaluate_knn_cv(
    D: np.ndarray,
    y: Sequence[Any],
    n_neighbors: int = 5,
    n_splits: int = 5,
    n_repeats: int = 3,
    random_state: int = 42,
) -> Dict[str, Any]:
    """
    Repeated stratified k-fold kNN (metric='precomputed') macro-F1 and accuracy.

    Evaluates strictly out-of-fold using D[test, train] against training labels y[train].
    """
    D_arr, y_arr = _validate_matrix_and_labels(D, y)
    rskf = RepeatedStratifiedKFold(
        n_splits=n_splits,
        n_repeats=n_repeats,
        random_state=random_state,
    )

    fold_macro_f1: List[float] = []
    fold_accuracy: List[float] = []

    for train_idx, test_idx in rskf.split(np.zeros(len(y_arr)), y_arr):
        D_train = D_arr[np.ix_(train_idx, train_idx)]
        D_test = D_arr[np.ix_(test_idx, train_idx)]

        clf = KNeighborsClassifier(n_neighbors=n_neighbors, metric="precomputed")
        clf.fit(D_train, y_arr[train_idx])
        preds = clf.predict(D_test)

        fold_macro_f1.append(float(f1_score(y_arr[test_idx], preds, average="macro", zero_division=0)))
        fold_accuracy.append(float(accuracy_score(y_arr[test_idx], preds)))

    repeat_macro_f1 = [
        float(np.mean(fold_macro_f1[r * n_splits : (r + 1) * n_splits]))
        for r in range(n_repeats)
    ]
    repeat_accuracy = [
        float(np.mean(fold_accuracy[r * n_splits : (r + 1) * n_splits]))
        for r in range(n_repeats)
    ]

    return {
        "n_neighbors": int(n_neighbors),
        "n_splits": int(n_splits),
        "n_repeats": int(n_repeats),
        "random_state": int(random_state),
        "fold_macro_f1": fold_macro_f1,
        "fold_accuracy": fold_accuracy,
        "repeat_macro_f1": repeat_macro_f1,
        "repeat_accuracy": repeat_accuracy,
        "macro_f1_mean": float(np.mean(fold_macro_f1)),
        "macro_f1_std": float(np.std(fold_macro_f1, ddof=1)) if len(fold_macro_f1) > 1 else 0.0,
        "accuracy_mean": float(np.mean(fold_accuracy)),
        "accuracy_std": float(np.std(fold_accuracy, ddof=1)) if len(fold_accuracy) > 1 else 0.0,
    }


def evaluate_loo_retrieval(
    D: np.ndarray,
    y: Sequence[Any],
    ks: Sequence[int] = (1, 5, 10),
    smallest_n_classes: int = 3,
) -> Dict[str, Any]:
    """
    Leave-one-out retrieval Precision@k (macro-averaged over classes + per-class + 3 smallest classes).

    Tie-breaking policy:
      Self-distances are masked to +inf. Neighbors are ranked using `np.argsort(..., kind='mergesort')`,
      which is deterministic and breaks exact distance ties by ascending row index.
    """
    D_arr, y_arr = _validate_matrix_and_labels(D, y)
    n = len(y_arr)
    max_k = max(ks)
    if max_k >= n:
        raise ValueError(f"Requested k={max_k} must be strictly less than N={n}")

    D_work = D_arr.copy()
    np.fill_diagonal(D_work, np.inf)
    # Deterministic stable sort: exact distance ties broken by ascending original row index
    order = np.argsort(D_work, axis=1, kind="mergesort")

    classes, counts = np.unique(y_arr, return_counts=True)
    class_count_map = {str(c): int(cnt) for c, cnt in zip(classes, counts)}
    # Smallest N classes ordered by (count ascending, class name ascending)
    smallest_classes = [
        c for c, _ in sorted(class_count_map.items(), key=lambda kv: (kv[1], kv[0]))[:smallest_n_classes]
    ]

    per_class: Dict[str, Dict[str, float]] = {str(c): {"count": class_count_map[str(c)]} for c in classes}
    macro_scores: Dict[str, float] = {}
    micro_scores: Dict[str, float] = {}

    for k in ks:
        top_k_labels = y_arr[order[:, :k]]
        hits_per_row = np.mean(top_k_labels == y_arr[:, None], axis=1)
        micro_scores[f"p_at_{k}"] = float(np.mean(hits_per_row))

        cls_vals: List[float] = []
        for c in classes:
            c_key = str(c)
            mask = y_arr == c
            c_mean = float(np.mean(hits_per_row[mask]))
            per_class[c_key][f"p_at_{k}"] = c_mean
            cls_vals.append(c_mean)
        macro_scores[f"p_at_{k}"] = float(np.mean(cls_vals))

    smallest_report = {c: per_class[c] for c in smallest_classes}

    return {
        "ks": [int(k) for k in ks],
        "tie_breaking": "deterministic stable argsort (mergesort; ascending row index on ties)",
        "macro": macro_scores,
        "micro": micro_scores,
        "per_class": per_class,
        "smallest_classes": smallest_report,
    }


def evaluate_clustering(
    D: np.ndarray,
    y: Sequence[Any],
    linkages: Sequence[str] = ("average", "complete"),
) -> Dict[str, Any]:
    """
    Agglomerative clustering (precomputed distance) at k = number of unique classes.

    Linkages are fixed by configuration and NEVER selected using labels (R2).
    Silhouette is computed inside the given distance space and explicitly flagged as
    'not comparable across metrics'.
    """
    D_arr, y_arr = _validate_matrix_and_labels(D, y)
    n_clusters = int(len(np.unique(y_arr)))

    results: Dict[str, Any] = {
        "n_clusters": n_clusters,
        "silhouette_note": "not comparable across metrics",
        "linkages": {},
    }

    for linkage in linkages:
        model = AgglomerativeClustering(
            n_clusters=n_clusters,
            metric="precomputed",
            linkage=linkage,
        )
        preds = model.fit_predict(D_arr)
        ari = float(adjusted_rand_score(y_arr, preds))
        nmi = float(normalized_mutual_info_score(y_arr, preds))
        sil = (
            float(silhouette_score(D_arr, preds, metric="precomputed"))
            if len(np.unique(preds)) > 1
            else 0.0
        )
        results["linkages"][linkage] = {
            "ari": ari,
            "nmi": nmi,
            "silhouette": sil,
            "silhouette_note": "not comparable across metrics",
            "cluster_sizes": [int(v) for v in np.bincount(preds).tolist()],
        }

    return results


def evaluate_distance_matrix(
    D: np.ndarray,
    y: Sequence[Any],
    config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Run full config-driven evaluation suite (kNN CV, LOO retrieval, clustering)."""
    cfg = config if config is not None else load_config()
    eval_cfg = cfg["evaluation"]
    knn_cfg = eval_cfg["knn"]
    ret_cfg = eval_cfg["retrieval"]
    clu_cfg = eval_cfg["clustering"]

    return {
        "knn_cv": evaluate_knn_cv(
            D,
            y,
            n_neighbors=int(knn_cfg["n_neighbors"]),
            n_splits=int(knn_cfg["n_splits"]),
            n_repeats=int(knn_cfg["n_repeats"]),
            random_state=int(knn_cfg["random_state"]),
        ),
        "loo_retrieval": evaluate_loo_retrieval(
            D,
            y,
            ks=tuple(int(k) for k in ret_cfg["ks"]),
            smallest_n_classes=int(ret_cfg.get("smallest_n_classes", 3)),
        ),
        "clustering": evaluate_clustering(
            D,
            y,
            linkages=tuple(clu_cfg["linkages"]),
        ),
    }
