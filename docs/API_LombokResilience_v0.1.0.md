# API LombokResilience v0.1.0

Bahasa referensi: TypeScript. Port Python memakai penamaan snake_case dan mengembalikan tuple atau dataclass dengan isi yang sama. Stabilitas: 0.x, perubahan dapat terjadi dengan catatan di CHANGELOG. Sejak versi: 0.1.0.

- `new Ewma(alpha): update(sample) -> value; value`
- `new Breaker({failureThreshold, cooldownMs, halfOpenProbes}): allow(nowMs); onSuccess(nowMs); onFailure(nowMs); state`
- `backoffDelay(attempt, {baseMs, factor, maxMs, jitter}, rand=0) -> ms`
- `rank(candidates, n) -> ids`

Kesalahan masukan di luar rentang SPEC memicu `RangeError` (TypeScript) atau `ValueError` (Python); fungsi yang didefinisikan total mengembalikan nilai khusus (null, invalid) sesuai SPEC.

Kompatibilitas lintas bahasa: lihat SPEC bagian 3 dan vector.
