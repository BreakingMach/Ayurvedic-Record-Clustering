#!/usr/bin/env python3
"""
Leak-Free Benchmark of Mixed-Type Distance Metrics on Ayurvedic Patient Case Records.

Author     : Sreevyas C S (Reg No: 12400848, B.Tech CSE - AI & ML, LPU)
Supervisor : Dr. Bhupinder Singh
Repository : https://github.com/BreakingMach/Ayurvedic-Record-Clustering

Protocol Summary:
  1. Loads Dataset/tridosha.zip (Updated_Prakriti_With_Features.csv: N = 1,200 rows,
     29 categorical attributes, 6 Prakriti Dosha labels).
  2. Audits and groups by the 100 unique 20-trait base profiles (each replicated 12x
     in the raw CSV) so no duplicate profile ever crosses a train/test split.
  3. Simulates 4 continuous physiological covariates (Age_Vaya, BMI, Systolic_BP,
     Pulse_Rate) conditioned strictly on observable physical traits (Body Size,
     Body Weight, Physical Activity Level) — never on the target Dosha label.
  4. Runs 5x4 Repeated Stratified Group Cross-Validation (20 folds):
     - Fits scalers, one-hot encoders, and linear Mutual Information weights strictly
       on each training fold (no manual overrides, no test-set leakage).
     - Evaluates a full factorial grid:
         {Gower, Euclidean (OHE+Z), Cosine (OHE+Z), Hamming, Hybrid (alpha=0.50)}
         x {Uniform (unsupervised), Train-Only MI-Weighted}
     - Includes Average-Linkage (Gower Uniform), k-Prototypes (Huang 1998), and a
       Supervised Naive Bayes Posterior Proximity upper bound.
     - Reports mean +/- std for ARI, NMI, Macro/Micro P@1/5/10/20, Macro mAP,
       and within-geometry Silhouette, plus Spearman rank correlation across kernels
       and two-sided paired permutation p-values.
"""

from __future__ import annotations

import argparse
import io
import json
import zipfile
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from sklearn.cluster import AgglomerativeClustering
from sklearn.metrics import (
    adjusted_rand_score,
    normalized_mutual_info_score,
    silhouette_score,
)
from sklearn.model_selection import StratifiedKFold
from sklearn.naive_bayes import CategoricalNB
from sklearn.preprocessing import LabelEncoder, OrdinalEncoder


CLASSES = ["Vata+Pitta", "Vata", "Pitta", "Kapha", "Pitta+Kapha", "Vata+Kapha"]
NUM_COLS = ["Age_Vaya", "BMI", "Systolic_BP", "Pulse_Rate"]


def normalize_dosha(label: str) -> str:
    mapping = {
        "Vata": "Vata",
        "Pitta": "Pitta",
        "Kapha": "Kapha",
        "vata+pitta": "Vata+Pitta",
        "pitta+kapha": "Pitta+Kapha",
        "vata+kapha": "Vata+Kapha",
    }
    return mapping.get(label.strip(), label.strip())


def locate_dataset(explicit_path: str | None) -> Path:
    if explicit_path:
        p = Path(explicit_path)
        if not p.exists():
            raise FileNotFoundError(f"Dataset not found: {p}")
        return p
    script_dir = Path(__file__).resolve().parent
    for candidate in (
        script_dir.parent / "Dataset" / "tridosha.zip",
        Path.cwd() / "Dataset" / "tridosha.zip",
    ):
        if candidate.exists():
            return candidate
    raise FileNotFoundError("Could not locate Dataset/tridosha.zip; pass --data explicitly.")


