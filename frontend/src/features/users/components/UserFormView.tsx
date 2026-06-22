import { useState } from 'react'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useDepartments, useRoles, useUserActions } from '@/features/users/hooks/useUsers'
import type { UserFormPayload } from '@/api/masterData.api'
import type { User } from '@/types/user'

interface Props {
  mode: 'create' | 'edit'
  user?: User
  /** Called with the saved user after a successful create/update. */
  onSaved: (user: User) => void
  onCancel: () => void
}

/** Trimmed string or null. */
const s = (v: string): string | null => v.trim() || null
/** Number or null. */
const n = (v: string): number | null => (v.trim() === '' ? null : Number(v))
/** Date "YYYY-MM-DD" from an API value, for <input type=date>. */
const d = (v?: string | null): string => (v ? String(v).slice(0, 10) : '')

/** A titled group of fields rendered as its own card. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        {children}
      </CardContent>
    </Card>
  )
}

/** Full-page employee form, shared by the desktop and mobile pages. */
export function UserFormView({ mode, user, onSaved, onCancel }: Props) {
  const departments = useDepartments()
  const roles = useRoles()
  const { create, update } = useUserActions()

  // Core (required) account fields
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState(user?.role_id ? String(user.role_id) : '')
  const [departmentId, setDepartmentId] = useState(user?.department_id ? String(user.department_id) : '')
  const [employeeId, setEmployeeId] = useState(user?.employee_id ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [joinedAt, setJoinedAt] = useState(d(user?.joined_at))
  const [isActive, setIsActive] = useState(user?.is_active ?? true)

  // Personal data
  const [noKtp, setNoKtp] = useState(user?.no_ktp ?? '')
  const [alamat, setAlamat] = useState(user?.alamat ?? '')
  const [teleponRumah, setTeleponRumah] = useState(user?.telepon_rumah ?? '')
  const [tempatLahir, setTempatLahir] = useState(user?.tempat_lahir ?? '')
  const [tanggalLahir, setTanggalLahir] = useState(d(user?.tanggal_lahir))
  const [jenisKelamin, setJenisKelamin] = useState(user?.jenis_kelamin ?? '')
  const [statusPernikahan, setStatusPernikahan] = useState(user?.status_pernikahan ?? '')
  const [jumlahTanggungan, setJumlahTanggungan] = useState(
    user?.jumlah_tanggungan != null ? String(user.jumlah_tanggungan) : '',
  )
  const [agama, setAgama] = useState(user?.agama ?? '')
  const [pendidikan, setPendidikan] = useState(user?.pendidikan ?? '')
  const [jurusan, setJurusan] = useState(user?.jurusan ?? '')

  // Tax / insurance / bank
  const [statusPajak, setStatusPajak] = useState(user?.status_pajak ?? '')
  const [noNpwp, setNoNpwp] = useState(user?.no_npwp ?? '')
  const [noJamsostek, setNoJamsostek] = useState(user?.no_jamsostek ?? '')
  const [rekeningBca, setRekeningBca] = useState(user?.rekening_bca ?? '')
  const [rekeningBni, setRekeningBni] = useState(user?.rekening_bni ?? '')

  // Employment
  const [statusKarir, setStatusKarir] = useState(user?.status_karir ?? '')
  const [namaJabatan, setNamaJabatan] = useState(user?.nama_jabatan ?? '')
  const [kodeJabatan, setKodeJabatan] = useState(user?.kode_jabatan ?? '')
  const [tanggalSpk, setTanggalSpk] = useState(d(user?.tanggal_spk))
  const [kartuPensiun, setKartuPensiun] = useState(d(user?.kartu_pensiun))
  const [keteranganData, setKeteranganData] = useState(user?.keterangan_data ?? '')

  // Leave balance
  const [jatahCuti, setJatahCuti] = useState(user?.jatah_cuti != null ? String(user.jatah_cuti) : '')
  const [sisaCuti, setSisaCuti] = useState(user?.sisa_cuti != null ? String(user.sisa_cuti) : '')
  const [tahunCuti, setTahunCuti] = useState(user?.tahun_cuti != null ? String(user.tahun_cuti) : '')

  const pending = create.isPending || update.isPending

  const submit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload: UserFormPayload = {
      name: name.trim(),
      email: email.trim(),
      role_id: Number(roleId),
      department_id: departmentId ? Number(departmentId) : null,
      employee_id: s(employeeId),
      phone: s(phone),
      joined_at: joinedAt || null,
      is_active: isActive,

      // Personal data
      no_ktp: s(noKtp),
      alamat: s(alamat),
      telepon_rumah: s(teleponRumah),
      tempat_lahir: s(tempatLahir),
      tanggal_lahir: tanggalLahir || null,
      jenis_kelamin: s(jenisKelamin),
      status_pernikahan: s(statusPernikahan),
      jumlah_tanggungan: n(jumlahTanggungan),
      agama: s(agama),
      pendidikan: s(pendidikan),
      jurusan: s(jurusan),
      // Tax / insurance / bank
      status_pajak: s(statusPajak),
      no_npwp: s(noNpwp),
      no_jamsostek: s(noJamsostek),
      rekening_bca: s(rekeningBca),
      rekening_bni: s(rekeningBni),
      // Employment
      status_karir: s(statusKarir),
      tanggal_spk: tanggalSpk || null,
      kartu_pensiun: kartuPensiun || null,
      kode_jabatan: s(kodeJabatan),
      nama_jabatan: s(namaJabatan),
      keterangan_data: s(keteranganData),
      // Leave balance
      jatah_cuti: n(jatahCuti),
      sisa_cuti: n(sisaCuti),
      tahun_cuti: n(tahunCuti),
    }
    if (password) payload.password = password

    if (mode === 'create') {
      create.mutate(payload, { onSuccess: onSaved })
    } else if (user) {
      update.mutate({ id: user.id, payload }, { onSuccess: onSaved })
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 pb-4">
      {/* Akun & jabatan */}
      <Section title="Akun & Jabatan">
        <div className="space-y-1">
          <Label htmlFor="u-name">Nama lengkap</Label>
          <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="u-email">Email</Label>
            <Input
              id="u-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-password">
              {mode === 'create' ? 'Password' : 'Password baru (opsional)'}
            </Label>
            <Input
              id="u-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'edit' ? 'Biarkan kosong jika tidak diubah' : ''}
              required={mode === 'create'}
              minLength={8}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="u-role">Role</Label>
            <Select id="u-role" value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
              <option value="">Pilih role…</option>
              {roles.data?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-dept">Bagian</Label>
            <Select id="u-dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">Tanpa bagian</option>
              {departments.data?.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="u-nik">NIK (opsional)</Label>
            <Input id="u-nik" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-phone">Telepon (opsional)</Label>
            <Input id="u-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="u-statuskarir">Status karir</Label>
            <Select id="u-statuskarir" value={statusKarir} onChange={(e) => setStatusKarir(e.target.value)}>
              <option value="">-</option>
              <option value="Kontrak">Kontrak</option>
              <option value="Tetap">Tetap</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-jab">Nama jabatan</Label>
            <Input id="u-jab" value={namaJabatan} onChange={(e) => setNamaJabatan(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="u-kodejab">Kode jabatan</Label>
            <Input id="u-kodejab" value={kodeJabatan} onChange={(e) => setKodeJabatan(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-joined">Tanggal bergabung</Label>
            <Input
              id="u-joined"
              type="date"
              value={joinedAt}
              onChange={(e) => setJoinedAt(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="u-spk">Tanggal SPK</Label>
            <Input id="u-spk" type="date" value={tanggalSpk} onChange={(e) => setTanggalSpk(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-pensiun">Tanggal kartu pensiun</Label>
            <Input id="u-pensiun" type="date" value={kartuPensiun} onChange={(e) => setKartuPensiun(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="u-ket">Keterangan</Label>
          <Input id="u-ket" value={keteranganData} onChange={(e) => setKeteranganData(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 pt-1 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Akun aktif
        </label>
      </Section>

      {/* Data pribadi */}
      <Section title="Data Pribadi">
        <div className="space-y-1">
          <Label htmlFor="u-noktp">No. KTP</Label>
          <Input id="u-noktp" value={noKtp} onChange={(e) => setNoKtp(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="u-alamat">Alamat</Label>
          <Input id="u-alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="u-tmplahir">Tempat lahir</Label>
            <Input id="u-tmplahir" value={tempatLahir} onChange={(e) => setTempatLahir(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-tgllahir">Tanggal lahir</Label>
            <Input id="u-tgllahir" type="date" value={tanggalLahir} onChange={(e) => setTanggalLahir(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="u-jk">Jenis kelamin</Label>
            <Select id="u-jk" value={jenisKelamin} onChange={(e) => setJenisKelamin(e.target.value)}>
              <option value="">-</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-nikah">Status pernikahan</Label>
            <Input id="u-nikah" value={statusPernikahan} onChange={(e) => setStatusPernikahan(e.target.value)} placeholder="mis. KAWIN" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="u-agama">Agama</Label>
            <Input id="u-agama" value={agama} onChange={(e) => setAgama(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-tanggungan">Jumlah tanggungan</Label>
            <Input id="u-tanggungan" type="number" min={0} value={jumlahTanggungan} onChange={(e) => setJumlahTanggungan(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="u-pendidikan">Pendidikan</Label>
            <Input id="u-pendidikan" value={pendidikan} onChange={(e) => setPendidikan(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-jurusan">Jurusan</Label>
            <Input id="u-jurusan" value={jurusan} onChange={(e) => setJurusan(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="u-rumah">Telepon rumah</Label>
          <Input id="u-rumah" value={teleponRumah} onChange={(e) => setTeleponRumah(e.target.value)} />
        </div>
      </Section>

      {/* Pajak & Bank */}
      <Section title="Pajak & Bank">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="u-pajak">Status pajak</Label>
            <Input id="u-pajak" value={statusPajak} onChange={(e) => setStatusPajak(e.target.value)} placeholder="mis. K/0" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-npwp">No. NPWP</Label>
            <Input id="u-npwp" value={noNpwp} onChange={(e) => setNoNpwp(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="u-jamsostek">No. Jamsostek / BPJS</Label>
          <Input id="u-jamsostek" value={noJamsostek} onChange={(e) => setNoJamsostek(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="u-bca">Rekening BCA</Label>
            <Input id="u-bca" value={rekeningBca} onChange={(e) => setRekeningBca(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-bni">Rekening BNI</Label>
            <Input id="u-bni" value={rekeningBni} onChange={(e) => setRekeningBni(e.target.value)} />
          </div>
        </div>
      </Section>

      {/* Cuti */}
      <Section title="Cuti">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="u-jatahcuti">Jatah cuti</Label>
            <Input id="u-jatahcuti" type="number" step="0.5" min={0} value={jatahCuti} onChange={(e) => setJatahCuti(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-sisacuti">Sisa cuti</Label>
            <Input id="u-sisacuti" type="number" step="0.5" min={0} value={sisaCuti} onChange={(e) => setSisaCuti(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="u-tahuncuti">Tahun cuti</Label>
            <Input id="u-tahuncuti" type="number" value={tahunCuti} onChange={(e) => setTahunCuti(e.target.value)} />
          </div>
        </div>
      </Section>

      <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white/90 py-3 backdrop-blur">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          {mode === 'create' ? 'Tambah Karyawan' : 'Simpan Perubahan'}
        </Button>
      </div>
    </form>
  )
}
