export type RoleSlug =
  | 'super-admin'
  | 'admin-bagian'
  | 'karyawan'
  | 'hrd'
  | 'direktur'

export interface Role {
  id: number
  name: string
  slug: RoleSlug
}

export interface Department {
  id: number
  name: string
  manager_user_id: number | null
  manager?: User | null
}

export interface User {
  id: number
  name: string
  email: string
  employee_id: string | null
  phone: string | null
  avatar_url: string | null
  joined_at: string | null
  is_active: boolean
  department_id: number | null
  role_id: number | null
  department?: Department | null
  role?: Role | null

  // Extended employee profile (mirrored from the old HRD master data)
  no_ktp?: string | null
  alamat?: string | null
  telepon_rumah?: string | null
  tempat_lahir?: string | null
  tanggal_lahir?: string | null
  jenis_kelamin?: string | null
  status_pernikahan?: string | null
  jumlah_tanggungan?: number | null
  agama?: string | null
  pendidikan?: string | null
  jurusan?: string | null
  status_pajak?: string | null
  no_npwp?: string | null
  no_jamsostek?: string | null
  rekening_bca?: string | null
  rekening_bni?: string | null
  status_karir?: string | null
  tanggal_spk?: string | null
  kartu_pensiun?: string | null
  kode_jabatan?: string | null
  nama_jabatan?: string | null
  keterangan_data?: string | null
  jatah_cuti?: string | number | null
  tahun_cuti?: number | null
  sisa_cuti?: string | number | null
}