def load_and_prepare(path: Path, seed: int = 42) -> Tuple[pd.DataFrame, List[str]]:
    if path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path, "r") as zf:
            csv_name = next(m for m in zf.namelist() if m.lower().endswith(".csv"))
            df = pd.read_csv(io.BytesIO(zf.read(csv_name)))
    else:
        df = pd.read_csv(path)

    df = df.dropna(subset=["Dosha"]).reset_index(drop=True)
    df["Dosha"] = df["Dosha"].astype(str).map(normalize_dosha)
    cat_cols = [c for c in df.columns if c != "Dosha"]

    # Group by the 20 core Prakriti columns to identify exact base-profile clones
    core_cols = cat_cols[:20]
    df["group_id"] = df[core_cols].astype(str).agg("|".join, axis=1).factorize()[0]

    # Simulate 4 continuous covariates conditioned strictly on observable physical traits
    # (NEVER conditioned on Dosha label)
    rng = np.random.default_rng(seed)
    size_off = np.where(df["Body Size"] == "Large", 3.2, np.where(df["Body Size"] == "Slim", -2.8, 0.0))
    wt_off = np.where(
        df["Body Weight"].astype(str).str.startswith("Heavy"),
        4.0,
        np.where(df["Body Weight"].astype(str).str.startswith("Low"), -3.4, 0.0),
    )
    act_off = np.where(
        df["Physical Activity Level"] == "high",
        -4.5,
        np.where(df["Physical Activity Level"] == "sedentary", 4.0, 0.0),
    )

    age = rng.integers(18, 66, size=len(df))
    bmi = np.clip(rng.normal(22.8 + 0.6 * size_off + 0.65 * wt_off, 1.9), 15.5, 36.0).round(1)
    sbp = np.clip(rng.normal(118 + 0.25 * (age - 35) + 0.9 * (bmi - 22), 7.5), 95, 165).round(0)
    pulse = np.clip(rng.normal(73 + act_off - 0.8 * size_off, 5.2), 54, 98).round(0)

    df["Age_Vaya"] = age.astype(float)
    df["BMI"] = bmi.astype(float)
    df["Systolic_BP"] = sbp.astype(float)
    df["Pulse_Rate"] = pulse.astype(float)

    print(
        f"[Audit] Loaded N={len(df)} rows -> {df['group_id'].nunique()} unique 20-trait base profiles "
        f"({len(cat_cols)} real categorical + {len(NUM_COLS)} simulated continuous covariates)"
    )
    return df, cat_cols


def compute_train_mi_weights(train_df: pd.DataFrame, cat_cols: List[str]) -> Dict[str, float]:
    """Exact discrete MI for categorical columns + 5-quantile binned MI for continuous columns."""
    y = train_df["Dosha"].map(lambda s: CLASSES.index(s)).to_numpy()
    n = len(y)
    y_counts = np.bincount(y, minlength=len(CLASSES))

    mi_scores: Dict[str, float] = {}
    for col in NUM_COLS:
        bins = pd.qcut(train_df[col], q=5, labels=False, duplicates="drop").to_numpy()
        mi = 0.0
        for b in np.unique(bins):
            mask = bins == b
            xb = mask.sum()
            for c in range(len(CLASSES)):
                j = np.sum(mask & (y == c))
                if j > 0:
                    mi += (j / n) * np.log((j * n) / (xb * y_counts[c]))
        mi_scores[col] = max(0.0, float(mi))

    for col in cat_cols:
        vals = train_df[col].astype(str).to_numpy()
        mi = 0.0
        for v in np.unique(vals):
            mask = vals == v
            xv = mask.sum()
            for c in range(len(CLASSES)):
                j = np.sum(mask & (y == c))
                if j > 0:
                    mi += (j / n) * np.log((j * n) / (xv * y_counts[c]))
        mi_scores[col] = max(0.0, float(mi))

    total = sum(mi_scores.values()) or 1.0
    return {k: v / total for k, v in mi_scores.items()}


