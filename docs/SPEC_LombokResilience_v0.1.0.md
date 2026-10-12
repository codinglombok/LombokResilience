# SPEC LombokResilience v0.1.0

This document is the normative cross-language contract. Every language port MUST produce byte-identical output for all specified inputs. Deviations from this specification are bugs.

The keywords MUST, SHOULD and MAY are to be read as in RFC 2119. Last reviewed: 2026-10-07.

## 0. Reference standards

This library defines its own contract; there is no normative external standard except those named in the relevant sections.

## 1. Vectors

| File | Cases | SHA-256 |
|---|---|---|
| `vectors/lombokresilience-vectors-v1.json` | 508 | `6fd619478f92a456e2eb8b8800b39f4a4fc03a872f32589ce0060c37366627bf` |

## 2. Contract

1. Ewma: alpha in (0,1]; the first sample becomes the value; subsequently v = alpha*s + (1-alpha)*v, evaluated exactly in that order (IEEE 754 double). Samples MUST be finite and >= 0.
2. Breaker closed: onFailure increments the consecutive-failure count; reaching the threshold opens the circuit (openedAt = now); onSuccess resets the count. open: allow returns false until now - openedAt >= cooldownMs, then the state becomes half_open with one probe counted and allow returns true. half_open: allow returns true while probes < halfOpenProbes; onSuccess closes; onFailure reopens (openedAt = now). onSuccess/onFailure while open are ignored.
3. backoffDelay: d = min(baseMs, maxMs); repeat attempt times: d = min(maxMs, d*factor) (stop when d >= maxMs). none: floor(d); full: floor(d*rand); equal: h = d/2, floor(h + h*rand). rand is in [0,1); factor >= 1.
4. rank: sort key (healthy first, then ewma null, then ascending ewma, then original index); return at most n ids; unhealthy candidates only fill the remainder after all healthy ones.

## 3. Cross-language representation

String indexes and lengths are counted in code points; floating-point numbers use IEEE 754 doubles with the order of operations as written; large integers MUST NOT lose precision.

## 4. Non-goals

This library performs no I/O, reads no clock, and generates no random numbers.

## 5. Contract change history

- 0.1.0: initial contract.
