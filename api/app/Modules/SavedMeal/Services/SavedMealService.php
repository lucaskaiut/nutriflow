<?php

namespace App\Modules\SavedMeal\Services;

use App\Modules\Diary\Enums\ItemKind;
use App\Modules\Diary\Enums\MealType;
use App\Modules\Diary\Models\Meal;
use App\Modules\Diary\Services\MealService;
use App\Modules\Nutrition\Services\ItemResolver;
use App\Modules\SavedMeal\Models\SavedMeal;
use App\Modules\SavedMeal\Models\SavedMealItem;
use App\Modules\User\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class SavedMealService
{
    public function __construct(
        private readonly ItemResolver $resolver,
        private readonly MealService $meals,
    ) {}

    /**
     * @param  array{q?: ?string, filter?: ?string}  $filters  filter: all|favorites
     */
    public function list(User $user, array $filters, int $perPage = 30): LengthAwarePaginator
    {
        return SavedMeal::query()->ownedBy($user)
            ->with(['items.food', 'items.recipe.ingredients.food', 'items.portion'])
            ->when(($filters['filter'] ?? null) === 'favorites', fn ($q) => $q->where('is_favorite', true))
            ->when(filled($filters['q'] ?? null), fn ($q) => $q->where('name', 'like', '%'.addcslashes(Str::squish($filters['q']), '%_\\').'%'))
            ->orderByDesc('is_favorite')->orderBy('name')
            ->paginate(min(max($perPage, 1), 100));
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(User $user, array $data): SavedMeal
    {
        return DB::transaction(function () use ($user, $data) {
            $meal = SavedMeal::query()->create([...$this->attributes($data), 'user_id' => $user->id]);
            $this->syncItems($user, $meal, $data['items']);

            return $this->load($meal);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(User $user, SavedMeal $meal, array $data): SavedMeal
    {
        return DB::transaction(function () use ($user, $meal, $data) {
            $meal->fill($this->attributes($data))->save();
            if (array_key_exists('items', $data)) {
                $meal->items()->delete();
                $this->syncItems($user, $meal, $data['items']);
            }

            return $this->load($meal->refresh());
        });
    }

    public function duplicate(SavedMeal $meal): SavedMeal
    {
        return DB::transaction(function () use ($meal) {
            $copy = $meal->replicate(['uuid', 'is_favorite']);
            $copy->name = Str::limit($meal->name.' (cópia)', 160, '');
            $copy->save();
            foreach ($meal->items as $item) {
                $copy->items()->create($item->replicate(['saved_meal_id'])->getAttributes());
            }

            return $this->load($copy);
        });
    }

    public function setFavorite(SavedMeal $meal, bool $favorite): SavedMeal
    {
        $meal->forceFill(['is_favorite' => $favorite])->save();

        return $this->load($meal);
    }

    public function delete(SavedMeal $meal): void
    {
        $meal->delete();
    }

    /**
     * Registra a refeição salva no diário com snapshot dos valores atuais de cada item.
     * Itens cuja origem foi excluída (alimento/receita removidos) são recusados explicitamente.
     *
     * @param  array{date?: string, time?: ?string, type?: ?string, custom_name?: ?string}  $data
     */
    public function addToDiary(User $user, SavedMeal $saved, array $data): Meal
    {
        $saved->loadMissing(['items.food', 'items.recipe', 'items.portion']);

        $items = $saved->items->map(function (SavedMealItem $item, int $i) {
            $source = $item->kind === ItemKind::RECIPE ? $item->recipe : $item->food;
            if ($source === null || $source->trashed()) {
                throw ValidationException::withMessages([
                    'saved_meal' => ["O item {$i} desta refeição salva não existe mais. Edite a refeição salva antes de usá-la."],
                ]);
            }

            return [
                'kind' => $item->kind->value,
                'food_id' => $item->food?->uuid,
                'recipe_id' => $item->recipe?->uuid,
                'portion_id' => $item->portion?->uuid,
                'quantity' => (string) $item->quantity,
                'unit' => $item->unit->value,
            ];
        })->all();

        $type = $data['type'] ?? $saved->meal_type?->value ?? MealType::CUSTOM->value;

        return $this->meals->create($user, [
            'date' => $data['date'] ?? null,
            'time' => $data['time'] ?? null,
            'type' => $type,
            'custom_name' => $type === MealType::CUSTOM->value ? ($data['custom_name'] ?? $saved->name) : null,
            'items' => $items,
        ]);
    }

    public function load(SavedMeal $meal): SavedMeal
    {
        return $meal->load(['items.food', 'items.recipe.ingredients.food', 'items.portion']);
    }

    /**
     * @param  list<array<string, mixed>>  $items
     */
    private function syncItems(User $user, SavedMeal $meal, array $items): void
    {
        foreach (array_values($items) as $i => $input) {
            $meal->items()->create($this->resolver->resolve($user, $input, "items.{$i}")->toRow($i));
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function attributes(array $data): array
    {
        return collect($data)->only(['name', 'description', 'meal_type', 'is_favorite'])
            ->map(fn ($v) => is_string($v) ? trim($v) : $v)
            ->all();
    }
}
