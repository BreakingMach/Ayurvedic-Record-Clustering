"""Paired nonparametric statistical comparisons with Holm-Bonferroni correction."""

from __future__ import annotations

from itertools import combinations
from typing import Any, Dict, List, Mapping, Sequence

import numpy as np
from scipy.stats import rankdata, wilcoxon


def summarize_scores(values: Sequence[float]) -> Dict[str, float]:
    """Return sample mean, sample std (ddof=1), and count."""
    arr = np.asarray(values, dtype=np.float64)
    if arr.size == 0:
        raise ValueError("Cannot summarize an empty score sequence.")
    return {
        "mean": float(np.mean(arr)),
        "std": float(np.std(arr, ddof=1)) if arr.size > 1 else 0.0,
        "n": int(arr.size),
    }


def paired_effect_size(a: Sequence[float], b: Sequence[float]) -> Dict[str, float]:
    """
    Compute simple paired effect sizes for (a - b):
      - mean_diff: mean(a - b)
      - cohen_dz: mean(a - b) / std(a - b, ddof=1)  (0.0 when all diffs are identical)
      - rank_biserial_r: matched-pairs rank-biserial correlation in [-1, 1]
    """
    arr_a = np.asarray(a, dtype=np.float64)
    arr_b = np.asarray(b, dtype=np.float64)
    if arr_a.shape != arr_b.shape:
        raise ValueError(f"Paired arrays must match shape; got {arr_a.shape} vs {arr_b.shape}")
    diff = arr_a - arr_b
    mean_diff = float(np.mean(diff))
    std_diff = float(np.std(diff, ddof=1)) if diff.size > 1 else 0.0
    cohen_dz = float(mean_diff / std_diff) if std_diff > 1e-12 else 0.0

    nz = diff[np.abs(diff) > 1e-12]
    if nz.size == 0:
        rank_biserial = 0.0
    else:
        ranks = rankdata(np.abs(nz))
        w_pos = float(np.sum(ranks[nz > 0]))
        w_neg = float(np.sum(ranks[nz < 0]))
        rank_biserial = float((w_pos - w_neg) / (w_pos + w_neg))

    return {
        "mean_diff": mean_diff,
        "cohen_dz": cohen_dz,
        "rank_biserial_r": rank_biserial,
    }


def holm_bonferroni(p_values: Sequence[float]) -> List[float]:
    """Step-down Holm-Bonferroni p-value adjustment preserving original order."""
    m = len(p_values)
    if m == 0:
        return []
    arr = np.asarray(p_values, dtype=np.float64)
    order = np.argsort(arr, kind="mergesort")
    adjusted = np.empty(m, dtype=np.float64)
    running_max = 0.0
    for rank_idx, orig_idx in enumerate(order):
        scaled = float(arr[orig_idx]) * (m - rank_idx)
        running_max = max(running_max, scaled)
        adjusted[orig_idx] = min(1.0, running_max)
    return [float(v) for v in adjusted.tolist()]


def compare_metrics_paired(
    metric_scores: Mapping[str, Sequence[float]],
    alpha: float = 0.05,
) -> Dict[str, Any]:
    """
    Run all pairwise two-sided paired Wilcoxon signed-rank tests across seeds/folds
    with Holm-Bonferroni correction, plus per-metric summaries and effect sizes.
    """
    names = list(metric_scores.keys())
    if len(names) < 2:
        raise ValueError("compare_metrics_paired requires at least two metrics.")

    lengths = {len(metric_scores[k]) for k in names}
    if len(lengths) != 1:
        raise ValueError(f"All metrics must have identical paired sample counts; got {lengths}")

    summaries = {k: summarize_scores(metric_scores[k]) for k in names}
    pairs = list(combinations(names, 2))
    raw_rows: List[Dict[str, Any]] = []
    raw_pvals: List[float] = []

    for m_a, m_b in pairs:
        a = np.asarray(metric_scores[m_a], dtype=np.float64)
        b = np.asarray(metric_scores[m_b], dtype=np.float64)
        diff = a - b
        eff = paired_effect_size(a, b)

        if np.all(np.abs(diff) <= 1e-12):
            stat = 0.0
            p_raw = 1.0
        else:
            res = wilcoxon(diff, zero_method="wilcox", alternative="two-sided")
            stat = float(res.statistic)
            p_raw = float(res.pvalue)

        raw_pvals.append(p_raw)
        raw_rows.append(
            {
                "metric_a": m_a,
                "metric_b": m_b,
                "mean_a": summaries[m_a]["mean"],
                "std_a": summaries[m_a]["std"],
                "mean_b": summaries[m_b]["mean"],
                "std_b": summaries[m_b]["std"],
                "mean_diff": eff["mean_diff"],
                "cohen_dz": eff["cohen_dz"],
                "rank_biserial_r": eff["rank_biserial_r"],
                "wilcoxon_stat": stat,
                "p_raw": p_raw,
            }
        )

    p_holm = holm_bonferroni(raw_pvals)
    for row, adj in zip(raw_rows, p_holm):
        row["p_holm"] = adj
        row["significant_holm"] = bool(adj < alpha)

    return {
        "alpha": float(alpha),
        "correction": "holm",
        "summaries": summaries,
        "pairwise": raw_rows,
    }
