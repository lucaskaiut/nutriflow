<?php

namespace Tests\Feature\Nutrition;

use App\Modules\Food\Models\Food;
use App\Modules\User\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\NutriFlowAccounts;
use Tests\TestCase;

/**
 * Exemplo do escopo: "Frango cremoso" — 1.000 g frango, 300 g milho, 200 g creme de leite, 20 ml azeite;
 * 5 porções; receita inteira 2.100 kcal; porção 420 kcal; 1,5 porção = 630 kcal.
 */
class RecipeNutritionTest extends TestCase
{
    use NutriFlowAccounts;
    use RefreshDatabase;

    private User $user;

    /** @var array<string, Food> */
    private array $foods;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = $this->actingAsPerson();
        $this->foods = [
            'frango' => $this->referenceFood('Frango', '120', '23', '0', '3', '0'),      // ×10   = 1200 kcal
            'milho' => $this->referenceFood('Milho', '100', '3', '20', '1', '2'),        // ×3    =  300 kcal
            'creme' => $this->referenceFood('Creme de leite', '200', '2', '4', '20', null), // ×2 =  400 kcal
            'azeite' => $this->referenceFood('Azeite', '1000', '0', '0', '100', null, 'ml'), // ×0,2 = 200 kcal
        ];
    }

    private function createRecipe(array $overrides = []): array
    {
        return $this->postJson('/api/recipes', [
            'name' => 'Frango cremoso',
            'servings' => 5,
            'ingredients' => [
                ['food_id' => $this->foods['frango']->uuid, 'quantity' => 1, 'unit' => 'kg'],
                ['food_id' => $this->foods['milho']->uuid, 'quantity' => 300, 'unit' => 'g'],
                ['food_id' => $this->foods['creme']->uuid, 'quantity' => 200, 'unit' => 'g'],
                ['food_id' => $this->foods['azeite']->uuid, 'quantity' => 20, 'unit' => 'ml'],
            ],
            ...$overrides,
        ])->assertCreated()->json('data');
    }

    public function test_sums_ingredient_nutrients_into_the_recipe_total(): void
    {
        $recipe = $this->createRecipe();

        $this->assertSame(2100.0, (float) $recipe['nutrition']['total']['kcal']);
        // proteína: 230 + 9 + 4 + 0 = 243
        $this->assertSame(243.0, (float) $recipe['nutrition']['total']['protein_g']);
        // gordura: 30 + 3 + 40 + 20 = 93
        $this->assertSame(93.0, (float) $recipe['nutrition']['total']['fat_g']);
        // fibra desconhecida (NULL) no creme/azeite não é inventada: soma só o que se sabe (0 + 6)
        $this->assertSame(6.0, (float) $recipe['nutrition']['total']['fiber_g']);
        // 1 kg convertido para 1000 g na unidade de referência
        $this->assertSame(1000.0, (float) $recipe['ingredients'][0]['base_quantity']);
    }

    public function test_per_serving_is_total_divided_by_servings(): void
    {
        $recipe = $this->createRecipe();

        $this->assertSame(420.0, (float) $recipe['nutrition']['per_serving']['kcal']);
        $this->assertSame(48.6, (float) $recipe['nutrition']['per_serving']['protein_g']);
    }

    public function test_consuming_half_a_serving(): void
    {
        $recipe = $this->createRecipe();

        $meal = $this->postJson('/api/meals', [
            'type' => 'lunch',
            'items' => [['kind' => 'recipe', 'recipe_id' => $recipe['id'], 'quantity' => 0.5]],
        ])->assertCreated()->json('data');

        $this->assertSame(210.0, (float) $meal['items'][0]['nutrients']['kcal']);
        $this->assertSame(24.3, (float) $meal['items'][0]['nutrients']['protein_g']);
    }

    public function test_consuming_multiple_servings_scales_kcal_and_macros(): void
    {
        $recipe = $this->createRecipe();

        $meal = $this->postJson('/api/meals', [
            'type' => 'dinner',
            'items' => [['kind' => 'recipe', 'recipe_id' => $recipe['id'], 'quantity' => 1.5]],
        ])->assertCreated()->json('data');

        $item = $meal['items'][0];
        $this->assertSame(630.0, (float) $item['nutrients']['kcal']);
        $this->assertSame(72.9, (float) $item['nutrients']['protein_g']);   // 48,6 × 1,5
        $this->assertSame(27.9, (float) $item['nutrients']['fat_g']);       // 18,6 × 1,5
        $this->assertSame('serving', $item['unit']);
        $this->assertSame(1.5, (float) $item['quantity']);
    }

    public function test_changing_the_yield_recalculates_per_serving(): void
    {
        $recipe = $this->createRecipe();

        $updated = $this->patchJson("/api/recipes/{$recipe['id']}", ['servings' => 4])->assertOk()->json('data');

        $this->assertSame(2100.0, (float) $updated['nutrition']['total']['kcal']);
        $this->assertSame(525.0, (float) $updated['nutrition']['per_serving']['kcal']);
    }

    public function test_diary_keeps_a_snapshot_when_the_recipe_changes_later(): void
    {
        $recipe = $this->createRecipe();
        $meal = $this->postJson('/api/meals', [
            'type' => 'lunch',
            'items' => [['kind' => 'recipe', 'recipe_id' => $recipe['id'], 'quantity' => 1]],
        ])->json('data');

        // muda rendimento E ingredientes
        $this->patchJson("/api/recipes/{$recipe['id']}", [
            'servings' => 2,
            'ingredients' => [['food_id' => $this->foods['frango']->uuid, 'quantity' => 2000, 'unit' => 'g']],
        ])->assertOk();
        // e o alimento de origem também
        $this->foods['frango']->update(['kcal' => '999']);

        $after = $this->getJson("/api/meals/{$meal['id']}")->assertOk()->json('data');
        $this->assertSame(420.0, (float) $after['items'][0]['nutrients']['kcal']);
        $this->assertSame('Frango cremoso', $after['items'][0]['name']);

        // reescalar a quantidade usa o snapshot, não a receita nova
        $item = $this->patchJson("/api/meal-items/{$after['items'][0]['id']}", ['quantity' => 2])->assertOk()->json('data');
        $this->assertSame(840.0, (float) $item['nutrients']['kcal']);
    }

    public function test_deleting_a_recipe_keeps_diary_history(): void
    {
        $recipe = $this->createRecipe();
        $meal = $this->postJson('/api/meals', [
            'type' => 'lunch',
            'items' => [['kind' => 'recipe', 'recipe_id' => $recipe['id'], 'quantity' => 1]],
        ])->json('data');

        $this->deleteJson("/api/recipes/{$recipe['id']}")->assertOk();

        $this->getJson("/api/recipes/{$recipe['id']}")->assertNotFound();
        $this->getJson("/api/meals/{$meal['id']}")->assertOk()->assertJsonPath('data.totals.kcal', 420);
    }

    public function test_household_portion_converts_to_reference_quantity(): void
    {
        $portion = $this->postJson("/api/foods/{$this->foods['milho']->uuid}/portions", ['label' => 'xícara', 'amount' => 150])
            ->assertCreated()->json('data');

        $meal = $this->postJson('/api/meals', [
            'type' => 'breakfast',
            'items' => [['food_id' => $this->foods['milho']->uuid, 'quantity' => 2, 'unit' => 'portion', 'portion_id' => $portion['id']]],
        ])->assertCreated()->json('data');

        $this->assertSame(300.0, (float) $meal['items'][0]['base_quantity']);
        $this->assertSame(300.0, (float) $meal['items'][0]['nutrients']['kcal']);
        $this->assertSame('xícara', $meal['items'][0]['portion_label']);
    }

    public function test_rejects_units_incompatible_with_the_food(): void
    {
        $this->postJson('/api/meals', [
            'type' => 'lunch',
            'items' => [['food_id' => $this->foods['azeite']->uuid, 'quantity' => 10, 'unit' => 'g']],
        ])->assertUnprocessable()->assertJsonValidationErrors('items.0.unit');
    }

    public function test_recipe_requires_ingredients_and_positive_servings(): void
    {
        $this->postJson('/api/recipes', ['name' => 'Vazia', 'servings' => 0, 'ingredients' => []])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['servings', 'ingredients']);
    }

    public function test_duplicate_archive_and_favorite(): void
    {
        $recipe = $this->createRecipe();

        $copy = $this->postJson("/api/recipes/{$recipe['id']}/duplicate")->assertCreated()->json('data');
        $this->assertSame('Frango cremoso (cópia)', $copy['name']);
        $this->assertSame(420.0, (float) $copy['nutrition']['per_serving']['kcal']);

        $this->putJson("/api/recipes/{$recipe['id']}/favorite", ['favorite' => true])->assertJsonPath('data.is_favorite', true);
        $this->putJson("/api/recipes/{$copy['id']}/archive", ['archived' => true])->assertJsonPath('data.is_archived', true);

        $this->getJson('/api/recipes')->assertJsonCount(1, 'data');
        $this->getJson('/api/recipes?filter=archived')->assertJsonCount(1, 'data');
        $this->getJson('/api/recipes?filter=favorites')->assertJsonPath('data.0.id', $recipe['id']);
    }

    public function test_usage_history_lists_diary_entries(): void
    {
        $recipe = $this->createRecipe();
        foreach (['2026-11-01', '2026-11-03'] as $date) {
            $this->postJson('/api/meals', ['type' => 'lunch', 'date' => $date, 'items' => [['kind' => 'recipe', 'recipe_id' => $recipe['id'], 'quantity' => 1]]]);
        }

        $this->getJson("/api/recipes/{$recipe['id']}/usage")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.date', '2026-11-03');
    }
}
