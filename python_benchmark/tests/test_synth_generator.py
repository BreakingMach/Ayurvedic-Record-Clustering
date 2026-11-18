"""Unit tests for the SYNTHETIC/SIMULATED mixed-type generator (ayur_bench.synth)."""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.feature_selection import mutual_info_classif
from sklearn.preprocessing import LabelEncoder

from ayur_bench.data import CANONICAL_CLASSES, load_config, load_tridosha_dataset
from ayur_bench.distances import euclidean_distance, gower_distance
from ayur_bench.evaluation import evaluate_knn_cv, evaluate_loo_retrieval
from ayur_bench.synth import NUMERIC_VITAL_COLS, generate


def test_class_proportions_match_real_csv() -> None:
    cfg = load_config()
    real_bundle = load_tridosha_dataset()
    df, meta = generate(cfg, seed=42)

    assert meta["data_origin"] == "SYNTHETIC/SIMULATED"
    assert len(df) == 1200
    assert "latent_class" in df.columns
    assert "eval_label" in df.columns
    assert meta["class_counts_latent"] == real_bundle.metadata["class_counts"]
    # Verify exact 29 categorical trait names match real CSV
    assert meta["categorical_cols"] == real_bundle.categorical_cols
    assert meta["numeric_cols"] == NUMERIC_VITAL_COLS


def test_deterministic_output_for_fixed_seed() -> None:
    cfg = load_config()
    df1, meta1 = generate(cfg, seed=123, overrides={"missing_fraction": 0.05, "outlier_fraction": 0.05})
    df2, meta2 = generate(cfg, seed=123, overrides={"missing_fraction": 0.05, "outlier_fraction": 0.05})
    df3, _ = generate(cfg, seed=124, overrides={"missing_fraction": 0.05, "outlier_fraction": 0.05})

    pd.testing.assert_frame_equal(df1, df2)
    assert meta1["class_orders_non_alphabetical"] == meta2["class_orders_non_alphabetical"]
    assert not df1["bmi"].equals(df3["bmi"])


def test_d0_eps04_numeric_only_distance_near_chance() -> None:
    """With d=0 and eps=0.4, numeric-only distance must yield near-chance kNN & LOO retrieval."""
    cfg = load_config()
    df, _ = generate(
        cfg,
        seed=77,
        overrides={"numeric_cohens_d": 0.0, "categorical_eps": 0.4},
    )
    X_num = df[NUMERIC_VITAL_COLS]
    y = df["latent_class"].to_numpy()

    D_num = euclidean_distance(X_num, numeric_cols=NUMERIC_VITAL_COLS, categorical_cols=[])
    knn = evaluate_knn_cv(D_num, y, n_neighbors=5, n_splits=5, n_repeats=3, random_state=42)
    loo = evaluate_loo_retrieval(D_num, y, ks=(5,), smallest_n_classes=3)

    # Exact macro P@5 chance is 1/6 = 0.1667; allow +-0.045 (~5 SE)
    assert abs(loo["macro"]["p_at_5"] - (1.0 / 6.0)) <= 0.045, (
        f"Numeric-only LOO macro P@5={loo['macro']['p_at_5']:.4f} not near chance at d=0"
    )
    # Random-label imbalanced 5-NN macro-F1 sits near 0.12-0.17
    assert knn["macro_f1_mean"] <= 0.22, (
        f"Numeric-only kNN macro-F1={knn['macro_f1_mean']:.4f} unexpectedly high at d=0"
    )


def test_d2_numeric_only_knn_clearly_above_chance() -> None:
    """With d=2, numeric-only kNN accuracy and macro-F1 must be clearly above chance."""
    cfg = load_config()
    df, _ = generate(
        cfg,
        seed=77,
        overrides={"numeric_cohens_d": 2.0, "categorical_eps": 0.2},
    )
    X_num = df[NUMERIC_VITAL_COLS]
    y = df["latent_class"].to_numpy()

    D_num = gower_distance(X_num, numeric_cols=NUMERIC_VITAL_COLS, categorical_cols=[])
    knn = evaluate_knn_cv(D_num, y, n_neighbors=5, n_splits=5, n_repeats=3, random_state=42)

    # Majority-class baseline accuracy is 624/1200 = 0.52; at d=2 numeric-only must beat it substantially
    assert knn["accuracy_mean"] >= 0.75, (
        f"Expected numeric-only kNN accuracy >= 0.75 at d=2, got {knn['accuracy_mean']:.4f}"
    )
    assert knn["macro_f1_mean"] >= 0.65, (
        f"Expected numeric-only kNN macro-F1 >= 0.65 at d=2, got {knn['macro_f1_mean']:.4f}"
    )


