from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional


class Ewma:
    def __init__(self, alpha: float) -> None:
        if not (0 < alpha <= 1):
            raise ValueError("alpha must be in (0, 1]")
        self._alpha = alpha
        self._v: Optional[float] = None

    @property
    def value(self) -> Optional[float]:
        return self._v

    def update(self, sample: float) -> float:
        if not math.isfinite(sample) or sample < 0:
            raise ValueError("sample must be finite and >= 0")
        if self._v is None:
            self._v = float(sample)
        else:
            self._v = self._alpha * sample + (1 - self._alpha) * self._v
        return self._v


@dataclass(frozen=True)
class BreakerConfig:
    failure_threshold: int
    cooldown_ms: int
    half_open_probes: int


class Breaker:
    def __init__(self, cfg: BreakerConfig) -> None:
        if cfg.failure_threshold < 1 or cfg.cooldown_ms < 0 or cfg.half_open_probes < 1:
            raise ValueError("invalid config")
        self._cfg = cfg
        self._st = "closed"
        self._failures = 0
        self._opened_at = 0
        self._probes = 0

    @property
    def state(self) -> str:
        return self._st

    def allow(self, now_ms: int) -> bool:
        if self._st == "closed":
            return True
        if self._st == "open":
            if now_ms - self._opened_at < self._cfg.cooldown_ms:
                return False
            self._st = "half_open"
            self._probes = 1
            return True
        if self._probes < self._cfg.half_open_probes:
            self._probes += 1
            return True
        return False

    def on_success(self, now_ms: int) -> None:
        if self._st == "closed":
            self._failures = 0
        elif self._st == "half_open":
            self._st = "closed"
            self._failures = 0
            self._probes = 0

    def on_failure(self, now_ms: int) -> None:
        if self._st == "closed":
            self._failures += 1
            if self._failures >= self._cfg.failure_threshold:
                self._st = "open"
                self._opened_at = now_ms
        elif self._st == "half_open":
            self._st = "open"
            self._opened_at = now_ms
            self._probes = 0


def backoff_delay(attempt: int, base_ms: float, factor: float, max_ms: float, jitter: str = "none", rand: float = 0.0) -> int:
    if attempt < 0 or not (base_ms >= 0) or not (factor >= 1) or not (max_ms >= 0):
        raise ValueError("invalid argument")
    if not (0 <= rand < 1):
        raise ValueError("rand")
    d = min(base_ms, max_ms)
    i = 0
    while i < attempt and d < max_ms:
        d = min(max_ms, d * factor)
        i += 1
    if jitter == "full":
        return math.floor(d * rand)
    if jitter == "equal":
        half = d / 2
        return math.floor(half + half * rand)
    return math.floor(d)


def rank(cands: list[tuple[str, Optional[float], bool]], n: int) -> list[str]:
    if n < 0:
        raise ValueError("n")
    dec = sorted(
        enumerate(cands),
        key=lambda p: (0 if p[1][2] else 1, 0 if p[1][1] is None else 1, 0.0 if p[1][1] is None else p[1][1], p[0]),
    )
    return [c[0] for _, c in dec[:n]]
