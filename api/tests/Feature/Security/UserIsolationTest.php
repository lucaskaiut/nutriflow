<?php

namespace Tests\Feature\Security;

use App\Modules\User\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\NutriFlowAccounts;
use Tests\TestCase;

/** Cada pessoa acessa exclusivamente os próprios registros. */
class UserIsolationTest extends TestCase
{
    use NutriFlowAccounts;
    use RefreshDatabase;

    private User $alice;

    private User $bob;

    /** @var array<string, string> */
    private array $aliceIds = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->alice = $this->person('Alice');
        $this->bob = $this->person('Bob');

        Sanctum::actingAs($this->alice);
        $base = $this->referenceFood('Arroz', '128', '2.5', '28', '0.2');
        $custom = $this->customFood($this->alice, 'Pão caseiro da Alice');
        $portion = $this->postJson("/api/foods/{$custom->uuid}/portions", ['label' => 'fatia', 'amount' => 30])->json('data.id');
        $recipe = $this->postJson('/api/recipes', ['name' => 'Receita da Alice', 'servings' => 2, 'ingredients' => [['food_id' => $custom->uuid, 'quantity' => 200, 'unit' => 'g']]])->json('data.id');
        $meal = $this->postJson('/api/meals', ['type' => 'lunch', 'items' => [['food_id' => $base->uuid, 'quantity' => 100, 'unit' => 'g']]])->json('data');
        $saved = $this->postJson('/api/saved-meals', ['name' => 'Salva da Alice', 'items' => [['food_id' => $base->uuid, 'quantity' => 100]]])->json('data.id');
        $weight = $this->postJson('/api/weights', ['weight_kg' => 70])->json('data.id');
        $water = $this->postJson('/api/water', ['amount_ml' => 300])->json('data.id');
        $measure = $this->postJson('/api/measurements', ['values' => ['waist' => 80]])->json('data.0.id');

