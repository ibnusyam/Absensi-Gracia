<?php

namespace App\Services;

use App\Enums\LeaveStatus;
use App\Enums\LeaveType;
use App\Exceptions\BusinessRuleException;
use App\Models\HolidayCalendar;
use App\Models\LeaveQuota;
use App\Models\LeaveRequest;
use App\Models\User;
use Carbon\CarbonPeriod;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class LeaveService
{
    public function __construct(
        private readonly AuditService $audit,
    ) {
    }

    /**
     * Number of working days between two dates, excluding weekends and
     * holidays recorded in holiday_calendars.
     */
    public function workingDaysBetween(Carbon $start, Carbon $end): int
    {
        $holidays = HolidayCalendar::whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->flip();

        $count = 0;
        foreach (CarbonPeriod::create($start->copy()->startOfDay(), $end->copy()->startOfDay()) as $day) {
            if ($day->isWeekend()) {
                continue;
            }
            if ($holidays->has($day->toDateString())) {
                continue;
            }
            $count++;
        }

        return $count;
    }

    /**
     * Create a pending leave request, validating quota for quota-consuming types.
     */
    public function create(User $user, array $data, ?UploadedFile $attachment = null): LeaveRequest
    {
        $type = $data['type'] instanceof LeaveType ? $data['type'] : LeaveType::from($data['type']);
        $start = Carbon::parse($data['start_date']);
        $end = Carbon::parse($data['end_date']);

        if ($end->lt($start)) {
            throw new BusinessRuleException('Tanggal selesai tidak boleh sebelum tanggal mulai.', 422);
        }

        $totalDays = $this->workingDaysBetween($start, $end);

        if ($totalDays < 1) {
            throw new BusinessRuleException('Rentang cuti tidak mengandung hari kerja.', 422);
        }

        if ($type->consumesQuota()) {
            $quota = $this->quotaFor($user, (int) $start->year);
            if ($quota->remaining_days < $totalDays) {
                throw new BusinessRuleException(
                    "Sisa kuota cuti tidak mencukupi (sisa {$quota->remaining_days} hari, butuh {$totalDays} hari).",
                    422,
                );
            }
        }

        $attachmentPath = null;
        if ($attachment) {
            $attachmentPath = $attachment->store("leave-attachments/{$user->id}", 'public');
        }

        return DB::transaction(function () use ($user, $type, $start, $end, $totalDays, $data, $attachmentPath) {
            $leave = LeaveRequest::create([
                'user_id' => $user->id,
                'type' => $type,
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
                'total_days' => $totalDays,
                'reason' => $data['reason'],
                'attachment_path' => $attachmentPath,
                'status' => LeaveStatus::Pending,
            ]);

            $this->audit->created($leave);

            return $leave;
        });
    }

    /**
     * Apply quota usage when an annual leave is approved.
     */
    public function applyApprovedQuota(LeaveRequest $leave): void
    {
        if (! $leave->type->consumesQuota()) {
            return;
        }

        $quota = $this->quotaFor($leave->user, (int) Carbon::parse($leave->start_date)->year);
        $quota->used_days += $leave->total_days;
        $quota->syncRemaining();
        $quota->save();
    }

    /**
     * Cancel a leave request while it is still pending.
     */
    public function cancel(LeaveRequest $leave): LeaveRequest
    {
        if ($leave->status !== LeaveStatus::Pending) {
            throw new BusinessRuleException('Hanya pengajuan berstatus pending yang dapat dibatalkan.', 422);
        }

        $old = $leave->getAttributes();
        $leave->status = LeaveStatus::Cancelled;
        $leave->save();

        $this->audit->updated($leave, $old);

        return $leave;
    }

    public function quotaFor(User $user, int $year): LeaveQuota
    {
        return LeaveQuota::firstOrCreate(
            ['user_id' => $user->id, 'year' => $year],
            ['total_days' => 0, 'used_days' => 0, 'remaining_days' => 0],
        );
    }
}
