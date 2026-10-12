# Project Summary LombokResilience

## What it is

Small resilience primitives with explicit time: EWMA latency tracking, circuit breaker, exponential backoff with jitter, and health-aware candidate ranking. Part of the Lombok Ecosystem.

## Why it exists

A client that calls several equivalent targets (servers, replicas, providers) needs to pick the fast and healthy ones, stop calling failing ones, and retry with delays. This library provides those pieces as pure functions with explicit time, identical across languages.

## Main features

- Ewma: exponentially weighted moving average
- Breaker: closed, open, half_open with a bounded number of probes
- backoffDelay: exponential, capped, with none/full/equal jitter using a random number supplied by the caller
- rank: order healthy, measured candidates and return the top n for racing or failover

## Current status

Version 0.1.0, not yet released. TypeScript and Python pass 508 vector cases. No other ports exist.

## Example use cases

- HTTP/RPC clients with several replicas
- Upstream selection (DNS, NTP, package mirrors)
- Rescheduling failed background jobs
- MQTT or modem clients on embedded devices that need retry delays without a system clock

## Known Limitations

- Breaker is based on consecutive failures; there is no failure-rate window.
- Not thread-safe.
- Rust, Go and PHP ports: NOT YET.

## Further information

SPEC: `SPEC_LombokResilience_v0.1.0.md`; API: `API_LombokResilience_v0.1.0.md`; guide: `guide_how_to_use_LombokResilience_v0.1.0.md`.

## Gap versus comparable libraries

Comparable: resilience4j, opossum, gobreaker, tenacity. Honest gap: no built-in bulkhead, timeout, or hedging; strength: a deterministic contract and a small footprint.
