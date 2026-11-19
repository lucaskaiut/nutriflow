<?php

namespace App\Modules\Goal\Services;

use App\Modules\Account\Enums\ActivityLevel;
use App\Modules\Account\Enums\GoalType;
use App\Modules\Account\Enums\Sex;
use App\Modules\Goal\Support\EnergyEstimate;
use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;
use Carbon\CarbonImmutable;

/**
 * Estimativa de necessidade energética e de macronutrientes.
 *
 * TMB (Mifflin-St Jeor): 10·peso(kg) + 6,25·altura(cm) − 5·idade + (5 homens | −161 mulheres)
 * GET = TMB × fator de atividade.
 * Meta: emagrecimento = GET − 500 kcal; manutenção = GET; ganho de peso/massa = GET × 1,10.
 * Proteína em g/kg do PESO META (ou do peso atual, se não houver meta), conforme o objetivo;
 * gordura = 25% das kcal; carboidratos = restante.
 * Água: 35 ml/kg (referência usual). Todos os valores são arredondados e ajustáveis.
 */
final class EnergyEstimator
{
    /** Déficit fixo do emagrecimento, em kcal/dia. */
    private const WEIGHT_LOSS_DEFICIT = 500;

    /** Multiplicador do gasto total para os demais objetivos. */
    private const GOAL_ADJUSTMENT = [
        'maintain_weight' => '1.00',
        'gain_weight' => '1.10',
        'gain_muscle' => '1.10',
    ];

    private const PROTEIN_PER_KG = [
        'lose_weight' => '1.8',
        'maintain_weight' => '1.6',
        'gain_weight' => '1.6',
        'gain_muscle' => '2.0',
    ];

    public function estimate(
        ?Sex $sex,
        ?CarbonImmutable $birthDate,
        ?string $heightCm,
        ?string $weightKg,
        ?ActivityLevel $activity,
        ?GoalType $goal,
        ?CarbonImmutable $today = null,
        ?string $targetWeightKg = null,
    ): EnergyEstimate {
        $missing = array_keys(array_filter([
            'sex' => $sex === null,
            'birth_date' => $birthDate === null,
            'height_cm' => $heightCm === null,
            'current_weight_kg' => $weightKg === null,
            'activity_level' => $activity === null,
            'goal' => $goal === null,
        ]));

        if ($missing !== []) {
            return new EnergyEstimate(available: false, missing: $missing);
        }

        $age = $birthDate->diffInYears($today ?? CarbonImmutable::now(), absolute: true);
        $weight = BigDecimal::of($weightKg);
        $height = BigDecimal::of($heightCm);

        $bmr = $weight->multipliedBy(10)
            ->plus($height->multipliedBy('6.25'))
            ->minus(BigDecimal::of((int) floor($age))->multipliedBy(5))
            ->plus($sex === Sex::MALE ? 5 : -161);

        $tdee = $bmr->multipliedBy($activity->factor());
        $kcal = $goal === GoalType::LOSE_WEIGHT
            ? BigDecimal::max(BigDecimal::zero(), $tdee->minus(self::WEIGHT_LOSS_DEFICIT))
            : $tdee->multipliedBy(self::GOAL_ADJUSTMENT[$goal->value]);

        $proteinBasis = $targetWeightKg !== null ? BigDecimal::of($targetWeightKg) : $weight;
        $protein = $proteinBasis->multipliedBy(self::PROTEIN_PER_KG[$goal->value]);
        $fat = $kcal->multipliedBy('0.25')->dividedBy(9, 6, RoundingMode::HalfUp);
        $carbsKcal = $kcal->minus($protein->multipliedBy(4))->minus($fat->multipliedBy(9));
        $carbs = BigDecimal::max(BigDecimal::zero(), $carbsKcal->dividedBy(4, 6, RoundingMode::HalfUp));
        $water = $weight->multipliedBy(35);

        $round = static fn (BigDecimal $v, int $step = 1): int => (int) (string) $v->dividedBy($step, 0, RoundingMode::HalfUp)->multipliedBy($step);

        return new EnergyEstimate(
            available: true,
            bmrKcal: $round($bmr),
            tdeeKcal: $round($tdee),
            kcal: $round($kcal, 10),
            proteinG: $round($protein),
            carbsG: $round($carbs),
            fatG: $round($fat),
            waterMl: $round($water, 50),
        );
    }
}
