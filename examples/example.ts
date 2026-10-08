import { Breaker, Ewma, backoffDelay, rank } from "../typescript/src/index.ts";

const e = new Ewma(0.2);
[40, 42, 400].forEach((x) => e.update(x));
console.log("ewma", e.value);
console.log("rank", rank([{ id: "a", ewma: 30, healthy: true }, { id: "b", ewma: null, healthy: true }, { id: "c", ewma: 10, healthy: false }], 3));
const b = new Breaker({ failureThreshold: 2, cooldownMs: 1000, halfOpenProbes: 1 });
b.onFailure(0); b.onFailure(1);
console.log(b.state, b.allow(500), b.allow(1001), b.state);
console.log("backoff", [0, 1, 2, 3].map((n) => backoffDelay(n, { baseMs: 100, factor: 2, maxMs: 500, jitter: "none" })));
