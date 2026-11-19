<?php

namespace App\Modules\Tracking\Services;

use App\Modules\Account\Support\UserClock;
use App\Modules\Goal\Services\GoalService;
use App\Modules\Tracking\Models\WaterEntry;
use App\Modules\User\Models\User;
use Illuminate\Support\Collection;

final class WaterService
{
    public function __construct(
        private readonly UserClock $clock,
        private readonly GoalService $goals,
    ) {}

    /**
     * @return array{date: string, total_ml: int, goal_ml: ?int, progress: ?int, entries: Collection<int, WaterEntry>}
     */
    public function day(User $user, ?string $date = null): array
    {
        $date ??= $this->clock->today($user);
        $entries = WaterEntry::query()->ownedBy($user)->where('date', $date)->orderByDesc('time')->orderByDesc('id')->get();
        $total = (int) $entries->sum('amount_ml');
        $goal = $this->goals->current($user, $date)?->water_ml;

        return [
            'date' => $date,
            'total_ml' => $total,
            'goal_ml' => $goal,
            'progress' => $goal ? (int) round($total * 100 / $goal) : null,
            'entries' => $entries,
        ];
    }

    /**
     * Totais por dia (somente dias com registro).
     *
     * @return array<string, int>
     */
    public function dailyTotals(User $user, string $from, string $to): array
    {
        return WaterEntry::query()->ownedBy($user)
            ->whereBetween('date', [$from, $to])
            ->selectRaw('date, SUM(amount_ml) as total')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->mapWithKeys(fn ($row) => [\Carbon\CarbonImmutable::parse($row->date)->toDateString() => (int) $row->total])
            ->all();
    }

    /**
     * @param  array{amount_ml: int, date?: string, time?: string}  $data
     */
    public function add(User $user, array $data): WaterEntry
    {
        return WaterEntry::query()->create([
            'user_id' => $user->id,
            'amount_ml' => (int) $data['amount_ml'],
            'date' => $data['date'] ?? $this->clock->today($user),
            'time' => $data['time'] ?? $this->clock->currentTime($user),
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(WaterEntry $entry, array $data): WaterEntry
    {
        $entry->fill(array_intersect_key($data, array_flip(['amount_ml', 'date', 'time'])))->save();

        return $entry->refresh();
    }

    public function delete(WaterEntry $entry): void
    {
        $entry->delete();
    }
}