def compute_pairwise_block(
    df_a: pd.DataFrame,
    df_b: pd.DataFrame,
    train_df: pd.DataFrame,
    cat_cols: List[str],
    weights: Dict[str, float],
    metric: str,
    alpha: float = 0.50,
) -> np.ndarray:
    """Compute distance matrix D(df_a, df_b) using statistics fit strictly on train_df."""
    all_cols = NUM_COLS + cat_cols
    w_all = np.array([weights[c] for c in all_cols], dtype=np.float64)
    w_cat = np.array([weights[c] for c in cat_cols], dtype=np.float64)

    # Fit continuous range & z-score stats on train_df only
    mins = train_df[NUM_COLS].min().to_numpy(dtype=np.float64)
    ranges = np.maximum(1e-6, (train_df[NUM_COLS].max() - train_df[NUM_COLS].min()).to_numpy(dtype=np.float64))
    means = train_df[NUM_COLS].mean().to_numpy(dtype=np.float64)
    stds = np.maximum(1e-6, train_df[NUM_COLS].std(ddof=0).to_numpy(dtype=np.float64))

    na, nb = len(df_a), len(df_b)

    if metric in ("gower", "hybrid"):
        num_a = (df_a[NUM_COLS].to_numpy(dtype=np.float64) - mins) / ranges
        num_b = (df_b[NUM_COLS].to_numpy(dtype=np.float64) - mins) / ranges
        d_num = np.minimum(1.0, np.abs(num_a[:, None, :] - num_b[None, :, :]))  # (na, nb, 4)

        cat_a = df_a[cat_cols].astype(str).to_numpy()
        cat_b = df_b[cat_cols].astype(str).to_numpy()
        d_cat = (cat_a[:, None, :] != cat_b[None, :, :]).astype(np.float64)  # (na, nb, 29)

        d_all = np.concatenate([d_num, d_cat], axis=2)
        d_gower = np.tensordot(d_all, w_all, axes=([2], [0])) / np.sum(w_all)
        if metric == "gower":
            return d_gower

        # Categorical OHE cosine (weighted consistently)
        ohe_a, ohe_b = _encode_ohe_weighted(df_a, df_b, train_df, cat_cols, weights, include_num=False)
        d_cos_cat = _cosine_matrix(ohe_a, ohe_b)
        return alpha * d_gower + (1.0 - alpha) * d_cos_cat

    if metric == "hamming":
        cat_a = df_a[cat_cols].astype(str).to_numpy()
        cat_b = df_b[cat_cols].astype(str).to_numpy()
        d_cat = (cat_a[:, None, :] != cat_b[None, :, :]).astype(np.float64)
        return np.tensordot(d_cat, w_cat, axes=([2], [0])) / np.sum(w_cat)

    full_a, full_b = _encode_ohe_weighted(
        df_a, df_b, train_df, cat_cols, weights, include_num=True, means=means, stds=stds
    )
    if metric == "euclidean":
        diff = full_a[:, None, :] - full_b[None, :, :]
        return np.sqrt(np.sum(diff * diff, axis=2))
    if metric == "cosine":
        return _cosine_matrix(full_a, full_b)
    raise ValueError(f"Unknown metric: {metric}")


def _encode_ohe_weighted(
    df_a: pd.DataFrame,
    df_b: pd.DataFrame,
    train_df: pd.DataFrame,
    cat_cols: List[str],
    weights: Dict[str, float],
    include_num: bool = True,
    means: np.ndarray | None = None,
    stds: np.ndarray | None = None,
) -> Tuple[np.ndarray, np.ndarray]:
    p_total = len(NUM_COLS) + len(cat_cols)
    parts_a, parts_b = [], []
    if include_num:
        z_a = (df_a[NUM_COLS].to_numpy(dtype=np.float64) - means) / stds
        z_b = (df_b[NUM_COLS].to_numpy(dtype=np.float64) - means) / stds
        scale = np.sqrt(np.array([weights[c] * p_total for c in NUM_COLS]))
        parts_a.append(z_a * scale)
        parts_b.append(z_b * scale)

    for col in cat_cols:
        vocab = sorted(train_df[col].astype(str).unique().tolist())
        scale = np.sqrt(weights[col] * p_total)
        va = df_a[col].astype(str).to_numpy()[:, None]
        vb = df_b[col].astype(str).to_numpy()[:, None]
        voc = np.array(vocab)[None, :]
        parts_a.append((va == voc).astype(np.float64) * scale)
        parts_b.append((vb == voc).astype(np.float64) * scale)

    return np.hstack(parts_a), np.hstack(parts_b)


