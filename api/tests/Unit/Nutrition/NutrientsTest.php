<?php

namespace Tests\Unit\Nutrition;

use App\Modules\Account\Enums\ActivityLevel;
use App\Modules\Account\Enums\GoalType;
use App\Modules\Account\Enums\Sex;
use App\Modules\Goal\Services\EnergyEstimator;
use App\Modules\Nutrition\Support\Nutrients;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\TestCase;

class NutrientsTest extends TestCase
{
    public function test_decimal_arithmetic_has_no_binary_float_drift(): void
    {
        // 0,1 + 0,2 em float = 0,30000000000000004
        $a = Nutrients::fromArray(['kcal' => '0.1', 'protein_g' => '0.1', 'carbs_g' => '0', 'fat_g' => '0', 'fiber_g' => '0']);
        $b = Nutrients::fromArray(['kcal' => '0.2', 'protein_g' => '0.2', 'carbs_g' => '0', 'fat_g' => '0', 'fiber_g' => '0']);

        $this->assertSame('0.300', $a->plus($b)->toStorage()['kcal']);
    }

    public function test_scale_divide_and_unknown_values(): void
    {
        $per100g = Nutrients::fromArray(['kcal' => '143', 'protein_g' => '13', 'carbs_g' => '1.6', 'fat_g' => '9.5', 'fiber_g' => null]);

        $portion = $per100g->scale('50', '100');
        $this->assertSame(['kcal' => 71.5, 'protein_g' => 6.5, 'carbs_g' => 0.8, 'fat_g' => 4.8, 'fiber_g' => null], $portion->toApi());

        // nutriente desconhecido continua desconhecido no item, mas soma como zero no total
        $this->assertSame(0.0, Nutrients::sum([$portion])->toApi()['fiber_g']);
        $this->assertSame('28.600', $per100g->dividedBy('5')->toStorage()['kcal']);
    }

    public function test_scale_rejects_zero_denominator(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        Nutrients::zero()->scale(1, 0);
    }

    public function test_energy_estimate_requires_profile_data_and_is_labelled_as_estimate(): void
    {
        $estimator = new EnergyEstimator;

        $missing = $estimator->estimate(null, null, '170', '70', null, GoalType::MAINTAIN_WEIGHT);
        $this->assertFalse($missing->available);
        $this->assertSame(['sex', 'birth_date', 'activity_level'], $missing->missing);

        // Mulher, 30 anos, 165 cm, 60 kg: TMB = 600 + 1031,25 − 150 − 161 = 1320,25
        $e = $estimator->estimate(Sex::FEMALE, CarbonImmutable::parse('1996-01-01'), '165', '60', ActivityLevel::MODERATE, GoalType::MAINTAIN_WEIGHT, CarbonImmutable::parse('2026-06-01'));
        $this->assertSame(1320, $e->bmrKcal);
        $this->assertSame(2046, $e->tdeeKcal);      // 1320,25 × 1,55 = 2046,39
        $this->assertSame(2050, $e->kcal);          // arredondado a 10
        $this->assertSame(96, $e->proteinG);        // 1,6 g/kg
        $this->assertSame(2100, $e->waterMl);       // 35 ml/kg
        $this->assertStringContainsString('Estimativa', $e->toArray()['disclaimer']);
    }

    public function test_weight_loss_uses_fixed_500_kcal_deficit_and_protein_from_target_weight(): void
    {
        $estimator = new EnergyEstimator;

        // Mesmo perfil acima (GET 2046,39), objetivo emagrecer, peso meta 55 kg
        $e = $estimator->estimate(Sex::FEMALE, CarbonImmutable::parse('1996-01-01'), '165', '60', ActivityLevel::MODERATE, GoalType::LOSE_WEIGHT, CarbonImmutable::parse('2026-06-01'), targetWeightKg: '55');
        $this->assertSame(2046, $e->tdeeKcal);
        $this->assertSame(1550, $e->kcal);          // 2046,39 − 500 = 1546,39 → 1550
        $this->assertSame(99, $e->proteinG);        // 55 kg × 1,8 g/kg
        $this->assertSame(2100, $e->waterMl);       // água continua pelo peso atual (60 × 35)

        // sem peso meta, a proteína usa o peso atual
        $noTarget = $estimator->estimate(Sex::FEMALE, CarbonImmutable::parse('1996-01-01'), '165', '60', ActivityLevel::MODERATE, GoalType::LOSE_WEIGHT, CarbonImmutable::parse('2026-06-01'));
        $this->assertSame(108, $noTarget->proteinG); // 60 × 1,8
    }
}
