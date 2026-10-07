import { writeFileSync } from "node:fs";
import { Breaker, Ewma, backoffDelay, rank, type BackoffConfig, type BreakerConfig, type Candidate } from "../typescript/src/index.ts";

let seed = 12345;
const lcg = (): number => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0), seed / 4294967296);

const ewmaSeqs: { alpha: number; samples: number[] }[] = [
  { alpha: 0.2, samples: [10, 20, 30, 5, 5, 5, 100, 0, 0.5, 12.25] },
  { alpha: 0.5, samples: [1, 2, 3, 4, 5, 6, 7, 8] },
  { alpha: 1, samples: [7, 9, 11] },
  { alpha: 0.05, samples: [100, 100, 100, 1, 1, 1, 1, 1] },
  { alpha: 0.2, samples: [0] },
  { alpha: 0.3, samples: Array.from({ length: 30 }, () => Math.round(lcg() * 5000) / 100) },
];
const ewma = ewmaSeqs.map((s) => {
  const e = new Ewma(s.alpha);
  return { alpha: s.alpha, values: s.samples.map((x) => ({ sample: x, value: e.update(x) })) };
});

type BOp = { op: "allow" | "success" | "failure"; t: number };
const bcfgs: BreakerConfig[] = [
  { failureThreshold: 5, cooldownMs: 30000, halfOpenProbes: 1 },
  { failureThreshold: 1, cooldownMs: 0, halfOpenProbes: 2 },
  { failureThreshold: 3, cooldownMs: 1000, halfOpenProbes: 3 },
];
const manual: BOp[] = [
  ...Array.from({ length: 4 }, (): BOp => ({ op: "failure", t: 0 })),
  { op: "allow", t: 0 }, { op: "success", t: 1 },
  ...Array.from({ length: 5 }, (_, i): BOp => ({ op: "failure", t: 10 + i })),
  { op: "allow", t: 14 }, { op: "allow", t: 30013 }, { op: "allow", t: 30014 }, { op: "failure", t: 30014 },
  { op: "allow", t: 60013 }, { op: "allow", t: 60014 }, { op: "success", t: 60015 }, { op: "allow", t: 60016 },
  { op: "failure", t: 60017 }, { op: "success", t: 60018 },
];
const bops: BOp[][] = [manual, manual, manual];
for (let k = 0; k < 3; k++) {
  const ops: BOp[] = [];
  let t = 0;
  for (let i = 0; i < 80; i++) {
    t += Math.floor(lcg() * 700);
    const r = lcg();
    ops.push({ op: r < 0.45 ? "allow" : r < 0.65 ? "success" : "failure", t });
  }
  bops.push(ops);
}
const allCfg = [...bcfgs, ...bcfgs];
const breaker = bops.map((ops, i) => {
  const b = new Breaker(allCfg[i]);
  return {
    cfg: allCfg[i],
    steps: ops.map((o) => {
      let allowed: boolean | null = null;
      if (o.op === "allow") allowed = b.allow(o.t);
      else if (o.op === "success") b.onSuccess(o.t);
      else b.onFailure(o.t);
      return { op: o.op, t: o.t, allowed, state: b.state };
    }),
  };
});

const bcs: BackoffConfig[] = [
  { baseMs: 100, factor: 2, maxMs: 30000, jitter: "none" },
  { baseMs: 100, factor: 2, maxMs: 30000, jitter: "full" },
  { baseMs: 100, factor: 2, maxMs: 30000, jitter: "equal" },
  { baseMs: 250, factor: 1.5, maxMs: 5000, jitter: "none" },
  { baseMs: 10, factor: 1, maxMs: 1000, jitter: "equal" },
  { baseMs: 0, factor: 3, maxMs: 1000, jitter: "none" },
  { baseMs: 5000, factor: 2, maxMs: 1000, jitter: "none" },
  { baseMs: 10, factor: 2, maxMs: 0, jitter: "none" },
];
const backoff: { cfg: BackoffConfig; attempt: number; rand: number; delay: number }[] = [];
for (const cfg of bcs)
  for (const attempt of [0, 1, 2, 3, 5, 8, 12, 40]) for (const rand of [0, 0.25, 0.5, 0.999])
    if (cfg.jitter !== "none" || rand === 0) backoff.push({ cfg, attempt, rand, delay: backoffDelay(attempt, cfg, rand) });

const C = (id: string, ewma: number | null, healthy = true): Candidate => ({ id, ewma, healthy });
const rankSets: { cands: Candidate[]; n: number }[] = [
  { cands: [C("a", 30), C("b", 10), C("c", 20), C("d", 5), C("e", 50)], n: 4 },
  { cands: [C("a", 30), C("b", null), C("c", 20)], n: 3 },
  { cands: [C("a", 10, false), C("b", 90), C("c", 50, false), C("d", 20)], n: 3 },
  { cands: [C("a", 10, false), C("b", 90, false)], n: 5 },
  { cands: [C("a", 10), C("b", 10), C("c", 10)], n: 2 },
  { cands: [C("a", null), C("b", null), C("c", 1)], n: 2 },
  { cands: [], n: 4 },
  { cands: [C("a", 1)], n: 0 },
  { cands: [C("a", 0), C("b", null), C("c", 0, false), C("d", null, false)], n: 4 },
];
const rk = rankSets.map((s) => ({ ...s, out: rank(s.cands, s.n) }));

const caseCount = ewma.reduce((a, s) => a + s.values.length, 0) + breaker.reduce((a, s) => a + s.steps.length, 0) + backoff.length + rk.length;
writeFileSync(new URL("../vectors/lombokresilience-vectors-v1.json", import.meta.url), JSON.stringify({ version: 1, caseCount, ewma, breaker, backoff, rank: rk }, null, 1) + "\n");
console.log("cases", caseCount);
