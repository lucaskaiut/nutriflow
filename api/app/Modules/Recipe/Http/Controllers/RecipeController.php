<?php

namespace App\Modules\Recipe\Http\Controllers;

use App\Modules\Diary\Models\MealItem;
use App\Modules\Recipe\Http\Requests\SaveRecipeRequest;
use App\Modules\Recipe\Http\Resources\RecipeResource;
use App\Modules\Recipe\Models\Recipe;
use App\Modules\Recipe\Services\RecipeService;
use App\Modules\Shared\Http\Controllers\ApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RecipeController extends ApiController
{
    public function __construct(private readonly RecipeService $recipes) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'filter' => ['nullable', Rule::in(['all', 'favorites', 'recent', 'archived'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        return $this->paginated(RecipeResource::collection(
            $this->recipes->list($request->user(), $filters, (int) ($filters['per_page'] ?? 30)),
        ));
    }

    public function show(Recipe $recipe): JsonResponse
    {
        $this->authorize('view', $recipe);

        return $this->success(RecipeResource::make($this->recipes->load($recipe)));
    }

    public function store(SaveRecipeRequest $request): JsonResponse
    {
        $recipe = $this->recipes->create($request->user(), $request->validated());

        return $this->created(RecipeResource::make($recipe), 'Receita salva.');
    }

    public function update(SaveRecipeRequest $request, Recipe $recipe): JsonResponse
    {
        $this->authorize('update', $recipe);
        $recipe = $this->recipes->update($request->user(), $recipe, $request->validated());

        return $this->success(RecipeResource::make($recipe), 'Receita atualizada.');
    }

    public function destroy(Recipe $recipe): JsonResponse
    {
        $this->authorize('delete', $recipe);
        $this->recipes->delete($recipe);

        return $this->success(null, 'Receita excluída.');
    }

    public function duplicate(Recipe $recipe): JsonResponse
    {
        $this->authorize('view', $recipe);

        return $this->created(RecipeResource::make($this->recipes->duplicate($this->recipes->load($recipe))), 'Receita duplicada.');
    }

    public function archive(Request $request, Recipe $recipe): JsonResponse
    {
        $this->authorize('update', $recipe);
        $archived = (bool) $request->validate(['archived' => ['required', 'boolean']])['archived'];

        return $this->success(
            RecipeResource::make($this->recipes->setArchived($recipe, $archived)),
            $archived ? 'Receita arquivada.' : 'Receita restaurada.',
        );
    }

    public function favorite(Request $request, Recipe $recipe): JsonResponse
    {
        $this->authorize('update', $recipe);
        $favorite = (bool) $request->validate(['favorite' => ['required', 'boolean']])['favorite'];

        return $this->success(
            RecipeResource::make($this->recipes->setFavorite($recipe, $favorite)),
            $favorite ? 'Receita favoritada.' : 'Receita removida dos favoritos.',
        );
    }

    public function usage(Recipe $recipe): JsonResponse
    {
        $this->authorize('view', $recipe);

        return $this->success($this->recipes->usage($recipe)->map(fn (MealItem $item) => [
            'meal_id' => $item->meal->uuid,
            'date' => $item->meal->date->toDateString(),
            'time' => substr((string) $item->meal->time, 0, 5),
            'meal_title' => $item->meal->title(),
            'servings' => (float) $item->quantity,
            'kcal' => (float) $item->kcal,
        ])->values());
    }

    public function photo(Recipe $recipe): StreamedResponse
    {
        $this->authorize('view', $recipe);
        abort_unless($recipe->photo_path && Storage::disk(RecipeService::PHOTO_DISK)->exists($recipe->photo_path), 404);

        return Storage::disk(RecipeService::PHOTO_DISK)->response($recipe->photo_path, null, [
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }

    public function uploadPhoto(Request $request, Recipe $recipe): JsonResponse
    {
        $this->authorize('update', $recipe);
        $request->validate(['photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120']], [], ['photo' => 'foto']);

        return $this->success(RecipeResource::make($this->recipes->storePhoto($recipe, $request->file('photo'))), 'Foto atualizada.');
    }

    public function deletePhoto(Recipe $recipe): JsonResponse
    {
        $this->authorize('update', $recipe);

        return $this->success(RecipeResource::make($this->recipes->removePhoto($recipe)), 'Foto removida.');
    }
}
