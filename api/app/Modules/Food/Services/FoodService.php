<?php

namespace App\Modules\Food\Services;

use App\Modules\Diary\Enums\ItemKind;
use App\Modules\Food\Enums\FoodSource;
use App\Modules\Food\Models\Food;
use App\Modules\Food\Models\FoodFavorite;
use App\Modules\Food\Models\FoodNutrient;
use App\Modules\Food\Models\FoodPortion;
use App\Modules\User\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class FoodService
{
    /**
     * Pesquisa na base visível à pessoa (referência + personalizados próprios).
     * Todas as palavras precisam aparecer no nome, em qualquer ordem ("frango grelhado").
     *
     * @param  array{q?: ?string, category?: ?string, scope?: ?string}  $filters  scope: all|favorites|custom
     */
    public function search(User $user, array $filters, int $perPage = 30): LengthAwarePaginator
    {
        $terms = collect(preg_split('/\s+/', Str::squish((string) ($filters['q'] ?? ''))))->filter()->take(6);

        return $this->baseQuery($user)
            ->when($terms->isNotEmpty(), function (Builder $q) use ($terms) {
                foreach ($terms as $term) {
                    $q->where('foods.name', 'like', '%'.addcslashes($term, '%_\\').'%');
                }
            })
            ->when($filters['category'] ?? null, fn (Builder $q, string $slug) => $q->whereHas('category', fn ($c) => $c->where('slug', $slug)))
            ->when(($filters['scope'] ?? null) === 'favorites', fn (Builder $q) => $q->whereHas('favorites', fn ($f) => $f->where('user_id', $user->id)))
            ->when(($filters['scope'] ?? null) === 'custom', fn (Builder $q) => $q->where('foods.user_id', $user->id))
            // nomes que começam pelo termo primeiro; depois alfabético
            ->when($terms->isNotEmpty(), fn (Builder $q) => $q->orderByRaw('CASE WHEN foods.name LIKE ? THEN 0 ELSE 1 END', [addcslashes((string) $terms->first(), '%_\\').'%']))
            ->orderBy('foods.name')
            ->paginate(min(max($perPage, 1), 100));
    }

    /**
     * Alimentos usados mais recentemente no diário (sem repetição).
     *
     * @return Collection<int, Food>
     */
    public function recent(User $user, int $limit = 10): Collection
    {
        $ids = DB::table('meal_items')
            ->join('meals', 'meals.id', '=', 'meal_items.meal_id')
            ->where('meals.user_id', $user->id)
            ->where('meal_items.kind', ItemKind::FOOD->value)
            ->whereNotNull('meal_items.food_id')
            ->groupBy('meal_items.food_id')
            ->orderByRaw('MAX(meal_items.created_at) DESC')
            ->limit($limit)
            ->pluck('meal_items.food_id');

        $foods = $this->baseQuery($user)->whereIn('foods.id', $ids)->get()->keyBy('id');

        return $ids->map(fn ($id) => $foods->get($id))->filter()->values();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createCustom(User $user, array $data): Food
    {
        return DB::transaction(function () use ($user, $data) {
            $food = Food::query()->create([
                ...$this->foodAttributes($data),
                'user_id' => $user->id,
                'source' => FoodSource::CUSTOM,
            ]);
            $this->syncExtraNutrients($food, $data['nutrients'] ?? []);

            return $this->load($food, $user);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateCustom(Food $food, User $user, array $data): Food
    {
        return DB::transaction(function () use ($food, $user, $data) {
            $food->fill($this->foodAttributes($data))->save();
            if (array_key_exists('nutrients', $data)) {
                $this->syncExtraNutrients($food, $data['nutrients'] ?? []);
            }

            return $this->load($food->refresh(), $user);
        });
    }

    /** Soft delete: receitas, refeições salvas e o diário continuam válidos. */
    public function deleteCustom(Food $food): void
    {
        DB::transaction(function () use ($food) {
            FoodFavorite::query()->where('food_id', $food->id)->delete();
            $food->delete();
        });
    }

    public function setFavorite(User $user, Food $food, bool $favorite): void
    {
        $favorite
            ? FoodFavorite::query()->firstOrCreate(['user_id' => $user->id, 'food_id' => $food->id])
            : FoodFavorite::query()->where('user_id', $user->id)->where('food_id', $food->id)->delete();
    }

    public function addPortion(User $user, Food $food, string $label, string $amount): FoodPortion
    {
        return FoodPortion::query()->create([
            'food_id' => $food->id,
            'user_id' => $user->id,
            'label' => Str::squish($label),
            'amount' => $amount,
        ]);
    }

    public function load(Food $food, User $user): Food
    {
        return $food->load([
            'category',
            'extraNutrients',
            'portions' => fn ($q) => $q->visibleTo($user)->orderBy('amount'),
        ])->loadExists(['favorites as is_favorite' => fn ($q) => $q->where('user_id', $user->id)]);
    }

    /** @return Builder<Food> */
    private function baseQuery(User $user): Builder
    {
        return Food::query()
            ->visibleTo($user)
            ->with(['category', 'portions' => fn ($q) => $q->visibleTo($user)->orderBy('amount')])
            ->withExists(['favorites as is_favorite' => fn ($q) => $q->where('user_id', $user->id)]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function foodAttributes(array $data): array
    {
        $map = [
            'name' => 'name', 'description' => 'description', 'food_category_id' => 'food_category_id',
            'reference_amount' => 'reference_amount', 'reference_unit' => 'reference_unit',
            'kcal' => 'kcal', 'protein_g' => 'protein_g', 'carbs_g' => 'carbs_g', 'fat_g' => 'fat_g', 'fiber_g' => 'fiber_g',
        ];
        $attrs = [];
        foreach ($map as $in => $column) {
            if (array_key_exists($in, $data)) {
                $value = $data[$in];
                $attrs[$column] = is_string($value) ? Str::squish($value) : ($value === null ? null : (string) $value);
            }
        }

        return $attrs;
    }

    /**
     * @param  array<string, numeric|null>  $nutrients  ex.: ['sodium_mg' => 120]
     */
    private function syncExtraNutrients(Food $food, array $nutrients): void
    {
        foreach ($nutrients as $key => $amount) {
            if ($amount === null || $amount === '') {
                FoodNutrient::query()->where('food_id', $food->id)->where('nutrient', $key)->delete();

                continue;
            }
            FoodNutrient::query()->updateOrCreate(
                ['food_id' => $food->id, 'nutrient' => $key],
                ['amount' => (string) $amount, 'unit' => str_ends_with($key, '_mg') ? 'mg' : (str_ends_with($key, '_g') ? 'g' : 'mcg')],
            );
        }
    }
}
