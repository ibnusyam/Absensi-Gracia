<?php

namespace App\Services;

use App\Exceptions\BusinessRuleException;
use App\Models\WorkLocation;

class GeofenceService
{
    private const EARTH_RADIUS_METERS = 6_371_000;

    /**
     * Great-circle distance (Haversine) between two coordinates, in meters.
     */
    public function distanceMeters(
        float $lat1,
        float $lng1,
        float $lat2,
        float $lng2
    ): float {
        $latFrom = deg2rad($lat1);
        $latTo = deg2rad($lat2);
        $latDelta = deg2rad($lat2 - $lat1);
        $lngDelta = deg2rad($lng2 - $lng1);

        $a = sin($latDelta / 2) ** 2
            + cos($latFrom) * cos($latTo) * sin($lngDelta / 2) ** 2;

        $c = 2 * asin(min(1.0, sqrt($a)));

        return self::EARTH_RADIUS_METERS * $c;
    }

    /**
     * Whether the given coordinate is inside the location's radius.
     */
    public function isWithinRadius(WorkLocation $location, float $lat, float $lng): bool
    {
        $distance = $this->distanceMeters(
            (float) $location->latitude,
            (float) $location->longitude,
            $lat,
            $lng,
        );

        return $distance <= $location->radius_meters;
    }

    /**
     * Assert the coordinate is within the location radius, or throw a 422.
     *
     * @return float The measured distance in meters (when valid).
     */
    public function assertWithinRadius(WorkLocation $location, float $lat, float $lng): float
    {
        $distance = $this->distanceMeters(
            (float) $location->latitude,
            (float) $location->longitude,
            $lat,
            $lng,
        );

        if ($distance > $location->radius_meters) {
            throw new BusinessRuleException(
                sprintf(
                    'Anda berada di luar radius lokasi kerja (%.0f m dari %.0f m yang diizinkan).',
                    $distance,
                    $location->radius_meters,
                ),
                422,
                ['location' => ['Lokasi Anda di luar radius yang diizinkan.']],
            );
        }

        return $distance;
    }
}
