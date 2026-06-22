# Import Karyawan dari Aplikasi HRD Lama (MySQL) → app ini (PostgreSQL)

Script: `tools/import_legacy_employees.php`

Membaca **file dump `.sql`** dari aplikasi lama secara langsung (tidak perlu install MySQL),
mentransformasi, lalu menulis ke database PostgreSQL aplikasi ini (kredensial dibaca dari `.env`).

## Sumber data (tabel lama)
- `master`  → data karyawan (nama, email, hp, nik, password lama, dll)
- `karir`   → riwayat jabatan/penempatan; record **terakhir** = departemen & status terkini
- `dept`    → daftar departemen

## Aturan migrasi (sudah disepakati)
| Field app | Asal | Catatan |
|---|---|---|
| `name` | `master.n_karyawan` | |
| `email` | `master.email` | jika kosong/invalid → `nik<NIK>@graciapharmindo.online` |
| `employee_id` | `master.nik` | fallback `EMP<id_kryw>` jika kosong/duplikat |
| `phone` | `master.hp` | |
| `department_id` | `karir.departemen` (terakhir) → `dept` → dibuat di app | semua dept lama dibuat |
| `joined_at` | `karir.tgl_masuk` paling awal | fallback `master.p_spk` |
| `is_active` | `karir.resign` (terakhir) kosong = aktif | |
| `password` | **= NIK** (bcrypt) | karyawan wajib ganti setelah login |
| `role_id` | semua = **Karyawan** | admin/HRD/Direktur diatur manual setelahnya |

⚠️ Password lama (`master.pa55` + `salt`) **tidak dipakai** — formatnya tidak kompatibel dengan bcrypt Laravel.

## Cara pakai

1. Taruh file dump lama ke satu folder, mis. `tools/legacy_dump/`:
   `master.sql`, `karir*.sql`, `dept.sql`
2. **Cek dulu (tanpa menulis apa pun):**
   ```bash
   php tools/import_legacy_employees.php --dir=tools/legacy_dump --dry-run
   ```
   Periksa jumlah karyawan, departemen, email digenerate, dll.
3. **Import sungguhan** (go-live, mengganti data dummy):
   ```bash
   php tools/import_legacy_employees.php --dir=tools/legacy_dump --fresh
   ```
   - `--fresh` = kosongkan `departments` + `users` (beserta data turunannya) lalu mulai bersih.
   - Tanpa `--fresh` = tambahkan ke data yang ada (cek duplikat email/NIK).

> Selalu backup database Postgres sebelum menjalankan tanpa `--dry-run`:
> `pg_dump -h 127.0.0.1 -U absensi_gracia absensi_gracia > backup_sebelum_import.sql`

## Setelah import
- Set role Super Admin / HRD / Direktur untuk orang yang sesuai (default semua "Karyawan").
- Beritahu karyawan: login pakai email (lihat hasil import) & password = NIK, lalu ganti password.
