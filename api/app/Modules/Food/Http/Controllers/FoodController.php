<?php

namespace App\Modules\Food\Http\Controllers;

use App\Modules\Food\Http\Requests\StoreFoodRequest;
use App\Modules\Food\Http\Resources\FoodPortionResource;
use App\Modules\Food\Http\Resources\FoodResource;
use App\Modules\Food\Models\Food;
use App\Modules\Food\Models\FoodCategory;
use App\Modules\Food\Models\FoodPortion;
use App\Modules\Food\Services\FoodService;
use App\Modules\Shared\Http\Controllers\ApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FoodController extends ApiController
{
    public function __construct(private readonly FoodService $foods) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:60'],
            'scope' => ['nullable', Rule::in(['all', 'favorites', 'custom'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        return $this->paginated(FoodResource::collection(
            $this->foods->search($request->user(), $filters, (int) ($filters['per_page'] ?? 30)),
        ));
    }

    public function recent(Request $request): JsonResponse
    {
        return $this->success(FoodResource::collection($this->foods->recent($request->user())));
    }

    public function categories(): JsonResponse
    {
        return $this->success(FoodCategory::query()->orderBy('position')->get(['slug', 'name']));
    }

    public function show(Request $request, Food $food): JsonResponse
    {
        $this->authorize('view', $food);

        return $this->success(FoodResource::make($this->foods->load($food, $request->user())));
    }

    public function store(StoreFoodRequest $request): JsonResponse
    {
        $food = $this->foods->createCustom($request->user(), $request->payload());

        return $this->created(FoodResource::make($food), 'Alimento cadastrado.');
    }

    public function update(StoreFoodRequest $request, Food $food): JsonResponse
    {
        $this->authorize('update', $food);
        $food = $this->foods->updateCustom($food, $request->user(), $request->payload());

        return $this->success(FoodResource::make($food), 'Alimento atualizado.');
    }

    public function destroy(Food $food): JsonResponse
    {
        $this->authorize('delete', $food);
        $this->foods->deleteCustom($food);

        return $this->success(null, 'Alimento excluído.');
    }

    public function favorite(Request $request, Food $food): JsonResponse
    {
        $this->authorize('view', $food);
        $this->foods->setFavorite($request->user(), $food, true);

        return $this->success(FoodResource::make($this->foods->load($food, $request->user())), 'Adicionado aos favoritos.');
    }

    public function unfavorite(Request $request, Food $food): JsonResponse
    {
        $this->authorize('view', $food);
        $this->foods->setFavorite($request->user(), $food, false);

        return $this->success(FoodResource::make($this->foods->load($food, $request->user())), 'Removido dos favoritos.');
    }

    public function storePortion(Request $request, Food $food): JsonResponse
    {
        $this->authorize('view', $food);
        $data = $request->validate([
            'label' => ['required', 'string', 'min:1', 'max:80'],
            'amount' => ['required', 'numeric', 'gt:0', 'max:100000', 'decimal:0,3'],
        ], [], ['label' => 'nome da medida', 'amount' => 'quantidade equivalente']);

        $portion = $this->foods->addPortion($request->user(), $food, $data['label'], (string) $data['amount']);

        return $this->created(FoodPortionResource::make($portion), 'Medida caseira cadastrada.');
    }

    public function destroyPortion(FoodPortion $portion): JsonResponse
    {
        $this->authorize('delete', $portion);
        $portion->delete();

        return $this->success(null, 'Medida caseira excluída.');
    }
}
