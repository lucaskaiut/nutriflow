<?php

namespace App\Modules\Goal\Http\Controllers;

use App\Modules\Account\Services\ProfileService;
use App\Modules\Goal\Enums\GoalMode;
use App\Modules\Goal\Http\Resources\NutritionGoalResource;
use App\Modules\Goal\Services\GoalService;
use App\Modules\Shared\Http\Controllers\ApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class GoalController extends ApiController
{
    public function __construct(
        private readonly GoalService $goals,
        private readonly ProfileService $profiles,
    ) {}

    public function show(Request $request): JsonResponse
    {
        return $this->success($this->payload($request->user()));
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kcal' => ['required', 'integer', 'min:500', 'max:10000'],
            'protein_g' => ['required', 'numeric', 'min:0', 'max:1000', 'decimal:0,1'],
            'carbs_g' => ['required', 'numeric', 'min:0', 'max:2000', 'decimal:0,1'],
            'fat_g' => ['required', 'numeric', 'min:0', 'max:1000', 'decimal:0,1'],
            'water_ml' => ['required', 'integer', 'min:250', 'max:10000'],
            'target_weight_kg' => ['sometimes', 'nullable', 'numeric', 'min:20', 'max:500', 'decimal:0,2'],
            'mode' => ['sometimes', Rule::enum(GoalMode::class)],
        ], [], ['kcal' => 'calorias', 'protein_g' => 'proteínas', 'carbs_g' => 'carboidratos', 'fat_g' => 'gorduras', 'water_ml' => 'água', 'target_weight_kg' => 'peso desejado']);

        $user = $request->user();
        DB::transaction(function () use ($user, $data) {
            $this->goals->set($user, $data, GoalMode::tryFrom($data['mode'] ?? 'manual') ?? GoalMode::MANUAL);
            if (array_key_exists('target_weight_kg', $data)) {
                $this->profiles->profileOf($user)->forceFill(['target_weight_kg' => $data['target_weight_kg']])->save();
            }
        });

        return $this->success($this->payload($user->refresh()), 'Metas atualizadas.');
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(\App\Modules\User\Models\User $user): array
    {
        $goal = $this->goals->current($user);
        $profile = $this->profiles->profileOf($user);

        return [
            'nutrition' => $goal ? NutritionGoalResource::make($goal) : null,
            'target_weight_kg' => $profile->target_weight_kg !== null ? (float) $profile->target_weight_kg : null,
            'estimate' => $this->profiles->estimate($user)->toArray(),
        ];
    }
}
