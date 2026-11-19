<?php

namespace Tests\Feature\Diary;

use App\Modules\Food\Models\Food;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\NutriFlowAccounts;
use Tests\TestCase;

class DiaryTest extends TestCase
{
    use NutriFlowAccounts;
    use RefreshDatabase;

    private Food $rice;

    private Food $egg;

    protected function setUp(): void
    {
        parent::setUp();
        $this->actingAsPerson();
        $this->rice = $this->referenceFood('Arroz cozido', '128', '2.5', '28.1', '0.2', '1.6');
        $this->egg = $this->referenceFood('Ovo', '143', '13', '1.6', '9.5', null);
    }

    private function meal(string $date, string $type, array $items): array
    {
        return $this->postJson('/api/meals', ['date' => $date, 'type' => $type, 'items' => $items])->assertCreated()->json('data');
    }

    public function test_sums_calories_and_macros_per_meal_and_per_day(): void
    {
        $this->meal('2026-11-18', 'breakfast', [['food_id' => $this->egg->uuid, 'quantity' => 100, 'unit' => 'g']]);
        $this->meal('2026-11-18', 'lunch', [
            ['food_id' => $this->rice->uuid, 'quantity' => 150, 'unit' => 'g'],   // 192 kcal
            ['food_id' => $this->egg->uuid, 'quantity' => 50, 'unit' => 'g'],     // 71,5 kcal
        ]);

        $day = $this->getJson('/api/diary?date=2026-11-18')->assertOk()->json('data');

        $this->assertCount(2, $day['meals']);
        $this->assertSame(263.5, (float) $day['meals'][1]['totals']['kcal']);
        $this->assertSame(406.5, (float) $day['totals']['kcal']);          // 143 + 192 + 71,5
        $this->assertSame(23.3, (float) $day['totals']['protein_g']);      // 13 + 3,75 + 6,5 = 23,25
        $this->assertSame(44.6, (float) $day['totals']['carbs_g']);        // 1,6 + 42,15 + 0,8 = 44,55 → 44,6 (arredonda só na saída)
    }

    public function test_editing_quantity_recalculates_item_and_day(): void
    {
        $meal = $this->meal('2026-11-18', 'lunch', [['food_id' => $this->rice->uuid, 'quantity' => 100, 'unit' => 'g']]);

        $this->patchJson("/api/meal-items/{$meal['items'][0]['id']}", ['quantity' => 250])
            ->assertOk()
            ->assertJsonPath('data.nutrients.kcal', 320)
            ->assertJsonPath('data.base_quantity', 250);

        $this->getJson('/api/diary?date=2026-11-18')->assertJsonPath('data.totals.kcal', 320);
    }

    public function test_deleting_an_item_updates_totals(): void
    {
        $meal = $this->meal('2026-11-18', 'lunch', [
            ['food_id' => $this->rice->uuid, 'quantity' => 100, 'unit' => 'g'],
            ['food_id' => $this->egg->uuid, 'quantity' => 100, 'unit' => 'g'],
        ]);

        $this->deleteJson("/api/meal-items/{$meal['items'][1]['id']}")->assertOk();

        $this->getJson("/api/meals/{$meal['id']}")
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.totals.kcal', 128);
    }

    public function test_records_are_separated_by_local_date(): void
    {
        $this->meal('2026-11-17', 'dinner', [['food_id' => $this->rice->uuid, 'quantity' => 100, 'unit' => 'g']]);
        $this->meal('2026-11-18', 'breakfast', [['food_id' => $this->egg->uuid, 'quantity' => 100, 'unit' => 'g']]);
        $this->meal('2026-11-20', 'lunch', [['food_id' => $this->egg->uuid, 'quantity' => 200, 'unit' => 'g']]); // planejado

        $this->getJson('/api/diary?date=2026-11-17')->assertJsonPath('data.totals.kcal', 128)->assertJsonCount(1, 'data.meals');
        $this->getJson('/api/diary?date=2026-11-18')->assertJsonPath('data.totals.kcal', 143);
        $this->getJson('/api/diary?date=2026-11-20')->assertJsonPath('data.totals.kcal', 286);
        $this->getJson('/api/diary?date=2026-11-19')->assertJsonCount(0, 'data.meals')->assertJsonPath('data.totals.kcal', 0);
    }

