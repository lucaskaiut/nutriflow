<?php

namespace App\Modules\Report\Services;

use App\Modules\Account\Support\UserClock;
use App\Modules\Diary\Services\MealService;
use App\Modules\Goal\Models\NutritionGoal;
use App\Modules\Goal\Services\GoalService;
use App\Modules\Nutrition\Support\Nutrients;
use App\Modules\Tracking\Models\WeightEntry;
use App\Modules\Tracking\Services\WaterService;
use App\Modules\Tracking\Services\WeightService;
use App\Modules\Tracking\Support\Period;
use App\Modules\User\Models\User;
use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;
use Carbon\CarbonImmutable;

/**
 * Relatórios básicos de um período. Médias nutricionais consideram apenas os dias com
 * alimentação registrada (um dia sem registro não é um dia de 0 kcal).
 */
final class ReportService
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
    public function build(User $user, Period $period): array
    {
        $today = $this->clock->today($user);
        $from = $period->startFrom($today) ?? $this->firstRecordDate($user) ?? $today;
        $days = (int) CarbonImmutable::parse($from)->diffInDays(CarbonImmutable::parse($today)) + 1;

        $daily = $this->meals->dailyTotals($user, $from, $today);
        $water = $this->water->dailyTotals($user, $from, $today);
        $goals = $this->goals->forRange($user, $from, $today);
        $weightDays = WeightEntry::query()->ownedBy($user)->whereBetween('measured_on', [$from, $today])
            ->distinct()->pluck('measured_on')->map(fn ($d) => CarbonImmutable::parse($d)->toDateString())->all();

        $foodDays = count($daily);
        $average = $foodDays > 0 ? Nutrients::sum($daily)->dividedBy($foodDays) : null;

        $withinKcal = 0;
        $withinProtein = 0;
        $series = [];
        foreach ($goals as $date => $goal) {
            $day = $daily[$date] ?? null;
            /** @var NutritionGoal|null $goal */
            if ($day && $goal) {
                $withinKcal += (float) (string) $day->kcal <= $goal->kcal ? 1 : 0;
                $withinProtein += BigDecimal::of((string) $day->protein_g)->isGreaterThanOrEqualTo((string) $goal->protein_g) ? 1 : 0;
            }
            $series[] = [
                'date' => $date,
                'kcal' => $day ? (float) (string) $day->kcal->toScale(0, RoundingMode::HalfUp) : null,
                'goal_kcal' => $goal?->kcal,
                'water_ml' => $water[$date] ?? null,
            ];
        }

        $waterDays = count($water);
        $avgWater = $waterDays > 0 ? (int) round(array_sum($water) / $waterDays) : null;
        $currentGoal = $this->goals->current($user, $today);
        $recordedDays = count(array_unique([...array_keys($daily), ...array_keys($water), ...$weightDays]));

        return [
            'period' => $period->value,
            'from' => $from,
            'to' => $today,
            'days' => $days,
            'weight' => [
                ...$this->weights->summary($user),
                'period' => $this->weights->periodChange($user, $period),
                'series' => $this->weights->history($user, $period)
                    ->map(fn (WeightEntry $e) => ['date' => $e->measured_on->toDateString(), 'weight_kg' => (float) $e->weight_kg])
                    ->values(),
            ],
            'nutrition' => [
                'days_with_food' => $foodDays,
                'average' => $average?->toApi(),
                'goal' => $currentGoal ? [
                    'kcal' => $currentGoal->kcal,
                    'protein_g' => (float) $currentGoal->protein_g,
                    'carbs_g' => (float) $currentGoal->carbs_g,
                    'fat_g' => (float) $currentGoal->fat_g,
                    'water_ml' => $currentGoal->water_ml,
                ] : null,
                'daily' => $series,
            ],
            'consistency' => [
                'days_in_period' => $days,
                'days_recorded' => $recordedDays,
                'days_with_food' => $foodDays,
                'days_within_kcal_goal' => $withinKcal,
                'days_protein_goal_met' => $withinProtein,
                'water_days' => $waterDays,
                'average_water_ml' => $avgWater,
                'water_goal_progress' => $avgWater !== null && $currentGoal?->water_ml ? (int) round($avgWater * 100 / $currentGoal->water_ml) : null,
            ],
        ];
    }

    private function firstRecordDate(User $user): ?string
    {
        $dates = array_filter([
            \App\Modules\Diary\Models\Meal::query()->ownedBy($user)->min('date'),
            \App\Modules\Tracking\Models\WaterEntry::query()->ownedBy($user)->min('date'),
            WeightEntry::query()->ownedBy($user)->min('measured_on'),
        ]);

        return $dates ? CarbonImmutable::parse(min($dates))->toDateString() : null;
    }
}
