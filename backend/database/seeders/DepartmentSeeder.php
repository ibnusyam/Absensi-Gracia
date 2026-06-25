<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            'Teknologi Informasi',
            'Sumber Daya Manusia',
            'Keuangan',
            'Produksi',
            'Quality Control',
            'Marketing',
            'Gudang',
        ];

        foreach ($departments as $name) {
            Department::updateOrCreate(['name' => $name]);
        }
    }
}