    public function test_default_day_follows_the_users_timezone(): void
    {
        // 02:30 UTC de 19/11 = 23:30 de 18/11 em São Paulo
        $this->travelTo(\Carbon\CarbonImmutable::parse('2026-11-19 02:30:00', 'UTC'));

        $meal = $this->postJson('/api/meals', ['type' => 'supper'])->assertCreated()->json('data');

        $this->assertSame('2026-11-18', $meal['date']);
        $this->getJson('/api/diary')->assertJsonPath('data.date', '2026-11-18');
        $this->getJson('/api/dashboard')->assertJsonPath('data.today', '2026-11-18');
    }

    public function test_edit_and_delete_meal(): void
    {
        $meal = $this->meal('2026-11-18', 'lunch', [['food_id' => $this->rice->uuid, 'quantity' => 100, 'unit' => 'g']]);

        $this->patchJson("/api/meals/{$meal['id']}", ['type' => 'custom', 'custom_name' => 'Pré-treino', 'time' => '17:15', 'notes' => 'antes da academia'])
            ->assertOk()
            ->assertJsonPath('data.title', 'Pré-treino')
            ->assertJsonPath('data.time', '17:15');

        $this->deleteJson("/api/meals/{$meal['id']}")->assertOk();
        $this->getJson("/api/meals/{$meal['id']}")->assertNotFound();
    }

    public function test_duplicate_meal_to_another_day_copies_snapshots(): void
    {
        $meal = $this->meal('2026-11-18', 'breakfast', [['food_id' => $this->egg->uuid, 'quantity' => 100, 'unit' => 'g']]);
        $this->egg->update(['kcal' => '500']);

        $copy = $this->postJson("/api/meals/{$meal['id']}/duplicate", ['date' => '2026-11-19'])->assertCreated()->json('data');

        $this->assertSame('2026-11-19', $copy['date']);
        $this->assertSame(143.0, (float) $copy['totals']['kcal']);
        $this->assertNotSame($meal['items'][0]['id'], $copy['items'][0]['id']);
    }

    public function test_custom_meal_type_requires_a_name(): void
    {
        $this->postJson('/api/meals', ['type' => 'custom'])->assertUnprocessable()->assertJsonValidationErrors('custom_name');
    }

    public function test_saved_meal_is_added_with_its_items_and_history_is_preserved(): void
    {
        $saved = $this->postJson('/api/saved-meals', [
            'name' => 'Meu café da manhã',
            'meal_type' => 'breakfast',
            'items' => [
                ['food_id' => $this->egg->uuid, 'quantity' => 100, 'unit' => 'g'],
                ['food_id' => $this->rice->uuid, 'quantity' => 50, 'unit' => 'g'],
            ],
        ])->assertCreated()->json('data');
        $this->assertSame(207.0, (float) $saved['nutrition']['kcal']);

        $meal = $this->postJson("/api/saved-meals/{$saved['id']}/add-to-diary", ['date' => '2026-11-18'])->assertCreated()->json('data');
        $this->assertSame('breakfast', $meal['type']);
        $this->assertCount(2, $meal['items']);
        $this->assertSame(207.0, (float) $meal['totals']['kcal']);

        // editar a refeição salva não altera o diário
        $this->patchJson("/api/saved-meals/{$saved['id']}", ['items' => [['food_id' => $this->egg->uuid, 'quantity' => 300, 'unit' => 'g']]])->assertOk();
        $this->getJson("/api/meals/{$meal['id']}")->assertJsonPath('data.totals.kcal', 207);
    }
}