        $this->aliceIds = [
            'food' => $custom->uuid, 'portion' => $portion, 'recipe' => $recipe, 'meal' => $meal['id'],
            'item' => $meal['items'][0]['id'], 'saved' => $saved, 'weight' => $weight, 'water' => $water, 'measure' => $measure,
            'base_food' => $base->uuid,
        ];
    }

    public function test_another_user_cannot_read_change_or_delete_records(): void
    {
        Sanctum::actingAs($this->bob);
        $id = $this->aliceIds;

        $requests = [
            ['get', "/api/foods/{$id['food']}"], ['patch', "/api/foods/{$id['food']}", ['name' => 'x']], ['delete', "/api/foods/{$id['food']}"],
            ['post', "/api/foods/{$id['food']}/favorite"], ['delete', "/api/food-portions/{$id['portion']}"],
            ['get', "/api/recipes/{$id['recipe']}"], ['patch', "/api/recipes/{$id['recipe']}", ['name' => 'x']], ['delete', "/api/recipes/{$id['recipe']}"],
            ['post', "/api/recipes/{$id['recipe']}/duplicate"], ['get', "/api/recipes/{$id['recipe']}/usage"], ['get', "/api/recipes/{$id['recipe']}/photo"],
            ['get', "/api/meals/{$id['meal']}"], ['patch', "/api/meals/{$id['meal']}", ['notes' => 'x']], ['delete', "/api/meals/{$id['meal']}"],
            ['post', "/api/meals/{$id['meal']}/duplicate"], ['post', "/api/meals/{$id['meal']}/items", ['items' => [['food_id' => $id['base_food'], 'quantity' => 1]]]],
            ['patch', "/api/meal-items/{$id['item']}", ['quantity' => 9]], ['delete', "/api/meal-items/{$id['item']}"],
            ['get', "/api/saved-meals/{$id['saved']}"], ['delete', "/api/saved-meals/{$id['saved']}"], ['post', "/api/saved-meals/{$id['saved']}/add-to-diary"],
            ['patch', "/api/weights/{$id['weight']}", ['weight_kg' => 50]], ['delete', "/api/weights/{$id['weight']}"],
            ['patch', "/api/water/{$id['water']}", ['amount_ml' => 50]], ['delete', "/api/water/{$id['water']}"],
            ['patch', "/api/measurements/{$id['measure']}", ['value' => 50]], ['delete', "/api/measurements/{$id['measure']}"],
        ];

        foreach ($requests as $request) {
            $this->json($request[0], $request[1], $request[2] ?? [])->assertNotFound();
        }

        // nada da Alice foi alterado
        Sanctum::actingAs($this->alice);
        $this->getJson("/api/meals/{$id['meal']}")->assertOk()->assertJsonPath('data.notes', null)->assertJsonCount(1, 'data.items');
        $this->getJson("/api/recipes/{$id['recipe']}")->assertOk()->assertJsonPath('data.name', 'Receita da Alice');
        $this->getJson('/api/weights?period=all')->assertJsonCount(1, 'data.entries');
    }

    public function test_listings_only_show_own_records(): void
    {
        Sanctum::actingAs($this->bob);

        $this->getJson('/api/recipes')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/saved-meals')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/diary')->assertOk()->assertJsonCount(0, 'data.meals');
        $this->getJson('/api/weights?period=all')->assertOk()->assertJsonCount(0, 'data.entries');
        $this->getJson('/api/water')->assertOk()->assertJsonPath('data.total_ml', 0);
        $this->getJson('/api/measurements')->assertOk()->assertJsonCount(0, 'data.entries');
        $this->getJson('/api/foods/recent')->assertOk()->assertJsonCount(0, 'data');

        // a base de referência é compartilhada; o alimento personalizado da Alice não aparece
        $names = array_column($this->getJson('/api/foods?per_page=100')->json('data'), 'name');
        $this->assertContains('Arroz', $names);
        $this->assertNotContains('Pão caseiro da Alice', $names);
        $this->getJson('/api/foods?q=Alice')->assertJsonCount(0, 'data');

        $this->getJson('/api/me/export')->assertOk()->assertJsonCount(0, 'data.recipes')->assertJsonCount(0, 'data.meals');
    }

    public function test_ids_sent_by_the_app_are_checked_for_ownership(): void
    {
        Sanctum::actingAs($this->bob);
        $id = $this->aliceIds;

        // usar alimento personalizado, medida ou receita de outra pessoa
        $this->postJson('/api/meals', ['type' => 'lunch', 'items' => [['food_id' => $id['food'], 'quantity' => 100]]])
            ->assertUnprocessable()->assertJsonValidationErrors('items.0.food_id');
        $this->postJson('/api/meals', ['type' => 'lunch', 'items' => [['kind' => 'recipe', 'recipe_id' => $id['recipe'], 'quantity' => 1]]])
            ->assertUnprocessable()->assertJsonValidationErrors('items.0.recipe_id');
        $this->postJson('/api/recipes', ['name' => 'Cópia', 'servings' => 1, 'ingredients' => [['food_id' => $id['food'], 'quantity' => 10]]])
            ->assertUnprocessable()->assertJsonValidationErrors('ingredients.0.food_id');
        $this->postJson('/api/meals', ['type' => 'lunch', 'items' => [['food_id' => $id['base_food'], 'quantity' => 1, 'unit' => 'portion', 'portion_id' => $id['portion']]]])
            ->assertUnprocessable()->assertJsonValidationErrors('items.0.portion_id');

        // um user_id enviado no corpo é ignorado
        $this->postJson('/api/weights', ['weight_kg' => 80, 'user_id' => $this->alice->id])->assertCreated();
        Sanctum::actingAs($this->alice);
        $this->getJson('/api/weights?period=all')->assertJsonCount(1, 'data.entries');
    }

    public function test_reference_foods_are_read_only(): void
    {
        Sanctum::actingAs($this->bob);

        $this->patchJson("/api/foods/{$this->aliceIds['base_food']}", ['name' => 'Hack'])->assertForbidden();
        $this->deleteJson("/api/foods/{$this->aliceIds['base_food']}")->assertForbidden();
    }

    public function test_protected_routes_require_authentication(): void
    {
        $this->app['auth']->forgetGuards();

        foreach ([
            ['get', '/api/me'], ['get', '/api/dashboard'], ['get', '/api/reports'], ['get', '/api/goals'], ['get', '/api/foods'],
            ['get', '/api/recipes'], ['get', '/api/saved-meals'], ['get', '/api/diary'], ['post', '/api/meals'], ['get', '/api/weights'],
            ['get', '/api/water'], ['get', '/api/measurements'], ['get', '/api/me/export'], ['delete', '/api/me'],
            ['get', "/api/recipes/{$this->aliceIds['recipe']}/photo"],
        ] as [$method, $uri]) {
            $this->json($method, $uri)->assertUnauthorized();
        }
    }

    public function test_revoked_token_loses_access(): void
    {
        $this->app['auth']->forgetGuards();
        $token = $this->postJson('/api/auth/login', ['email' => $this->bob->email, 'password' => 'Senha@12345'])->assertOk()->json('data.token');

        $this->withToken($token)->getJson('/api/me')->assertOk();
        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();
        $this->app['auth']->forgetGuards();

        $this->withToken($token)->getJson('/api/me')->assertUnauthorized();
    }
}
