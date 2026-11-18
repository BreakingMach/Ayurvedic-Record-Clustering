#!/usr/bin/env python3
"""
Analyze completed practitioner blind-rating sheets against the hidden answer key.

Reports:
  1. Mean +/- std (and median) clinical similarity rating by true neighbour rank (1..5),
     plus Spearman rank correlation between neighbour rank and clinical rating.
  2. Agreement with the dataset-provided Dosha label (same vs different label rating
     distributions, Mann-Whitney U test, and binary high-similarity >= 4 agreement).
  3. Inter-rater agreement when >= 2 completed reviewer sheets are provided:
     pairwise quadratic-weighted Cohen's kappa, pairwise Spearman rho, and ordinal
     Krippendorff's alpha.
  4. If no completed ratings exist, outputs status = 'pending' and
     display_label = 'Practitioner validation: pending'.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
from itertools import combinations
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

import numpy as np
import pandas as pd
from scipy.stats import mannwhitneyu, spearmanr
from sklearn.metrics import cohen_kappa_score

ANALYSIS_DIR = Path(__file__).resolve().parent
EXPERT_DIR = ANALYSIS_DIR.parent
REPO_ROOT = EXPERT_DIR.parent
DEFAULT_ANSWER_KEY = EXPERT_DIR / "private" / "answer_key.csv"
DEFAULT_OUT_JSON = REPO_ROOT / "results" / "expert_review.json"


def load_rating_sheet(path: Path) -> pd.DataFrame:
    if path.suffix.lower() == ".csv":
        df = pd.read_csv(path)
    else:
        df = pd.read_excel(path, sheet_name="Rating_Sheet", engine="openpyxl")

    required = {"pair_id", "clinical_similarity_1_to_5"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Sheet {path} missing required columns: {sorted(missing)}")

    out = df[["pair_id", "clinical_similarity_1_to_5"]].copy()
    out["rating"] = pd.to_numeric(out["clinical_similarity_1_to_5"], errors="coerce")
    valid = out["rating"].dropna()
    if len(valid) > 0 and ((valid < 1) | (valid > 5)).any():
        raise ValueError(f"Ratings in {path} must be within [1, 5].")
    return out[["pair_id", "rating"]]


def krippendorff_alpha_ordinal(ratings_matrix: np.ndarray) -> float:
    """
    Compute Krippendorff's alpha for ordinal data (rows = raters, cols = items; NaN allowed).
    Uses the standard ordinal difference metric delta^2(c, k).
    """
    M = np.asarray(ratings_matrix, dtype=np.float64)
    vals = M[~np.isnan(M)]
    if vals.size < 2:
        return float("nan")
    levels = np.sort(np.unique(vals))
    if levels.size < 2:
        return 1.0

    # Value counts across all pairable units
    n_items = M.shape[1]
    level_to_idx = {v: i for i, v in enumerate(levels)}
    K = levels.size

    # Coincidence matrix O (K x K)
    O = np.zeros((K, K), dtype=np.float64)
    for u in range(n_items):
        col = M[:, u]
        obs = col[~np.isnan(col)]
        m_u = obs.size
        if m_u < 2:
            continue
        idxs = [level_to_idx[v] for v in obs]
        for i in range(m_u):
            for j in range(m_u):
                if i != j:
                    O[idxs[i], idxs[j]] += 1.0 / (m_u - 1)

    n_total = float(np.sum(O))
    if n_total <= 0.0:
        return float("nan")

    n_c = np.sum(O, axis=1)
    # Ordinal distance squared matrix: delta^2(c, k) = (sum_{g=c..k} n_g - (n_c + n_k)/2)^2
    delta_sq = np.zeros((K, K), dtype=np.float64)
    for c in range(K):
        for k in range(K):
            if c == k:
                continue
            lo, hi = (c, k) if c < k else (k, c)
            mid_sum = float(np.sum(n_c[lo : hi + 1])) - 0.5 * (n_c[c] + n_c[k])
            delta_sq[c, k] = mid_sum * mid_sum

    D_o = float(np.sum(O * delta_sq)) / n_total
    E = np.outer(n_c, n_c) - np.diag(n_c)
    D_e = float(np.sum(E * delta_sq)) / (n_total * (n_total - 1.0)) if n_total > 1.0 else 0.0
    if D_e <= 1e-12:
        return 1.0
    return float(1.0 - D_o / D_e)


def analyze_completed_sheets(
    sheet_paths: Sequence[Path],
    answer_key_path: Path = DEFAULT_ANSWER_KEY,
) -> Dict[str, Any]:
    """Analyze 0, 1, or multiple reviewer sheets against the hidden answer key."""
    answer_key = pd.read_csv(answer_key_path)
    loaded_reviewers: List[tuple[str, pd.DataFrame]] = []

    for p in sheet_paths:
        if not p.exists():
            continue
        df_r = load_rating_sheet(p)
        if df_r["rating"].notna().sum() > 0:
            loaded_reviewers.append((p.stem, df_r))

    if len(loaded_reviewers) == 0:
        return {
            "status": "pending",
            "display_label": "Practitioner validation: pending",
            "timestamp_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
            "n_reviewers": 0,
            "n_total_pairs_in_sheet": int(len(answer_key)),
            "n_rated_pairs": 0,
            "note": (
                "No completed practitioner rating sheets have been submitted yet. "
                "Do not claim practitioner validation until blind ratings are analyzed."
            ),
        }

    # Merge all reviewer ratings onto answer key
    merged = answer_key.copy()
    rater_cols: List[str] = []
    for name, df_r in loaded_reviewers:
        col_name = f"rating_{name}"
        merged = merged.merge(df_r.rename(columns={"rating": col_name}), on="pair_id", how="left")
        rater_cols.append(col_name)

    merged["mean_rating"] = merged[rater_cols].mean(axis=1)
    rated = merged.dropna(subset=["mean_rating"]).copy()

    # 1. Mean rating by true neighbour rank (1..5)
    by_rank: Dict[str, Any] = {}
    for rank, grp in rated.groupby("neighbour_rank"):
        vals = grp["mean_rating"].to_numpy(dtype=np.float64)
        by_rank[str(int(rank))] = {
            "n": int(vals.size),
            "mean": float(np.mean(vals)),
            "std": float(np.std(vals, ddof=1)) if vals.size > 1 else 0.0,
            "median": float(np.median(vals)),
        }

    rank_corr = spearmanr(rated["neighbour_rank"], rated["mean_rating"])

    # 2. Agreement with dataset-provided Dosha label
    same_mask = rated["same_dataset_label"].astype(bool)
    same_vals = rated.loc[same_mask, "mean_rating"].to_numpy(dtype=np.float64)
    diff_vals = rated.loc[~same_mask, "mean_rating"].to_numpy(dtype=np.float64)

    mwu_p: Optional[float] = None
    if same_vals.size > 0 and diff_vals.size > 0:
        mwu_p = float(mannwhitneyu(same_vals, diff_vals, alternative="two-sided").pvalue)

    high_sim = (rated["mean_rating"] >= 4.0).to_numpy(dtype=int)
    same_int = same_mask.to_numpy(dtype=int)
    pct_agree = float(np.mean(high_sim == same_int))
    kappa_vs_label = (
        float(cohen_kappa_score(same_int, high_sim))
        if (len(np.unique(same_int)) > 1 and len(np.unique(high_sim)) > 1)
        else None
    )

    label_agreement = {
        "same_dataset_label_n": int(same_vals.size),
        "same_dataset_label_mean_rating": float(np.mean(same_vals)) if same_vals.size else None,
        "different_dataset_label_n": int(diff_vals.size),
        "different_dataset_label_mean_rating": float(np.mean(diff_vals)) if diff_vals.size else None,
        "mann_whitney_p": mwu_p,
        "high_sim_ge4_pct_agreement_with_dataset_label": pct_agree,
        "high_sim_ge4_cohen_kappa": kappa_vs_label,
    }

    # 3. Inter-rater agreement (if multiple reviewers)
    inter_rater: Optional[Dict[str, Any]] = None
    if len(rater_cols) >= 2:
        mat = merged[rater_cols].to_numpy(dtype=np.float64).T  # (n_raters, n_pairs)
        alpha_ord = krippendorff_alpha_ordinal(mat)
        pairwise_raters: List[Dict[str, Any]] = []
        for c1, c2 in combinations(rater_cols, 2):
            sub = merged[[c1, c2]].dropna()
            if len(sub) < 2:
                continue
            r1 = np.rint(sub[c1].to_numpy()).astype(int)
            r2 = np.rint(sub[c2].to_numpy()).astype(int)
            kw = (
                float(cohen_kappa_score(r1, r2, weights="quadratic"))
                if (len(np.unique(r1)) > 1 or len(np.unique(r2)) > 1)
                else 1.0
            )
            sp = spearmanr(sub[c1], sub[c2])
            pairwise_raters.append(
                {
                    "rater_a": c1.replace("rating_", ""),
                    "rater_b": c2.replace("rating_", ""),
                    "n_overlap": int(len(sub)),
                    "quadratic_weighted_kappa": kw,
                    "spearman_rho": float(sp.statistic) if np.isfinite(sp.statistic) else None,
                }
            )
        inter_rater = {
            "n_reviewers": len(rater_cols),
            "krippendorff_alpha_ordinal": alpha_ord if np.isfinite(alpha_ord) else None,
            "pairwise": pairwise_raters,
        }

    return {
        "status": "completed",
        "display_label": f"Practitioner validation: completed ({len(rater_cols)} reviewer{'s' if len(rater_cols) > 1 else ''})",
        "timestamp_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "n_reviewers": len(rater_cols),
        "reviewers": [name for name, _ in loaded_reviewers],
        "n_total_pairs_in_sheet": int(len(answer_key)),
        "n_rated_pairs": int(len(rated)),
        "rating_by_neighbour_rank": by_rank,
        "rank_vs_rating_spearman_rho": float(rank_corr.statistic) if np.isfinite(rank_corr.statistic) else None,
        "rank_vs_rating_spearman_p": float(rank_corr.pvalue) if np.isfinite(rank_corr.pvalue) else None,
        "agreement_with_dataset_dosha_label": label_agreement,
        "inter_rater_agreement": inter_rater,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze blinded practitioner similarity rating sheets.")
    parser.add_argument(
        "--sheets",
        nargs="*",
        type=str,
        default=[str(EXPERT_DIR / "rating_sheet.xlsx")],
        help="Path(s) to completed reviewer .xlsx or .csv rating sheet(s).",
    )
    parser.add_argument(
        "--answer-key",
        type=str,
        default=str(DEFAULT_ANSWER_KEY),
        help="Path to hidden answer_key.csv.",
    )
    parser.add_argument(
        "--out",
        type=str,
        default=str(DEFAULT_OUT_JSON),
        help="Path to write JSON analysis summary.",
    )
    args = parser.parse_args()

    sheet_paths = [Path(s) for s in args.sheets]
    result = analyze_completed_sheets(sheet_paths, answer_key_path=Path(args.answer_key))

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(result, fh, indent=2)

    print(result["display_label"])
    print(f"Wrote analysis summary to {out_path}")


if __name__ == "__main__":
    main()
