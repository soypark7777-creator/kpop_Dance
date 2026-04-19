from __future__ import annotations

from math import inf
from typing import Sequence


def dtw_distance(sequence_a: Sequence[float], sequence_b: Sequence[float]) -> float:
    if not sequence_a or not sequence_b:
        return float(max(len(sequence_a), len(sequence_b)))

    rows = len(sequence_a)
    cols = len(sequence_b)
    matrix = [[inf] * (cols + 1) for _ in range(rows + 1)]
    matrix[0][0] = 0.0

    for i in range(1, rows + 1):
        for j in range(1, cols + 1):
            cost = abs(float(sequence_a[i - 1]) - float(sequence_b[j - 1]))
            matrix[i][j] = cost + min(
                matrix[i - 1][j],
                matrix[i][j - 1],
                matrix[i - 1][j - 1],
            )

    return float(matrix[rows][cols])


def similarity_score(sequence_a: Sequence[float], sequence_b: Sequence[float]) -> float:
    distance = dtw_distance(sequence_a, sequence_b)
    scale = max(len(sequence_a), len(sequence_b), 1)
    score = max(0.0, 100.0 - (distance / scale) * 12.0)
    return round(min(100.0, score), 2)


def align_sequences(sequence_a: Sequence[float], sequence_b: Sequence[float]) -> list[tuple[int, int]]:
    """Return a simple alignment path for debugging and replay summaries."""
    if not sequence_a or not sequence_b:
        return []

    rows = len(sequence_a)
    cols = len(sequence_b)
    matrix = [[inf] * (cols + 1) for _ in range(rows + 1)]
    matrix[0][0] = 0.0

    for i in range(1, rows + 1):
        for j in range(1, cols + 1):
            cost = abs(float(sequence_a[i - 1]) - float(sequence_b[j - 1]))
            matrix[i][j] = cost + min(
                matrix[i - 1][j],
                matrix[i][j - 1],
                matrix[i - 1][j - 1],
            )

    i, j = rows, cols
    path: list[tuple[int, int]] = []
    while i > 0 and j > 0:
        path.append((i - 1, j - 1))
        candidates = {
            (i - 1, j): matrix[i - 1][j],
            (i, j - 1): matrix[i][j - 1],
            (i - 1, j - 1): matrix[i - 1][j - 1],
        }
        i, j = min(candidates, key=candidates.get)

    return list(reversed(path))
