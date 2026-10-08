# Pengembangan LombokResilience

## 1. Roadmap

- 0.1.1: CI, coverage, fuzz, publish
- 0.2.0: port Rust (no_std), Go, PHP
- 0.3.0: jendela laju kegagalan pada Breaker; timeout dan hedging sebagai fungsi murni

## 2. Deferred scope

Library ini tidak melakukan I/O, tidak membaca jam, dan tidak membuat angka acak.

## 3. Prinsip desain untuk kontributor

- Kontrak dulu: ubah SPEC dan vector sebelum kode; perbedaan antar-port adalah bug.
- Tanpa dependensi runtime; tanpa jam, tanpa jaringan, tanpa acak tersembunyi.
- Setiap fitur README memiliki kasus vector atau test.
- Tidak ada nama klien atau aplikasi pemilik di berkas publik.
- Tanpa emoji di `*.md`.

## 4. Cara berkontribusi

Fork, cabang `feat/...`, jalankan kedua runner vector, perbarui `API_` dan `SPEC_` bila perilaku berubah, buka PR. Bangkitkan ulang vector dengan `node scripts/gen_vectors.ts` hanya bila kontrak berubah, dan tinjau diff vector.

## 5. Pertanyaan terbuka

- Apakah ambang kegagalan berbasis laju perlu menggantikan kegagalan beruntun?
- Format serialisasi keadaan untuk memulihkan Breaker setelah restart?