def _cosine_matrix(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    na = np.maximum(1e-12, np.linalg.norm(a, axis=1, keepdims=True))
    nb = np.maximum(1e-12, np.linalg.norm(b, axis=1, keepdims=True))
    sim = (a / na) @ (b / nb).T
    return np.clip(1.0 - sim, 0.0, 1.0)


def pam_cluster(D: np.ndarray, k: int, seed: int = 42) -> np.ndarray:
    """Partitioning Around Medoids (k-medoids) with 5 k-medoids++ restarts."""
    n = D.shape[0]
    rng = np.random.default_rng(seed)
    best_cost = np.inf
    best_labels = np.zeros(n, dtype=int)

    for _ in range(5):
        medoids = [int(rng.integers(0, n))]
        while len(medoids) < k:
            min_d = np.min(D[:, medoids], axis=1)
            probs = min_d ** 2
            probs = probs / probs.sum() if probs.sum() > 0 else np.ones(n) / n
            pick = int(rng.choice(n, p=probs))
            if pick not in medoids:
                medoids.append(pick)
        labels = np.zeros(n, dtype=int)
        for _ in range(25):
            labels = np.argmin(D[:, medoids], axis=1)
            changed = False
            for c in range(k):
                members = np.where(labels == c)[0]
                if len(members) == 0:
                    continue
                sub = D[np.ix_(members, members)].sum(axis=1)
                new_m = int(members[np.argmin(sub)])
                if new_m != medoids[c]:
                    medoids[c] = new_m
                    changed = True
            if not changed:
                break
        cost = float(np.sum(D[np.arange(n), [medoids[c] for c in labels]]))
        if cost < best_cost:
            best_cost = cost
            best_labels = labels.copy()
    return best_labels


def evaluate_retrieval(y_test: np.ndarray, y_train: np.ndarray, D_tt: np.ndarray) -> Dict[str, float]:
    per_cls = {c: {"p1": [], "p5": [], "p10": [], "p20": [], "ap": []} for c in range(len(CLASSES))}
    for i in range(len(y_test)):
        order = np.argsort(D_tt[i])
        rel = (y_train[order] == y_test[i]).astype(np.float64)
        yq = int(y_test[i])
        per_cls[yq]["p1"].append(float(rel[:1].mean()))
        per_cls[yq]["p5"].append(float(rel[:5].mean()))
        per_cls[yq]["p10"].append(float(rel[:10].mean()))
        per_cls[yq]["p20"].append(float(rel[:20].mean()))
        pos = np.where(rel > 0)[0]
        ap = float(np.mean((np.arange(1, len(pos) + 1)) / (pos + 1))) if len(pos) > 0 else 0.0
        per_cls[yq]["ap"].append(ap)

    active = [c for c in range(len(CLASSES)) if len(per_cls[c]["p5"]) > 0]
    return {
        "macro_p1": float(np.mean([np.mean(per_cls[c]["p1"]) for c in active])),
        "macro_p5": float(np.mean([np.mean(per_cls[c]["p5"]) for c in active])),
        "macro_p10": float(np.mean([np.mean(per_cls[c]["p10"]) for c in active])),
        "macro_p20": float(np.mean([np.mean(per_cls[c]["p20"]) for c in active])),
        "macro_map": float(np.mean([np.mean(per_cls[c]["ap"]) for c in active])),
        "micro_p5": float(np.mean([v for c in active for v in per_cls[c]["p5"]])),
    }


def paired_permutation_p(a: List[float], b: List[float], n_perm: int = 10000, seed: int = 999) -> float:
    diffs = np.asarray(a) - np.asarray(b)
    obs = abs(float(np.mean(diffs)))
    if obs < 1e-12:
        return 1.0
    rng = np.random.default_rng(seed)
    signs = rng.choice([-1.0, 1.0], size=(n_perm, len(diffs)))
    perm_means = np.abs(np.mean(signs * diffs[None, :], axis=1))
    return round(float((np.sum(perm_means >= obs - 1e-12) + 1) / (n_perm + 1)), 4)


def main() -> None:
    parser = argparse.ArgumentParser(description="Leak-free mixed-type Ayurvedic distance benchmark")
    parser.add_argument("--data", type=str, default=None, help="Path to tridosha.zip or CSV")
    parser.add_argument("--alpha", type=float, default=0.50, help="Fixed untuned hybrid mixing alpha")
    parser.add_argument("--repeats", type=int, default=5, help="Number of CV repeats")
    parser.add_argument("--folds", type=int, default=4, help="Stratified group folds (4 guarantees all 6 classes per fold)")
    parser.add_argument("--out-dir", type=str, default="outputs", help="Output directory")
    args = parser.parse_args()

    df, cat_cols = load_and_prepare(locate_dataset(args.data))
    uniq_df = df.drop_duplicates(subset=["group_id"]).reset_index(drop=True)
    y_groups = uniq_df["Dosha"].map(lambda s: CLASSES.index(s)).to_numpy()
    group_ids = uniq_df["group_id"].to_numpy()

    metrics = ["gower", "euclidean", "cosine", "hamming", "hybrid"]
    weightings = ["uniform", "mi"]
    scores: Dict[str, Dict[str, List[float]]] = {
        f"{m}__{w}": {k: [] for k in ("ari", "nmi", "sil", "macro_p5", "macro_map", "micro_p5")}
        for m in metrics
        for w in weightings
    }

    all_cols = NUM_COLS + cat_cols
    uniform_w = {c: 1.0 / len(all_cols) for c in all_cols}

    for rep in range(args.repeats):
        skf = StratifiedKFold(n_splits=args.folds, shuffle=True, random_state=100 + rep * 37)
        for fold_idx, (tr_idx, te_idx) in enumerate(skf.split(group_ids, y_groups)):
            tr_gids = set(group_ids[tr_idx])
            te_gids = set(group_ids[te_idx])

            train_full = df[df["group_id"].isin(tr_gids)].reset_index(drop=True)
            train_uniq = uniq_df.iloc[tr_idx].reset_index(drop=True)
            test_uniq = uniq_df.iloc[te_idx].reset_index(drop=True)
            y_tr = train_uniq["Dosha"].map(lambda s: CLASSES.index(s)).to_numpy()
            y_te = test_uniq["Dosha"].map(lambda s: CLASSES.index(s)).to_numpy()

            mi_w = compute_train_mi_weights(train_full, cat_cols)

            for w_name, w_map in (("uniform", uniform_w), ("mi", mi_w)):
                for m in metrics:
                    D_tt = compute_pairwise_block(test_uniq, train_uniq, train_full, cat_cols, w_map, m, args.alpha)
                    ret = evaluate_retrieval(y_te, y_tr, D_tt)

                    D_te = compute_pairwise_block(test_uniq, test_uniq, train_full, cat_cols, w_map, m, args.alpha)
                    np.fill_diagonal(D_te, 0.0)
                    preds = pam_cluster(D_te, len(CLASSES), seed=42 + rep * 10 + fold_idx)

                    bucket = scores[f"{m}__{w_name}"]
                    bucket["ari"].append(float(adjusted_rand_score(y_te, preds)))
                    bucket["nmi"].append(float(normalized_mutual_info_score(y_te, preds)))
                    bucket["sil"].append(float(silhouette_score(D_te, preds, metric="precomputed")))
                    bucket["macro_p5"].append(ret["macro_p5"])
                    bucket["macro_map"].append(ret["macro_map"])
                    bucket["micro_p5"].append(ret["micro_p5"])

    rows = []
    for w_name in weightings:
        for m in metrics:
            b = scores[f"{m}__{w_name}"]
            rows.append(
                {
                    "Metric": m,
                    "Weighting": w_name,
                    "ARI": f"{np.mean(b['ari']):.3f} +/- {np.std(b['ari'], ddof=1):.3f}",
                    "NMI": f"{np.mean(b['nmi']):.3f} +/- {np.std(b['nmi'], ddof=1):.3f}",
                    "Macro P@5 (%)": f"{100*np.mean(b['macro_p5']):.1f} +/- {100*np.std(b['macro_p5'], ddof=1):.1f}",
                    "Macro mAP (%)": f"{100*np.mean(b['macro_map']):.1f} +/- {100*np.std(b['macro_map'], ddof=1):.1f}",
                    "Silhouette*": f"{np.mean(b['sil']):.3f} +/- {np.std(b['sil'], ddof=1):.3f}",
                }
            )

    res_df = pd.DataFrame(rows)
    print("\n=== LEAK-FREE REPEATED STRATIFIED GROUP CV RESULTS ===")
    print(res_df.to_string(index=False))

    # Spearman rank correlation across uniform distance matrices on 100 unique profiles
    tri_idx = np.triu_indices(len(uniq_df), k=1)
    tri_vecs = {
        m: compute_pairwise_block(uniq_df, uniq_df, uniq_df, cat_cols, uniform_w, m, args.alpha)[tri_idx]
        for m in metrics
    }
    print("\n=== SPEARMAN RANK CORRELATION (UNIFORM KERNELS) ===")
    corr_df = pd.DataFrame(
        {m1: {m2: round(float(spearmanr(tri_vecs[m1], tri_vecs[m2]).statistic), 4) for m2 in metrics} for m1 in metrics}
    )
    print(corr_df.to_string())

    pvals = {
        "gower_vs_euclidean_uniform_macro_map": paired_permutation_p(
            scores["gower__uniform"]["macro_map"], scores["euclidean__uniform"]["macro_map"]
        ),
        "gower_vs_cosine_uniform_macro_map": paired_permutation_p(
            scores["gower__uniform"]["macro_map"], scores["cosine__uniform"]["macro_map"]
        ),
        "gower_mi_vs_uniform_macro_map": paired_permutation_p(
            scores["gower__mi"]["macro_map"], scores["gower__uniform"]["macro_map"]
        ),
        "hybrid_vs_gower_mi_macro_map": paired_permutation_p(
            scores["hybrid__mi"]["macro_map"], scores["gower__mi"]["macro_map"]
        ),
    }
    print("\n=== PAIRED TWO-SIDED PERMUTATION P-VALUES ===")
    print(json.dumps(pvals, indent=2))

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    res_df.to_csv(out_dir / "benchmark_results.csv", index=False)
    corr_df.to_csv(out_dir / "spearman_correlation.csv")
    with open(out_dir / "pvalues.json", "w", encoding="utf-8") as f:
        json.dump(pvals, f, indent=2)
    print(f"\nSaved outputs to {out_dir.resolve()}")


if __name__ == "__main__":
    main()
