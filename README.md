# LombokResilience

Small resilience primitives with explicit time: EWMA latency tracking, circuit breaker, exponential backoff with jitter, and health-aware candidate ranking. Part of the Lombok Ecosystem.

## Mengapa library ini?

Klien yang memanggil beberapa tujuan setara (server, replika, penyedia) membutuhkan cara memilih yang cepat dan sehat, berhenti memanggil yang gagal, dan mencoba ulang dengan jeda. Library ini menyediakan bagian-bagian itu sebagai fungsi murni dengan waktu eksplisit, identik lintas bahasa.

## Fitur

- Ewma: rata-rata bergerak eksponensial
- Breaker: closed, open, half_open dengan jumlah percobaan terbatas
- backoffDelay: eksponensial, batas atas, jitter none/full/equal dengan angka acak dari pemanggil
- rank: urutkan kandidat sehat dan terukur, kembalikan n teratas untuk balapan atau failover

## Skenario pemakaian

- Klien HTTP/RPC dengan beberapa replika
- Pemilihan server upstream (DNS, NTP, mirror paket)
- Penjadwalan ulang tugas latar yang gagal
- Klien MQTT/modem pada perangkat tertanam yang perlu jeda ulang tanpa jam sistem

## Instalasi

Belum terbit di registry (0.1.0 belum dirilis). Setelah rilis:

```
npm install lombokresilience
pip install lombokresilience
```

## API ringkas

- `new Ewma(alpha): update(sample) -> value; value`
- `new Breaker({failureThreshold, cooldownMs, halfOpenProbes}): allow(nowMs); onSuccess(nowMs); onFailure(nowMs); state`
- `backoffDelay(attempt, {baseMs, factor, maxMs, jitter}, rand=0) -> ms`
- `rank(candidates, n) -> ids`

Rincian: `docs/API_LombokResilience_v0.1.0.md`.

## Status port

| Port | Status |
|---|---|
| TypeScript (referensi) | YA, lulus seluruh 508 kasus vector |
| Python | YA, lulus seluruh 508 kasus vector |
| Rust, Go, PHP | BELUM |

## Standar yang diimplementasikan

Kontrak normatif ada di `docs/SPEC_LombokResilience_v0.1.0.md`; vector di `vectors/lombokresilience-vectors-v1.json`.

## Batasan yang diketahui

- Breaker berbasis kegagalan beruntun; tidak ada jendela laju kegagalan.
- Tidak aman antar-thread.
- Port Rust, Go, PHP BELUM.

## Pengembangan

```
node --test typescript/test/          # TypeScript (Node 22+)
python -m pytest python/tests         # Python 3.10+
node scripts/gen_vectors.ts           # membangkitkan ulang vector dari referensi TypeScript
```

## Ekosistem Lombok

Part of the [Lombok Ecosystem](https://github.com/codinglombok).

## Lisensi

Apache-2.0 OR MIT (lihat `LICENSE-APACHE` dan `LICENSE-MIT`).
