<?php

namespace App\Modules\Report\Services;

use App\Modules\Account\Support\UserClock;
use App\Modules\Diary\Models\Meal;
use App\Modules\Diary\Services\MealService;
use App\Modules\Goal\Services\GoalService;
use App\Modules\Nutrition\Support\Nutrients;
use App\Modules\Tracking\Models\WeightEntry;
use App\Modules\Tracking\Services\WaterService;
use App\Modules\Tracking\Services\WeightService;
use App\Modules\Tracking\Support\Period;
use App\Modules\User\Models\User;

/** Tela inicial: tudo calculado a partir dos registros do dia LOCAL da pessoa. */
final class DashboardService
{
    public function __construct(
        private readonly UserClock $clock,
        private readonly MealService $meals,
        private readonly GoalService $goals,
        private readonly WaterService $water,
        private readonly WeightService $weights,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function build(User $user, ?string $date = null): array
    {
        $date ??= $this->clock->today($user);
        $meals = $this->meals->day($user, $date);
        $consumed = $this->meals->totals($meals);
        $goal = $this->goals->current($user, $date);
        $water = $this->water->day($user, $date);

        return [
            'date' => $date,
            'today' => $this->clock->today($user),
            'local_time' => $this->clock->currentTime($user),
            'timezone' => $this->clock->timezone($user),
            'weight' => [
                ...$this->weights->summary($user),
                'recent' => $this->weights->history($user, Period::MONTH)
                    ->map(fn (WeightEntry $e) => ['date' => $e->measured_on->toDateString(), 'weight_kg' => (float) $e->weight_kg])
                    ->values(),
            ],
            'nutrition' => [
                'consumed' => $consumed->toApi(),
                'goal' => $goal ? [
                    'kcal' => $goal->kcal,
                    'protein_g' => (float) $goal->protein_g,
                    'carbs_g' => (float) $goal->carbs_g,
                    'fat_g' => (float) $goal->fat_g,
                ] : null,
                'remaining_kcal' => $goal ? round($goal->kcal - (float) (string) $consumed->kcal, 1) : null,
            ],
            'meals' => $meals->map(fn (Meal $m) => [
                'id' => $m->uuid,
                'type' => $m->type->value,
                'title' => $m->title(),
                'time' => substr((string) $m->time, 0, 5),
                'items_count' => $m->items->count(),
                'totals' => $m->totals()->toApi(),
            ])->values(),
            'water' => [
                'total_ml' => $water['total_ml'],
                'goal_ml' => $water['goal_ml'],
                'progress' => $water['progress'],
            ],
        ];
    }
}
