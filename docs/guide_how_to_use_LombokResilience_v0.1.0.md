# Usage Guide LombokResilience

## 1. Installation

After release: `npm install lombokresilience` or `pip install lombokresilience`. Before release, copy the `typescript/src` folder or `python/src/lombokresilience` (no dependencies).

## 2. Basic concepts

Four independent parts: Ewma keeps an average latency; Breaker stops calling failing targets; backoffDelay computes retry delays; rank chooses the best candidates. All of them take time or random numbers from the caller.

## 3. Examples

`examples/example.ts` and `examples/example.py` produce the following output (TypeScript; Python is identical except for print formatting):

```
ewma 112.32
rank [ 'b', 'a', 'c' ]
open false true half_open
backoff [ 100, 200, 400, 500 ]
```

TypeScript code:

```ts
import { Breaker, Ewma, backoffDelay, rank } from "lombokresilience";

const e = new Ewma(0.2);
[40, 42, 400].forEach((x) => e.update(x));
console.log("ewma", e.value);
console.log("rank", rank([{ id: "a", ewma: 30, healthy: true }, { id: "b", ewma: null, healthy: true }, { id: "c", ewma: 10, healthy: false }], 3));
const b = new Breaker({ failureThreshold: 2, cooldownMs: 1000, halfOpenProbes: 1 });
b.onFailure(0); b.onFailure(1);
console.log(b.state, b.allow(500), b.allow(1001), b.state);
console.log("backoff", [0, 1, 2, 3].map((n) => backoffDelay(n, { baseMs: 100, factor: 2, maxMs: 500, jitter: "none" })));
```

## 4. Recipes

- Race the top N: rank(candidates, 4) and send in parallel to the result.
- Health probing: call Breaker.allow before trying and onSuccess/onFailure afterwards.
- Jitter: pass a rand value from your generator to backoffDelay with jitter 'full' or 'equal'.

## 5. Common pitfalls

- Breaker is based on consecutive failures; there is no failure-rate window.
- Not thread-safe.
- Rust, Go and PHP ports: NOT YET.

## 6. See also

`SPEC_LombokResilience_v0.1.0.md`, `API_LombokResilience_v0.1.0.md`, `full_summary_project_LombokResilience_v0.1.0.md`.
