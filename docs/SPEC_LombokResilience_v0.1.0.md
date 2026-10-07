# SPEC LombokResilience v0.1.0

This document is the normative cross-language contract. Every language port MUST produce byte-identical output for all specified inputs. Deviations from this specification are bugs.

Kata MUST, SHOULD, dan MAY dibaca sesuai RFC 2119. Tinjauan terakhir: 2026-10-07.

## 0. Standar acuan

Library ini mendefinisikan kontraknya sendiri; tidak ada standar eksternal normatif kecuali yang disebut pada bagian terkait.

## 1. Vector

| Berkas | Kasus | SHA-256 |
|---|---|---|
| `vectors/lombokresilience-vectors-v1.json` | 508 | `6fd619478f92a456e2eb8b8800b39f4a4fc03a872f32589ce0060c37366627bf` |

## 2. Kontrak

1. Ewma: alpha dalam (0,1]; sampel pertama menjadi nilai; berikutnya v = alpha*s + (1-alpha)*v dihitung persis dalam urutan itu (IEEE 754 double). Sampel harus terhingga dan >= 0.
2. Breaker closed: onFailure menaikkan hitungan beruntun; mencapai ambang membuka sirkuit (openedAt = now); onSuccess mengosongkan hitungan. open: allow salah sampai now - openedAt >= cooldownMs, lalu half_open dengan satu percobaan terhitung dan allow benar. half_open: allow benar selama percobaan < halfOpenProbes; onSuccess menutup; onFailure membuka ulang (openedAt = now). onSuccess/onFailure pada open diabaikan.
3. backoffDelay: d = min(baseMs, maxMs); ulangi attempt kali: d = min(maxMs, d*factor) (berhenti bila d >= maxMs). none: floor(d); full: floor(d*rand); equal: h = d/2, floor(h + h*rand). rand dalam [0,1); factor >= 1.
4. rank: urutan kunci (sehat dulu, lalu ewma null, lalu ewma naik, lalu indeks asal); kembalikan paling banyak n id; kandidat tidak sehat hanya mengisi sisa setelah semua yang sehat.

## 3. Representasi lintas bahasa

Indeks dan panjang string dihitung per code point; angka floating point memakai IEEE 754 double dengan urutan operasi seperti tertulis; bilangan bulat besar tidak boleh kehilangan presisi.

## 4. Non-goals

Library ini tidak melakukan I/O, tidak membaca jam, dan tidak membuat angka acak.

## 5. Riwayat perubahan kontrak

- 0.1.0: kontrak awal.
