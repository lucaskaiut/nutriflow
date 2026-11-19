<?php

namespace App\Modules\Account\Services;

use App\Modules\Diary\Models\Meal;
use App\Modules\Food\Models\Food;
use App\Modules\Food\Models\FoodFavorite;
use App\Modules\Food\Models\FoodPortion;
use App\Modules\Goal\Models\NutritionGoal;
use App\Modules\Recipe\Models\Recipe;
use App\Modules\Recipe\Services\RecipeService;
use App\Modules\SavedMeal\Models\SavedMeal;
use App\Modules\Tenant\Models\Tenant;
use App\Modules\Tracking\Models\BodyMeasurement;
use App\Modules\Tracking\Models\WaterEntry;
use App\Modules\Tracking\Models\WeightEntry;
use App\Modules\User\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/** Direitos do titular (LGPD): portabilidade (exportação) e eliminação dos dados. */
final class AccountService
{
    public const DELETE_CONFIRMATION = 'EXCLUIR';

    /**
     * Exportação completa dos dados pessoais em formato estruturado (JSON).
     *
     * @return array<string, mixed>
     */
    public function export(User $user): array
    {
        $hidden = ['id', 'user_id', 'meal_id', 'recipe_id', 'saved_meal_id', 'food_id', 'food_portion_id', 'food_category_id'];
        $clean = fn ($models) => $models->map(fn ($m) => collect($m->toArray())->except($hidden)->all())->values();

        return [
            'format' => 'nutriflow-export',
            'version' => 1,
            'exported_at' => now()->toIso8601String(),
            'account' => [
                'name' => $user->name,
                'email' => $user->email,
                'created_at' => $user->created_at?->toIso8601String(),
                'google_linked' => $user->google_id !== null,
            ],
            'profile' => collect($user->profile?->toArray())->except($hidden),
            'preferences' => collect($user->preferences?->toArray())->except($hidden),
            'nutrition_goals' => $clean(NutritionGoal::query()->where('user_id', $user->id)->orderBy('effective_from')->get()),
            'weight_entries' => $clean(WeightEntry::query()->ownedBy($user)->chronological()->get()),
            'body_measurements' => $clean(BodyMeasurement::query()->ownedBy($user)->orderBy('measured_on')->get()),
            'water_entries' => $clean(WaterEntry::query()->ownedBy($user)->orderBy('date')->orderBy('time')->get()),
            'meals' => Meal::query()->ownedBy($user)->with('items')->orderBy('date')->orderBy('time')->get()
                ->map(fn (Meal $m) => [...collect($m->toArray())->except([...$hidden, 'items'])->all(), 'items' => $clean($m->items)]),
            'recipes' => Recipe::query()->withTrashed()->ownedBy($user)->with('ingredients.food')->get()
                ->map(fn (Recipe $r) => [
                    ...collect($r->toArray())->except([...$hidden, 'ingredients', 'photo_path'])->all(),
                    'ingredients' => $r->ingredients->map(fn ($i) => [
                        'food' => $i->food?->name, 'quantity' => $i->quantity, 'unit' => $i->unit, 'base_quantity' => $i->base_quantity,
                    ]),
                ]),
            'saved_meals' => SavedMeal::query()->ownedBy($user)->with('items.food', 'items.recipe')->get()
                ->map(fn (SavedMeal $s) => [
                    ...collect($s->toArray())->except([...$hidden, 'items'])->all(),
                    'items' => $s->items->map(fn ($i) => [
                        'kind' => $i->kind, 'name' => $i->food?->name ?? $i->recipe?->name, 'quantity' => $i->quantity, 'unit' => $i->unit,
                    ]),
                ]),
            'custom_foods' => $clean(Food::query()->withTrashed()->where('user_id', $user->id)->with('extraNutrients')->get()),
            'custom_portions' => $clean(FoodPortion::query()->where('user_id', $user->id)->get()),
            'favorite_foods' => Food::query()->whereIn('id', FoodFavorite::query()->where('user_id', $user->id)->select('food_id'))->pluck('name'),
        ];
    }

    /**
     * Exclui a conta e TODOS os dados associados (exclusão física, sem soft delete).
     * Contas com senha exigem a senha; todas exigem a confirmação digitada.
     */
    public function delete(User $user, string $confirmation, ?string $password): void
    {
        if ($confirmation !== self::DELETE_CONFIRMATION) {
            throw ValidationException::withMessages(['confirmation' => ['Digite EXCLUIR para confirmar.']]);
        }

        if ($user->google_id === null && ! Hash::check((string) $password, $user->password)) {
            throw ValidationException::withMessages(['password' => ['Senha incorreta.']]);
        }

        $tenantId = $user->tenant_id;
        $userId = $user->id;

        DB::transaction(function () use ($user, $tenantId) {
            $user->tokens()->delete();
            DB::table('password_reset_tokens')->where('email', $user->email)->delete();
            // tenants → users → (perfil, diário, receitas, alimentos, metas, pesagens...) em cascata
            Tenant::query()->whereKey($tenantId)->delete();
        });

        Storage::disk(RecipeService::PHOTO_DISK)->deleteDirectory("recipes/{$userId}");

        // sem dados pessoais no log: apenas o identificador interno
        Log::info('account.deleted', ['user_id' => $userId]);
    }
}
