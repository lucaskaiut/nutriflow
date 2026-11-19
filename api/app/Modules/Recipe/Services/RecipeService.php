<?php

namespace App\Modules\Recipe\Services;

use App\Modules\Diary\Models\MealItem;
use App\Modules\Nutrition\Services\ItemResolver;
use App\Modules\Recipe\Models\Recipe;
use App\Modules\User\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class RecipeService
{
    /** Disco privado: a foto é servida por rota autenticada (GET /recipes/{recipe}/photo). */
    public const PHOTO_DISK = 'local';

    public function __construct(private readonly ItemResolver $resolver) {}

    /**
     * @param  array{q?: ?string, filter?: ?string}  $filters  filter: all|favorites|recent|archived
     */
    public function list(User $user, array $filters, int $perPage = 30): LengthAwarePaginator
    {
        $filter = $filters['filter'] ?? 'all';

        return Recipe::query()->ownedBy($user)
            ->with('ingredients.food', 'ingredients.portion')
            ->when($filter === 'archived', fn (Builder $q) => $q->whereNotNull('archived_at'), fn (Builder $q) => $q->whereNull('archived_at'))
            ->when($filter === 'favorites', fn (Builder $q) => $q->where('is_favorite', true))
            ->when(filled($filters['q'] ?? null), fn (Builder $q) => $q->where('name', 'like', '%'.addcslashes(Str::squish($filters['q']), '%_\\').'%'))
            ->when($filter === 'recent', function (Builder $q) {
                // receitas usadas recentemente no diário primeiro; depois as editadas recentemente
                $q->orderByRaw('(SELECT MAX(meal_items.created_at) FROM meal_items WHERE meal_items.recipe_id = recipes.id) IS NULL')
                    ->orderByDesc(DB::raw('(SELECT MAX(meal_items.created_at) FROM meal_items WHERE meal_items.recipe_id = recipes.id)'))
                    ->orderByDesc('updated_at');
            }, fn (Builder $q) => $q->orderByDesc('is_favorite')->orderBy('name'))
            ->paginate(min(max($perPage, 1), 100));
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(User $user, array $data): Recipe
    {
        return DB::transaction(function () use ($user, $data) {
            $recipe = Recipe::query()->create([...$this->attributes($data), 'user_id' => $user->id]);
            $this->syncIngredients($user, $recipe, $data['ingredients']);

            return $this->load($recipe);
        });
    }

    /**
     * Atualiza dados e (se enviados) substitui a lista de ingredientes. Registros já feitos no
     * diário não mudam: eles guardam snapshot.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(User $user, Recipe $recipe, array $data): Recipe
    {
        return DB::transaction(function () use ($user, $recipe, $data) {
            $recipe->fill($this->attributes($data))->save();
            if (array_key_exists('ingredients', $data)) {
                $recipe->ingredients()->delete();
                $this->syncIngredients($user, $recipe, $data['ingredients']);
            }

            return $this->load($recipe->refresh());
        });
    }

    public function duplicate(Recipe $recipe): Recipe
    {
        return DB::transaction(function () use ($recipe) {
            $copy = $recipe->replicate(['uuid', 'is_favorite', 'archived_at', 'photo_path']);
            $copy->name = Str::limit($recipe->name.' (cópia)', 160, '');
            if ($recipe->photo_path && Storage::disk(self::PHOTO_DISK)->exists($recipe->photo_path)) {
                $copy->photo_path = $this->photoPath($recipe->user_id);
                Storage::disk(self::PHOTO_DISK)->copy($recipe->photo_path, $copy->photo_path);
            }
            $copy->save();

            foreach ($recipe->ingredients as $ingredient) {
                $copy->ingredients()->create($ingredient->replicate(['recipe_id'])->getAttributes());
            }

            return $this->load($copy);
        });
    }

    public function setArchived(Recipe $recipe, bool $archived): Recipe
    {
        $recipe->forceFill(['archived_at' => $archived ? now() : null])->save();

        return $this->load($recipe);
    }

    public function setFavorite(Recipe $recipe, bool $favorite): Recipe
    {
        $recipe->forceFill(['is_favorite' => $favorite])->save();

        return $this->load($recipe);
    }

    /** Soft delete: snapshots do diário continuam; refeições salvas perdem o item na próxima edição. */
    public function delete(Recipe $recipe): void
    {
        $recipe->delete();
    }

    public function storePhoto(Recipe $recipe, UploadedFile $file): Recipe
    {
        $old = $recipe->photo_path;
        $path = $this->photoPath($recipe->user_id, $file->extension());
        Storage::disk(self::PHOTO_DISK)->putFileAs(dirname($path), $file, basename($path));
        $recipe->forceFill(['photo_path' => $path])->save();

        if ($old) {
            Storage::disk(self::PHOTO_DISK)->delete($old);
        }

        return $this->load($recipe);
    }

    public function removePhoto(Recipe $recipe): Recipe
    {
        if ($recipe->photo_path) {
            Storage::disk(self::PHOTO_DISK)->delete($recipe->photo_path);
        }
        $recipe->forceFill(['photo_path' => null])->save();

        return $this->load($recipe);
    }

    /**
     * Histórico de uso da receita no diário.
     *
     * @return \Illuminate\Support\Collection<int, MealItem>
     */
    public function usage(Recipe $recipe, int $limit = 50)
    {
        return MealItem::query()
            ->with('meal')
            ->where('recipe_id', $recipe->id)
            ->whereHas('meal', fn ($q) => $q->where('user_id', $recipe->user_id))
            ->join('meals', 'meals.id', '=', 'meal_items.meal_id')
            ->orderByDesc('meals.date')->orderByDesc('meals.time')
            ->select('meal_items.*')
            ->limit($limit)
            ->get();
    }

    public function load(Recipe $recipe): Recipe
    {
        return $recipe->load('ingredients.food', 'ingredients.portion');
    }

    /**
     * @param  list<array<string, mixed>>  $ingredients
     */
    private function syncIngredients(User $user, Recipe $recipe, array $ingredients): void
    {
        foreach (array_values($ingredients) as $i => $input) {
            $resolved = $this->resolver->resolve($user, [...$input, 'kind' => 'food'], "ingredients.{$i}", allowRecipes: false);
            $row = $resolved->toRow($i);
            unset($row['kind'], $row['recipe_id']);
            $recipe->ingredients()->create($row);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function attributes(array $data): array
    {
        return collect($data)->only(['name', 'description', 'servings', 'yield_weight_g', 'prep_time_minutes', 'instructions', 'is_favorite'])
            ->map(fn ($v) => is_string($v) ? trim($v) : $v)
            ->all();
    }

    private function photoPath(int $userId, string $extension = 'jpg'): string
    {
        return "recipes/{$userId}/".Str::uuid().'.'.$extension;
    }
}
