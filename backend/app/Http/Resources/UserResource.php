<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\FormatsTimestamps;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class UserResource extends JsonResource
{
    use FormatsTimestamps;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'employee_id' => $this->employee_id,
            'phone' => $this->phone,
            'avatar_url' => $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null,
            'joined_at' => $this->displayDate($this->joined_at),
            'is_active' => (bool) $this->is_active,
            'department_id' => $this->department_id,
            'role_id' => $this->role_id,
            'department' => new DepartmentResource($this->whenLoaded('department')),
            'role' => new RoleResource($this->whenLoaded('role')),

            // Extended employee profile (mirrored from the old HRD master data)
            'no_ktp' => $this->no_ktp,
            'alamat' => $this->alamat,
            'telepon_rumah' => $this->telepon_rumah,
            'tempat_lahir' => $this->tempat_lahir,
            'tanggal_lahir' => $this->displayDate($this->tanggal_lahir),
            'jenis_kelamin' => $this->jenis_kelamin,
            'status_pernikahan' => $this->status_pernikahan,
            'jumlah_tanggungan' => $this->jumlah_tanggungan,
            'agama' => $this->agama,
            'pendidikan' => $this->pendidikan,
            'jurusan' => $this->jurusan,
            'status_pajak' => $this->status_pajak,
            'no_npwp' => $this->no_npwp,
            'no_jamsostek' => $this->no_jamsostek,
            'rekening_bca' => $this->rekening_bca,
            'rekening_bni' => $this->rekening_bni,
            'status_karir' => $this->status_karir,
            'tanggal_spk' => $this->displayDate($this->tanggal_spk),
            'kartu_pensiun' => $this->displayDate($this->kartu_pensiun),
            'kode_jabatan' => $this->kode_jabatan,
            'nama_jabatan' => $this->nama_jabatan,
            'keterangan_data' => $this->keterangan_data,
            'jatah_cuti' => $this->jatah_cuti,
            'tahun_cuti' => $this->tahun_cuti,
            'sisa_cuti' => $this->sisa_cuti,
        ];
    }
}
