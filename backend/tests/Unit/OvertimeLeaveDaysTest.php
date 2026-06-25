<?php

namespace Tests\Unit;

use App\Services\AuditService;
use App\Services\LeaveService;
use App\Services\OvertimeService;
use PHPUnit\Framework\TestCase;

class OvertimeLeaveDaysTest extends TestCase
{
    private function service(): OvertimeService
    {
        // computeLeaveDays is pure; the dependencies are not exercised here.
        return new OvertimeService(
            $this->createMock(AuditService::class),
            $this->createMock(LeaveService::class),
        );
    }

    /** @dataProvider holidayCases */
    public function test_holiday_overtime_grants_one_day_per_four_hours(float $hours, float $expected): void
    {
        $this->assertSame($expected, $this->service()->computeLeaveDays($hours, true));
    }

    public static function holidayCases(): array
    {
        return [
            'under a block' => [3.0, 0.0],
            'exactly 4h' => [4.0, 1.0],
            'partial block rounds down' => [6.0, 1.0],
            '7h still one block' => [7.0, 1.0],
            'exactly 8h' => [8.0, 2.0],
            '10h two blocks' => [10.0, 2.0],
        ];
    }

    /** @dataProvider workdayCases */
    public function test_workday_overtime_grants_half_day_per_four_hours(float $hours, float $expected): void
    {
        $this->assertSame($expected, $this->service()->computeLeaveDays($hours, false));
    }

    public static function workdayCases(): array
    {
        return [
            'under a block' => [3.0, 0.0],
            'exactly 4h' => [4.0, 0.5],
            'partial block rounds down' => [6.0, 0.5],
            'exactly 8h' => [8.0, 1.0],
            '12h three blocks' => [12.0, 1.5],
        ];
    }
}
