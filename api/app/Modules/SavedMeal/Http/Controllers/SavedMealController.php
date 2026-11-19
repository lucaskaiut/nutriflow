<?php

namespace App\Modules\SavedMeal\Http\Controllers;

use App\Modules\Diary\Enums\MealType;
use App\Modules\Diary\Http\Resources\MealResource;
use App\Modules\SavedMeal\Http\Requests\SaveSavedMealRequest;
use App\Modules\SavedMeal\Http\Resources\SavedMealResource;
use App\Modules\SavedMeal\Models\SavedMeal;
use App\Modules\SavedMeal\Services\SavedMealService;
use App\Modules\Shared\Http\Controllers\ApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SavedMealController extends ApiController
{
    public function __construct(private readonly SavedMealService $saved) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'filter' => ['nullable', Rule::in(['all', 'favorites'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        return $this->paginated(SavedMealResource::collection(
            $this->saved->list($request->user(), $filters, (int) ($filters['per_page'] ?? 30)),
        ));
    }

    public function show(SavedMeal $savedMeal): JsonResponse
    {
        $this->authorize('view', $savedMeal);

        return $this->success(SavedMealResource::make($this->saved->load($savedMeal)));
    }

    public function store(SaveSavedMealRequest $request): JsonResponse
    {
        return $this->created(SavedMealResource::make($this->saved->create($request->user(), $request->validated())), 'Refeição salva criada.');
    }

    public function update(SaveSavedMealRequest $request, SavedMeal $savedMeal): JsonResponse
    {
        $this->authorize('update', $savedMeal);

        return $this->success(SavedMealResource::make($this->saved->update($request->user(), $savedMeal, $request->validated())), 'Refeição salva atualizada.');
    }

    public function destroy(SavedMeal $savedMeal): JsonResponse
    {
        $this->authorize('delete', $savedMeal);
        $this->saved->delete($savedMeal);

        return $this->success(null, 'Refeição salva excluída.');
    }

    public function duplicate(SavedMeal $savedMeal): JsonResponse
    {
        $this->authorize('view', $savedMeal);

        return $this->created(SavedMealResource::make($this->saved->duplicate($this->saved->load($savedMeal))), 'Refeição salva duplicada.');
    }

    public function favorite(Request $request, SavedMeal $savedMeal): JsonResponse
    {
        $this->authorize('update', $savedMeal);
        $favorite = (bool) $request->validate(['favorite' => ['required', 'boolean']])['favorite'];

        return $this->success(SavedMealResource::make($this->saved->setFavorite($savedMeal, $favorite)));
    }

    public function addToDiary(Request $request, SavedMeal $savedMeal): JsonResponse
    {
        $this->authorize('view', $savedMeal);
        $data = $request->validate([
            'date' => ['sometimes', 'date_format:Y-m-d'],
            'time' => ['sometimes', 'nullable', 'date_format:H:i'],
            'type' => ['sometimes', 'nullable', Rule::enum(MealType::class)],
            'custom_name' => ['nullable', 'string', 'max:80'],
        ]);

        $meal = $this->saved->addToDiary($request->user(), $savedMeal, $data);

        return $this->created(MealResource::make($meal), "\"{$savedMeal->name}\" adicionada ao diário.");
    }
}
