<?php

namespace Tests\Feature\Tracking;

use App\Modules\User\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\NutriFlowAccounts;
use Tests\TestCase;

class WeightTest extends TestCase
{
    use NutriFlowAccounts;
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(\Carbon\CarbonImmutable::parse('2026-11-18 12:00:00', 'America/Sao_Paulo'));
        $this->user = $this->actingAsPerson();
        $this->user->profile->update(['initial_weight_kg' => '80.40', 'target_weight_kg' => '60.00']);
    }

    public function test_registers_a_weight_with_date_and_notes(): void
    {
        $this->postJson('/api/weights', ['weight_kg' => 78.7, 'measured_on' => '2026-11-18', 'measured_at' => '07:30', 'notes' => 'jejum'])
            ->assertCreated()
            ->assertJsonPath('data.weight_kg', 78.7)
            ->assertJsonPath('data.measured_on', '2026-11-18')
            ->assertJsonPath('data.measured_at', '07:30')
            ->assertJsonPath('data.notes', 'jejum');
    }

    public function test_rejects_invalid_weights(): void
    {
        foreach ([0, -5, 'abc', 12.345] as $value) {
            $this->postJson('/api/weights', ['weight_kg' => $value])->assertUnprocessable()->assertJsonValidationErrors('weight_kg');
        }
    }

    public function test_current_weight_is_the_most_recent_measurement_not_the_last_created(): void
    {
        $this->postJson('/api/weights', ['weight_kg' => 78.0, 'measured_on' => '2026-11-15']);
        // cadastrada depois, mas medida antes
        $this->postJson('/api/weights', ['weight_kg' => 79.5, 'measured_on' => '2026-11-01']);

        $data = $this->getJson('/api/weights?period=all')->assertOk()->json('data');

        $this->assertSame(78.0, (float) $data['summary']['current_kg']);
        $this->assertSame(['2026-11-01', '2026-11-15'], array_column($data['entries'], 'measured_on'));
    }

    public function test_multiple_entries_on_the_same_day_are_ordered_by_time(): void
    {
        $this->postJson('/api/weights', ['weight_kg' => 78.9, 'measured_on' => '2026-11-18', 'measured_at' => '21:00']);
        $this->postJson('/api/weights', ['weight_kg' => 78.2, 'measured_on' => '2026-11-18', 'measured_at' => '07:00']);

        $data = $this->getJson('/api/weights?period=7d')->json('data');

        $this->assertSame([78.2, 78.9], array_map('floatval', array_column($data['entries'], 'weight_kg')));
        $this->assertSame(78.9, (float) $data['summary']['current_kg']);
    }

    public function test_edit_and_delete_do_not_touch_other_entries(): void
    {
        $a = $this->postJson('/api/weights', ['weight_kg' => 79.0, 'measured_on' => '2026-11-10'])->json('data');
        $b = $this->postJson('/api/weights', ['weight_kg' => 78.0, 'measured_on' => '2026-11-17'])->json('data');

        $this->patchJson("/api/weights/{$a['id']}", ['weight_kg' => 79.4])->assertOk()->assertJsonPath('data.weight_kg', 79.4);
        $this->deleteJson("/api/weights/{$b['id']}")->assertOk();

        $data = $this->getJson('/api/weights?period=all')->json('data');
        $this->assertCount(1, $data['entries']);
        $this->assertSame(79.4, (float) $data['summary']['current_kg']);
    }

    public function test_evolution_summary_and_period_filters(): void
    {
        $this->postJson('/api/weights', ['weight_kg' => 81.0, 'measured_on' => '2026-06-01']);
        $this->postJson('/api/weights', ['weight_kg' => 79.5, 'measured_on' => '2026-11-01']);
        $this->postJson('/api/weights', ['weight_kg' => 78.7, 'measured_on' => '2026-11-18']);

        $month = $this->getJson('/api/weights?period=30d')->json('data');
        $this->assertCount(2, $month['entries']);
        $this->assertSame(-0.8, (float) $month['period_change']['change_kg']);

        $summary = $month['summary'];
        $this->assertSame(80.4, (float) $summary['initial_kg']);
        $this->assertSame(78.7, (float) $summary['current_kg']);
        $this->assertSame(-1.7, (float) $summary['change_kg']);
        $this->assertSame(18.7, (float) $summary['remaining_kg']);

        $this->assertCount(3, $this->getJson('/api/weights?period=all')->json('data.entries'));
        $this->assertCount(3, $this->getJson('/api/weights?period=6m')->json('data.entries'));
        $this->assertCount(1, $this->getJson('/api/weights?period=7d')->json('data.entries'));
    }

    public function test_profile_current_weight_creates_a_new_entry_instead_of_overwriting(): void
    {
        $this->postJson('/api/weights', ['weight_kg' => 79.0, 'measured_on' => '2026-11-10']);
        $this->patchJson('/api/me', ['current_weight_kg' => 78.4])->assertOk();

        $entries = $this->getJson('/api/weights?period=all')->json('data.entries');
        $this->assertSame([79.0, 78.4], array_map('floatval', array_column($entries, 'weight_kg')));
    }
}
