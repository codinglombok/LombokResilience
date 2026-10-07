import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Breaker, Ewma, backoffDelay, rank } from "../src/index.ts";

const v = JSON.parse(readFileSync(new URL("../../vectors/lombokresilience-vectors-v1.json", import.meta.url), "utf8"));

test("vector count >= 100", () => assert.ok(v.caseCount >= 100));
test("ewma", () => {
  for (const s of v.ewma) {
    const e = new Ewma(s.alpha);
    for (const x of s.values) assert.equal(e.update(x.sample), x.value);
  }
});
test("breaker", () => {
  for (const s of v.breaker) {
    const b = new Breaker(s.cfg);
    for (const st of s.steps) {
      let allowed: boolean | null = null;
      if (st.op === "allow") allowed = b.allow(st.t);
      else if (st.op === "success") b.onSuccess(st.t);
      else b.onFailure(st.t);
      assert.equal(allowed, st.allowed);
      assert.equal(b.state, st.state);
    }
  }
});
test("backoff", () => {
  for (const c of v.backoff) assert.equal(backoffDelay(c.attempt, c.cfg, c.rand), c.delay, JSON.stringify(c));
});
test("rank", () => {
  for (const c of v.rank) assert.deepEqual(rank(c.cands, c.n), c.out);
});
test("invalid input throws", () => {
  assert.throws(() => new Ewma(0));
  assert.throws(() => new Ewma(0.5).update(-1));
  assert.throws(() => new Ewma(0.5).update(Number.NaN));
  assert.throws(() => backoffDelay(-1, { baseMs: 1, factor: 2, maxMs: 10, jitter: "none" }));
  assert.throws(() => backoffDelay(0, { baseMs: 1, factor: 2, maxMs: 10, jitter: "full" }, 1));
  assert.throws(() => new Breaker({ failureThreshold: 0, cooldownMs: 0, halfOpenProbes: 1 }));
});
