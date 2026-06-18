<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['Teknologi Informasi', 'Sumber Daya Manusia', 'Keuangan'] as $name) {
            Department::updateOrCreate(['name' => $name]);
        }
    }
}