def test_age_is_always_uninformative() -> None:
    """Age has d=0 always; mutual information with latent_class must be near 0 even when d=2."""
    cfg = load_config()
    df, _ = generate(cfg, seed=99, overrides={"numeric_cohens_d": 2.0})
    y_int = LabelEncoder().fit_transform(df["latent_class"])

    mi_age = float(mutual_info_classif(df[["age"]].to_numpy(), y_int, random_state=42)[0])
    mi_bmi = float(mutual_info_classif(df[["bmi"]].to_numpy(), y_int, random_state=42)[0])

    assert mi_age < 0.05, f"Expected age MI near 0, got {mi_age:.4f}"
    assert mi_bmi > 0.30, f"Expected informative bmi MI > 0.30 at d=2, got {mi_bmi:.4f}"


def test_no_column_computed_from_label_index_arithmetic() -> None:
    """
    Verify class orderings for informative vitals are randomised (neither alphabetical
    nor canonical class index order) and class means do not form a linear function of
    alphabetical label indices.
    """
    cfg = load_config()
    df, meta = generate(cfg, seed=42, overrides={"numeric_cohens_d": 2.0})
    alpha_order = sorted(CANONICAL_CLASSES)
    rev_alpha = list(reversed(alpha_order))
    canon_order = list(CANONICAL_CLASSES)
    rev_canon = list(reversed(canon_order))

    orders = meta["class_orders_non_alphabetical"]
    for vital in ("bmi", "systolic_bp", "pulse"):
        assert orders[vital] not in (alpha_order, rev_alpha, canon_order, rev_canon), (
            f"{vital} class order matched alphabetical or canonical order: {orders[vital]}"
        )
        # Check empirical class means vs alphabetical index (0..5) are NOT perfectly linear (|r| < 0.95)
        means_by_alpha = np.array(
            [df.loc[df["latent_class"] == c, vital].mean() for c in alpha_order],
            dtype=np.float64,
        )
        idx = np.arange(len(alpha_order), dtype=np.float64)
        corr = abs(float(np.corrcoef(idx, means_by_alpha)[0, 1]))
        assert corr < 0.95, f"{vital} class means correlate too strongly with alphabetical index: |r|={corr:.3f}"


def test_copula_skewness_and_messiness_toggles() -> None:
    cfg = load_config()
    # 1. Clean cohort at d=0: verify bmi-sbp copula correlation ~0.4 and lognormal right skew
    df_clean, meta_clean = generate(cfg, seed=55, overrides={"numeric_cohens_d": 0.0})
    rho_obs = meta_clean["realised_diagnostics"]["bmi_sbp_pearson_overall"]
    assert 0.30 <= rho_obs <= 0.50, f"Expected BMI-SBP correlation near 0.4, got {rho_obs:.3f}"
    assert meta_clean["realised_diagnostics"]["bmi_skewness"] > 0.15

    # 2. Messy cohort: outliers, missingness, and eval-only label noise
    df_messy, meta_messy = generate(
        cfg,
        seed=55,
        overrides={
            "outlier_fraction": 0.05,
            "missing_fraction": 0.10,
            "label_noise_rate": 0.20,
        },
    )
    diag = meta_messy["realised_diagnostics"]
    assert diag["outlier_cells_by_col"]["bmi"] == 60
    assert 0.07 <= diag["missing_total_rate"] <= 0.13
    assert diag["missing_numeric_cells"] > 0
    assert diag["missing_categorical_cells"] > 0
    # Label noise affects eval_label only; latent_class retains exact proportions
    assert 0.15 <= diag["eval_label_noise_realised"] <= 0.25
    assert (df_messy["latent_class"] != df_messy["eval_label"]).sum() == diag["eval_labels_flipped"]
    assert meta_messy["class_counts_latent"] == meta_clean["class_counts_latent"]
