<?php

namespace App\Modules\Goal\Services;

use App\Modules\Account\Support\UserClock;
use App\Modules\Goal\Enums\GoalMode;
use App\Modules\Goal\Models\NutritionGoal;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\DB;

final class GoalService
{
    public function __construct(private readonly UserClock $clock) {}

    /** Meta vigente em uma data local (padrão: hoje). */
    public function current(User $user, ?string $date = null): ?NutritionGoal
    {
        return NutritionGoal::query()
            ->where('user_id', $user->id)
            ->where('effective_from', '<=', $date ?? $this->clock->today($user))
            ->orderByDesc('effective_from')
            ->first();
    }

    /**
     * Metas vigentes para cada dia do intervalo (para relatórios).
     *
     * @return array<string, NutritionGoal|null> indexado por Y-m-d
     */
    public function forRange(User $user, string $from, string $to): array
    {
        $goals = NutritionGoal::query()
            ->where('user_id', $user->id)
            ->where('effective_from', '<=', $to)
            ->orderBy('effective_from')
            ->get();

        // Dias anteriores à primeira meta usam a primeira meta definida (a pessoa costuma
        // configurar metas depois de já ter registros; sem isso o histórico ficaria sem referência).
        $first = $goals->first();
        $result = [];
        for ($day = \Carbon\CarbonImmutable::parse($from); $day->toDateString() <= $to; $day = $day->addDay()) {
            $key = $day->toDateString();
            $result[$key] = $goals->filter(fn (NutritionGoal $g) => $g->effective_from->toDateString() <= $key)->last() ?? $first;
        }

        return $result;
    }

    /**
     * Define a meta a partir de hoje. Metas de dias anteriores permanecem no histórico.
     *
     * @param  array{kcal: int, protein_g: numeric, carbs_g: numeric, fat_g: numeric, water_ml: int}  $data
     */
    public function set(User $user, array $data, GoalMode $mode = GoalMode::MANUAL): NutritionGoal
    {
        $today = $this->clock->today($user);

        return DB::transaction(fn () => NutritionGoal::query()->updateOrCreate(
            ['user_id' => $user->id, 'effective_from' => $today],
            [
                'kcal' => (int) $data['kcal'],
                'protein_g' => (string) $data['protein_g'],
                'carbs_g' => (string) $data['carbs_g'],
                'fat_g' => (string) $data['fat_g'],
                'water_ml' => (int) $data['water_ml'],
                'mode' => $mode,
            ],
        ));
    }
}
