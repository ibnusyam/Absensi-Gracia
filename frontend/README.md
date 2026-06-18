# Absensi Gracia — Frontend

Single Page App untuk aplikasi absensi, dibangun dengan **React 19 + Vite + TypeScript +
Tailwind CSS**. Dokumentasi lengkap (cara setup backend, akun demo, alur penggunaan) ada
di [README utama](../README.md).

## Menjalankan

```bash
npm install
cp .env.example .env        # set VITE_API_BASE_URL ke URL API backend
npm run dev                 # dev server di http://localhost:5173
```

Pastikan backend Laravel sudah berjalan (default `http://127.0.0.1:8000/api/v1`).

## Skrip

| Perintah          | Keterangan                          |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Jalankan dev server (HMR)           |
| `npm run build`   | Build produksi ke `dist/`           |
| `npm run preview` | Preview hasil build                 |
| `npm run lint`    | Jalankan ESLint                     |

## Environment

| Variabel             | Contoh                                | Keterangan        |
| -------------------- | ------------------------------------- | ----------------- |
| `VITE_API_BASE_URL`  | `http://127.0.0.1:8000/api/v1`        | Base URL API      |
