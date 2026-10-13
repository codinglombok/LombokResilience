# LombokResilience

Small resilience primitives with explicit time: EWMA latency tracking, circuit breaker, exponential backoff with jitter, and health-aware candidate ranking. Part of the Lombok Ecosystem.

## Why this library?

A client that calls several equivalent targets (servers, replicas, providers) needs to pick the fast and healthy ones, stop calling failing ones, and retry with delays. This library provides those pieces as pure functions with explicit time, identical across languages.

## Features

- Ewma: exponentially weighted moving average
- Breaker: closed, open, half_open with a bounded number of probes
- backoffDelay: exponential, capped, with none/full/equal jitter using a random number supplied by the caller
- rank: order healthy, measured candidates and return the top n for racing or failover

## Use cases

- HTTP/RPC clients with several replicas
- Upstream selection (DNS, NTP, package mirrors)
- Rescheduling failed background jobs
- MQTT or modem clients on embedded devices that need retry delays without a system clock

## Installation

Not yet published to any registry (0.1.0 has not been released). After release:

```
npm install lombokresilience
pip install lombokresilience
```

## API overview

- `new Ewma(alpha): update(sample) -> value; value`
- `new Breaker({failureThreshold, cooldownMs, halfOpenProbes}): allow(nowMs); onSuccess(nowMs); onFailure(nowMs); state`
- `backoffDelay(attempt, {baseMs, factor, maxMs, jitter}, rand=0) -> ms`
- `rank(candidates, n) -> ids`

Details: `docs/API_LombokResilience_v0.1.0.md`.

## Port status

| Port | Status |
|---|---|
| TypeScript (reference) | YES, passes all 508 vector cases |
| Python | YES, passes all 508 vector cases |
| Rust, Go, PHP | NOT YET |

## Standards implemented

The normative contract is in `docs/SPEC_LombokResilience_v0.1.0.md`; the vectors are in `vectors/lombokresilience-vectors-v1.json`.

## Known limitations

- Breaker is based on consecutive failures; there is no failure-rate window.
- Not thread-safe.
- Rust, Go and PHP ports: NOT YET.

## Development

```
node --test typescript/test/vectors.test.ts   # TypeScript (Node 22+)
python -m pytest python/tests                 # Python 3.10+
node scripts/gen_vectors.ts                   # regenerate vectors from the TypeScript reference
```

## Lombok Ecosystem

Part of the [Lombok Ecosystem](https://github.com/codinglombok).

## License

Apache-2.0 OR MIT (see `LICENSE-APACHE` and `LICENSE-MIT`).
