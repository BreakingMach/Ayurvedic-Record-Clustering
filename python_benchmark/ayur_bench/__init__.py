"""ayur_bench: Honest, leak-free mixed-type distance benchmarking for Ayurvedic case records."""

from .data import DatasetBundle, load_config, load_tridosha_dataset
from .distances import (
    compute_query_to_db_distances,
    cosine_distance,
    cosine_range_distance,
    euclidean_distance,
    euclidean_range_distance,
    gower_distance,
    gower_zscore_distance,
    hamming_distance,
)
from .evaluation import (
    evaluate_clustering,
    evaluate_distance_matrix,
    evaluate_knn_cv,
    evaluate_loo_retrieval,
)
from .stats import compare_metrics_paired, holm_bonferroni, paired_effect_size, summarize_scores

__all__ = [
    "DatasetBundle",
    "load_config",
    "load_tridosha_dataset",
    "gower_distance",
    "gower_zscore_distance",
    "euclidean_distance",
    "euclidean_range_distance",
    "cosine_distance",
    "cosine_range_distance",
    "hamming_distance",
    "compute_query_to_db_distances",
    "evaluate_knn_cv",
    "evaluate_loo_retrieval",
    "evaluate_clustering",
    "evaluate_distance_matrix",
    "summarize_scores",
    "paired_effect_size",
    "holm_bonferroni",
    "compare_metrics_paired",
]
