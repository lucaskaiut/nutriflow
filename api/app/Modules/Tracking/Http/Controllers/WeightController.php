<?php

namespace App\Modules\Tracking\Http\Controllers;

use App\Modules\Shared\Http\Controllers\ApiController;
use App\Modules\Tracking\Http\Requests\WeightEntryRequest;
use App\Modules\Tracking\Http\Resources\WeightEntryResource;
use App\Modules\Tracking\Models\WeightEntry;
use App\Modules\Tracking\Services\WeightService;
use App\Modules\Tracking\Support\Period;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WeightController extends ApiController
{
    public function __construct(private readonly WeightService $weights) {}

    public function index(Request $request): JsonResponse
    {
        $period = Period::from($request->validate(['period' => ['nullable', Rule::enum(Period::class)]])['period'] ?? Period::MONTH->value);
        $user = $request->user();

        return $this->success([
            'period' => $period->value,
            'summary' => $this->weights->summary($user),
            'period_change' => $this->weights->periodChange($user, $period),
            'entries' => WeightEntryResource::collection($this->weights->history($user, $period)),
        ]);
    }

    public function store(WeightEntryRequest $request): JsonResponse
    {
        $entry = $this->weights->create($request->user(), $request->validated());

        return $this->created(WeightEntryResource::make($entry), 'Pesagem registrada.');
    }

    public function update(WeightEntryRequest $request, WeightEntry $weight): JsonResponse
    {
        $this->authorize('update', $weight);

        return $this->success(WeightEntryResource::make($this->weights->update($weight, $request->validated())), 'Pesagem atualizada.');
    }

    public function destroy(WeightEntry $weight): JsonResponse
    {
        $this->authorize('delete', $weight);
        $this->weights->delete($weight);

        return $this->success(null, 'Pesagem excluída.');
    }
}
