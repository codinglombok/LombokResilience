# Ringkasan Proyek LombokResilience

## Apa ini

Small resilience primitives with explicit time: EWMA latency tracking, circuit breaker, exponential backoff with jitter, and health-aware candidate ranking. Part of the Lombok Ecosystem.

## Mengapa dibuat

Klien yang memanggil beberapa tujuan setara (server, replika, penyedia) membutuhkan cara memilih yang cepat dan sehat, berhenti memanggil yang gagal, dan mencoba ulang dengan jeda. Library ini menyediakan bagian-bagian itu sebagai fungsi murni dengan waktu eksplisit, identik lintas bahasa.

## Fitur utama

- Ewma: rata-rata bergerak eksponensial
- Breaker: closed, open, half_open dengan jumlah percobaan terbatas
- backoffDelay: eksponensial, batas atas, jitter none/full/equal dengan angka acak dari pemanggil
- rank: urutkan kandidat sehat dan terukur, kembalikan n teratas untuk balapan atau failover

## Status saat ini

Versi 0.1.0, belum dirilis. TypeScript dan Python lulus 508 kasus vector. Port lain belum ada.

## Contoh pemakai

- Klien HTTP/RPC dengan beberapa replika
- Pemilihan server upstream (DNS, NTP, mirror paket)
- Penjadwalan ulang tugas latar yang gagal
- Klien MQTT/modem pada perangkat tertanam yang perlu jeda ulang tanpa jam sistem

## Batasan yang Diketahui

- Breaker berbasis kegagalan beruntun; tidak ada jendela laju kegagalan.
- Tidak aman antar-thread.
- Port Rust, Go, PHP BELUM.

## Info lanjut

SPEC: `SPEC_LombokResilience_v0.1.0.md`; API: `API_LombokResilience_v0.1.0.md`; panduan: `guide_how_to_use_LombokResilience_v0.1.0.md`.

## Gap vs pembanding

Pembanding: resilience4j, opossum, gobreaker, tenacity. Gap jujur: tidak ada bulkhead, timeout, atau hedging bawaan; keunggulan: kontrak deterministik dan jejak kecil.
