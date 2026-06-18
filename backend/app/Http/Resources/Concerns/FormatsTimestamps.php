<?php

namespace App\Http\Resources\Concerns;

use Illuminate\Support\Carbon;

/**
 * Helpers to present UTC-stored datetimes in the configured display timezone
 * (Asia/Jakarta). Datetimes are emitted as ISO-8601 with offset; dates as Y-m-d.
 */
trait FormatsTimestamps
{
    protected function displayTimezone(): string
    {
        return config('services.display_timezone', 'Asia/Jakarta');
    }

    protected function displayDateTime($value): ?string
    {
        if (! $value) {
            return null;
        }

        return Carbon::parse($value)
            ->setTimezone($this->displayTimezone())
            ->toIso8601String();
    }

    protected function displayDate($value): ?string
    {
        if (! $value) {
            return null;
        }

        return Carbon::parse($value)->toDateString();
    }
}
