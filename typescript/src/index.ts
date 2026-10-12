export type BreakerState = "closed" | "open" | "half_open";
export type Jitter = "none" | "full" | "equal";

export interface BreakerConfig {
  /** consecutive failures that open the circuit (>= 1) */
  failureThreshold: number;
  /** ms the circuit stays open before allowing a probe (>= 0) */
  cooldownMs: number;
  /** number of concurrent probes while half_open (>= 1) */
  halfOpenProbes: number;
}
export interface BackoffConfig {
  baseMs: number;
  factor: number;
  maxMs: number;
  jitter: Jitter;
}
export interface Candidate {
  id: string;
  /** latency average (EWMA), or null if there are no samples yet */
  ewma: number | null;
  healthy: boolean;
}

/** Exponentially weighted moving average. The first sample becomes the initial value. */
export class Ewma {
  private v: number | null = null;
  private readonly alpha: number;
  constructor(alpha: number) {
    if (!(alpha > 0 && alpha <= 1)) throw new RangeError("alpha must be in (0, 1]");
    this.alpha = alpha;
  }
  get value(): number | null {
    return this.v;
  }
  update(sample: number): number {
    if (!Number.isFinite(sample) || sample < 0) throw new RangeError("sample must be finite and >= 0");
    this.v = this.v === null ? sample : this.alpha * sample + (1 - this.alpha) * this.v;
    return this.v;
  }
}

/** Circuit breaker. Time is passed in explicitly (integer ms, non-decreasing). */
export class Breaker {
  private st: BreakerState = "closed";
  private failures = 0;
  private openedAt = 0;
  private probes = 0;
  private readonly cfg: BreakerConfig;
  constructor(cfg: BreakerConfig) {
    if (!Number.isInteger(cfg.failureThreshold) || cfg.failureThreshold < 1) throw new RangeError("failureThreshold");
    if (!Number.isInteger(cfg.cooldownMs) || cfg.cooldownMs < 0) throw new RangeError("cooldownMs");
    if (!Number.isInteger(cfg.halfOpenProbes) || cfg.halfOpenProbes < 1) throw new RangeError("halfOpenProbes");
    this.cfg = { failureThreshold: cfg.failureThreshold, cooldownMs: cfg.cooldownMs, halfOpenProbes: cfg.halfOpenProbes };
  }
  get state(): BreakerState {
    return this.st;
  }
  allow(nowMs: number): boolean {
    if (this.st === "closed") return true;
    if (this.st === "open") {
      if (nowMs - this.openedAt < this.cfg.cooldownMs) return false;
      this.st = "half_open";
      this.probes = 1;
      return true;
    }
    if (this.probes < this.cfg.halfOpenProbes) {
      this.probes++;
      return true;
    }
    return false;
  }
  onSuccess(_nowMs: number): void {
    if (this.st === "closed") this.failures = 0;
    else if (this.st === "half_open") {
      this.st = "closed";
      this.failures = 0;
      this.probes = 0;
    }
  }
  onFailure(nowMs: number): void {
    if (this.st === "closed") {
      this.failures++;
      if (this.failures >= this.cfg.failureThreshold) {
        this.st = "open";
        this.openedAt = nowMs;
      }
    } else if (this.st === "half_open") {
      this.st = "open";
      this.openedAt = nowMs;
      this.probes = 0;
    }
  }
}

/** Retry delay (integer ms). attempt starts at 0. rand in [0, 1) is only used when jitter != none. */
export function backoffDelay(attempt: number, cfg: BackoffConfig, rand = 0): number {
  if (!Number.isInteger(attempt) || attempt < 0) throw new RangeError("attempt");
  if (!(cfg.baseMs >= 0) || !(cfg.factor >= 1) || !(cfg.maxMs >= 0)) throw new RangeError("config");
  if (!(rand >= 0 && rand < 1)) throw new RangeError("rand");
  let d = Math.min(cfg.baseMs, cfg.maxMs);
  for (let i = 0; i < attempt && d < cfg.maxMs; i++) d = Math.min(cfg.maxMs, d * cfg.factor);
  if (cfg.jitter === "full") return Math.floor(d * rand);
  if (cfg.jitter === "equal") {
    const half = d / 2;
    return Math.floor(half + half * rand);
  }
  return Math.floor(d);
}

/**
 * Rank candidates: healthy first, then those without samples (probed first),
 * then ascending EWMA, ties broken by original order. Returns at most n ids.
 */
export function rank(cands: Candidate[], n: number): string[] {
  if (!Number.isInteger(n) || n < 0) throw new RangeError("n");
  const dec = cands.map((c, i) => ({ c, i }));
  dec.sort((a, b) => {
    if (a.c.healthy !== b.c.healthy) return a.c.healthy ? -1 : 1;
    const au = a.c.ewma === null;
    const bu = b.c.ewma === null;
    if (au !== bu) return au ? -1 : 1;
    if (!au && !bu && (a.c.ewma as number) !== (b.c.ewma as number)) return (a.c.ewma as number) < (b.c.ewma as number) ? -1 : 1;
    return a.i - b.i;
  });
  return dec.slice(0, n).map((x) => x.c.id);
}
