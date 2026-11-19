<?php

namespace Tests\Feature\Tracking;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\NutriFlowAccounts;
use Tests\TestCase;

class WaterAndReportsTest extends TestCase
{
    use NutriFlowAccounts;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(\Carbon\CarbonImmutable::parse('2026-11-18 15:00', 'America/Sao_Paulo'));
        $this->actingAsPerson();
        $this->putJson('/api/goals', ['kcal' => 2000, 'protein_g' => 100, 'carbs_g' => 250, 'fat_g' => 60, 'water_ml' => 2500])->assertOk();
    }

    public function test_water_progress_edit_and_delete(): void
    {
        $this->postJson('/api/water', ['amount_ml' => 1000])->assertCreated();
        $second = $this->postJson('/api/water', ['amount_ml' => 800])->assertCreated()->json('data.id');

        $this->getJson('/api/water')->assertJsonPath('data.total_ml', 1800)->assertJsonPath('data.goal_ml', 2500)->assertJsonPath('data.progress', 72);

        $this->patchJson("/api/water/{$second}", ['amount_ml' => 500])->assertOk();
        $this->getJson('/api/water')->assertJsonPath('data.total_ml', 1500);

        $this->deleteJson("/api/water/{$second}")->assertOk();
        $this->getJson('/api/water')->assertJsonPath('data.total_ml', 1000)->assertJsonCount(1, 'data.entries');

        $this->postJson('/api/water', ['amount_ml' => 0])->assertUnprocessable();
        $this->getJson('/api/water/history?days=7')->assertJsonCount(7, 'data.days')->assertJsonPath('data.days.6.total_ml', 1000);
    }

    public function test_dashboard_reflects_real_records(): void
    {
        $food = $this->referenceFood('Arroz', '128', '2.5', '28', '0.2');
        $this->postJson('/api/meals', ['type' => 'lunch', 'time' => '12:30', 'items' => [['food_id' => $food->uuid, 'quantity' => 200]]]);
        $this->postJson('/api/water', ['amount_ml' => 500]);
        $this->postJson('/api/weights', ['weight_kg' => 80]);

        $d = $this->getJson('/api/dashboard')->assertOk()->json('data');

        $this->assertSame(256.0, (float) $d['nutrition']['consumed']['kcal']);
        $this->assertSame(2000, $d['nutrition']['goal']['kcal']);
        $this->assertSame(1744.0, (float) $d['nutrition']['remaining_kcal']);
        $this->assertSame('Almoço', $d['meals'][0]['title']);
        $this->assertSame('12:30', $d['meals'][0]['time']);
        $this->assertSame(20, $d['water']['progress']);
        $this->assertSame(80.0, (float) $d['weight']['current_kg']);
    }

    public function test_reports_average_only_days_with_food_and_count_consistency(): void
    {
        $food = $this->referenceFood('Arroz', '100', '10', '10', '1');
        $this->postJson('/api/meals', ['type' => 'lunch', 'date' => '2026-11-10', 'items' => [['food_id' => $food->uuid, 'quantity' => 1800]]]); // 1800 kcal
        $this->postJson('/api/meals', ['type' => 'lunch', 'date' => '2026-11-12', 'items' => [['food_id' => $food->uuid, 'quantity' => 2400]]]); // 2400 kcal
        $this->postJson('/api/water', ['amount_ml' => 2000, 'date' => '2026-11-15']);
        $this->postJson('/api/weights', ['weight_kg' => 90, 'measured_on' => '2026-11-12']);

        $r = $this->getJson('/api/reports?period=30d')->assertOk()->json('data');

        $this->assertSame(2100.0, (float) $r['nutrition']['average']['kcal']);
        $this->assertSame(210.0, (float) $r['nutrition']['average']['protein_g']);
        $this->assertSame(2, $r['consistency']['days_with_food']);
        $this->assertSame(3, $r['consistency']['days_recorded']);        // 10, 12, 15
        $this->assertSame(1, $r['consistency']['days_within_kcal_goal']);
        $this->assertSame(2, $r['consistency']['days_protein_goal_met']);
        $this->assertSame(30, $r['consistency']['days_in_period']);
        $this->assertCount(30, $r['nutrition']['daily']);
    }
}
