<?php

namespace Database\Seeders;

use App\Models\WorkLocation;
use Illuminate\Database\Seeder;

class WorkLocationSeeder extends Seeder
{
    public function run(): void
    {
        // Default office at Monas, Jakarta (placeholder coordinates).
        WorkLocation::updateOrCreate(
            ['name' => 'Kantor Pusat SKY'],
    [
        'latitude' => -6.95972222,
        'longitude' => 107.79825000,
        'radius_meters' => 1500000,
        'wifi_ssid' => 'SKY-OFFICE',
        'is_active' => true,
    ],
        );
    }
}
