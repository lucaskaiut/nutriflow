<?php

namespace App\Modules\Diary\Http\Controllers;

use App\Modules\Account\Support\UserClock;
use App\Modules\Diary\Enums\MealType;
use App\Modules\Diary\Http\Requests\SaveMealRequest;
use App\Modules\Diary\Http\Resources\MealItemResource;
use App\Modules\Diary\Http\Resources\MealResource;
use App\Modules\Diary\Models\Meal;
use App\Modules\Diary\Models\MealItem;
use App\Modules\Diary\Services\MealService;
use App\Modules\Goal\Http\Resources\NutritionGoalResource;
use App\Modules\Goal\Services\GoalService;
use App\Modules\Nutrition\Enums\QuantityUnit;
use App\Modules\Nutrition\Support\ItemRules;
use App\Modules\Shared\Http\Controllers\ApiController;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MealController extends ApiController
{
    public function __construct(
        private readonly MealService $meals,
        private readonly GoalService $goals,
        private readonly UserClock $clock,
    ) {}

    /** Diário de um dia (padrão: hoje no fuso da pessoa). */
    public function day(Request $request): JsonResponse
    {
        $user = $request->user();
        $date = $request->validate(['date' => ['nullable', 'date_format:Y-m-d']])['date'] ?? $this->clock->today($user);
        $meals = $this->meals->day($user, $date);
        $month = CarbonImmutable::parse($date);
        $goal = $this->goals->current($user, $date);

        return $this->success([
            'date' => $date,
            'today' => $this->clock->today($user),
            'totals' => $this->meals->totals($meals)->toApi(),
            'goal' => $goal ? NutritionGoalResource::make($goal) : null,
            'meals' => MealResource::collection($meals),
            // dias do mês (±) com registros, para a navegação por datas
            'recorded_dates' => $this->meals->datesWithMeals($user, $month->startOfMonth()->subWeek()->toDateString(), $month->endOfMonth()->addWeek()->toDateString()),
        ]);
    }

    public function store(SaveMealRequest $request): JsonResponse
    {
        return $this->created(MealResource::make($this->meals->create($request->user(), $request->validated())), 'Refeição registrada.');
    }

    public function show(Meal $meal): JsonResponse
    {
        $this->authorize('view', $meal);

        return $this->success(MealResource::make($meal->load('items.food', 'items.recipe')));
    }

    public function update(SaveMealRequest $request, Meal $meal): JsonResponse
    {
        $this->authorize('update', $meal);

        return $this->success(MealResource::make($this->meals->update($meal, $request->safe()->except('items'))), 'Refeição atualizada.');
    }

    public function destroy(Meal $meal): JsonResponse
    {
        $this->authorize('delete', $meal);
        $this->meals->delete($meal);

        return $this->success(null, 'Refeição excluída.');
    }

    public function duplicate(Request $request, Meal $meal): JsonResponse
    {
        $this->authorize('view', $meal);
        $data = $request->validate([
            'date' => ['sometimes', 'date_format:Y-m-d'],
            'time' => ['sometimes', 'nullable', 'date_format:H:i'],
            'type' => ['sometimes', Rule::enum(MealType::class)],
        ]);

        return $this->created(MealResource::make($this->meals->duplicate($meal->load('items'), $data)), 'Refeição duplicada.');
    }

    public function addItems(Request $request, Meal $meal): JsonResponse
    {
        $this->authorize('update', $meal);
        $data = $request->validate(['items' => ['required', 'array', 'min:1', 'max:50'], ...ItemRules::for('items.*')]);

        return $this->success(MealResource::make($this->meals->addItems($request->user(), $meal, $data['items'])), 'Item adicionado à refeição.');
    }

    public function updateItem(Request $request, MealItem $item): JsonResponse
    {
        $this->authorize('update', $item);
        $data = $request->validate([
            'quantity' => ['required', 'numeric', 'gt:0', 'max:100000', 'decimal:0,3'],
            'unit' => ['sometimes', Rule::in(array_map(fn ($u) => $u->value, QuantityUnit::cases()))],
            'portion_id' => ['required_if:unit,portion', 'nullable', 'uuid'],
        ]);

        $item = $this->meals->updateItem($request->user(), $item, $data);

        return $this->success(MealItemResource::make($item), 'Quantidade atualizada.');
    }

    public function destroyItem(MealItem $item): JsonResponse
    {
        $this->authorize('delete', $item);
        $this->meals->deleteItem($item);

        return $this->success(null, 'Item removido da refeição.');
    }
}
