export type BreakerState = "closed" | "open" | "half_open";
export type Jitter = "none" | "full" | "equal";

export interface BreakerConfig {
  /** kegagalan beruntun yang membuka sirkuit (>= 1) */
  failureThreshold: number;
  /** ms sirkuit terbuka sebelum mengizinkan percobaan (>= 0) */
  cooldownMs: number;
  /** jumlah percobaan serentak pada half_open (>= 1) */
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
  /** rata-rata latensi (EWMA) atau null bila belum ada sampel */
  ewma: number | null;
  healthy: boolean;
}

/** Rata-rata bergerak eksponensial. Sampel pertama menjadi nilai awal. */
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

/** Pemutus sirkuit. Waktu dilewatkan eksplisit (ms bilangan bulat, tidak turun). */
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

/** Jeda ulang (ms, bilangan bulat). attempt dimulai dari 0. rand dalam [0, 1) hanya dipakai bila jitter != none. */
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
 * Urutkan kandidat: sehat dulu, lalu yang belum punya sampel (dijajal lebih dulu),
 * lalu EWMA naik, seri diputus oleh urutan awal. Kembalikan paling banyak n id.
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
