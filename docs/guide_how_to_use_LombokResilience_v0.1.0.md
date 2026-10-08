# Panduan Pemakaian LombokResilience

## 1. Instalasi

Setelah rilis: `npm install lombokresilience` atau `pip install lombokresilience`. Sebelum rilis, salin folder `typescript/src` atau `python/src/lombokresilience` (tanpa dependensi).

## 2. Konsep dasar

Empat bagian independen: Ewma menyimpan rata-rata latensi; Breaker memutus pemanggilan tujuan yang gagal; backoffDelay menghitung jeda ulang; rank memilih kandidat terbaik. Semua menerima waktu atau angka acak dari pemanggil.

## 3. Contoh

Berkas `examples/example.ts` dan `examples/example.py` menghasilkan keluaran berikut (TypeScript; Python sama kecuali format cetak):

```
ewma 112.32
rank [ 'b', 'a', 'c' ]
open false true half_open
backoff [ 100, 200, 400, 500 ]
```

Kode TypeScript:

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

- Balapan ke top-N: rank(kandidat, 4) lalu kirim paralel ke hasilnya.
- Probe kesehatan: panggil Breaker.allow sebelum mencoba dan onSuccess/onFailure sesudahnya.
- Jitter: berikan rand dari generator Anda ke backoffDelay dengan jitter 'full' atau 'equal'.

## 5. Common pitfalls

- Breaker berbasis kegagalan beruntun; tidak ada jendela laju kegagalan.
- Tidak aman antar-thread.
- Port Rust, Go, PHP BELUM.

## 6. Lihat juga

`SPEC_LombokResilience_v0.1.0.md`, `API_LombokResilience_v0.1.0.md`, `full_summary_project_LombokResilience_v0.1.0.md`.
