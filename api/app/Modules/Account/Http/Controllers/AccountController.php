<?php

namespace App\Modules\Account\Http\Controllers;

use App\Modules\Account\Enums\ActivityLevel;
use App\Modules\Account\Enums\GoalType;
use App\Modules\Account\Enums\Sex;
use App\Modules\Account\Http\Resources\AccountResource;
use App\Modules\Account\Services\AccountService;
use App\Modules\Account\Services\ProfileService;
use App\Modules\Shared\Http\Controllers\ApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AccountController extends ApiController
{
    public function __construct(
        private readonly ProfileService $profiles,
        private readonly AccountService $accounts,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->profiles->profileOf($user);
        $this->profiles->preferencesOf($user);

        return $this->success(AccountResource::make($user->load('profile', 'preferences')));
    }

    public function update(Request $request): JsonResponse
    {
        $user = $this->profiles->update($request->user(), $request->validate($this->profileRules()));

        return $this->success(AccountResource::make($user), 'Perfil atualizado.');
    }

    public function onboarding(Request $request): JsonResponse
    {
        $data = $request->validate([
            ...$this->profileRules(),
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'height_cm' => ['required', 'numeric', 'min:50', 'max:260', 'decimal:0,1'],
            'current_weight_kg' => ['required', 'numeric', 'min:20', 'max:500', 'decimal:0,2'],
            'target_weight_kg' => ['required', 'numeric', 'min:20', 'max:500', 'decimal:0,2'],
            'goal' => ['required', Rule::enum(GoalType::class)],
            'apply_estimated_goals' => ['sometimes', 'boolean'],
        ]);

        $user = $this->profiles->completeOnboarding($request->user(), $data);

        return $this->success(AccountResource::make($user), 'Perfil configurado.');
    }

    public function preferences(Request $request): JsonResponse
    {
        $data = $request->validate([
            'theme' => ['sometimes', Rule::in(['light', 'dark', 'system'])],
            'weight_unit' => ['sometimes', Rule::in(['kg', 'lb'])],
            'length_unit' => ['sometimes', Rule::in(['cm', 'in'])],
            'meal_reminders' => ['sometimes', 'boolean'],
            'water_reminders' => ['sometimes', 'boolean'],
            'weight_reminder' => ['sometimes', 'boolean'],
        ]);
        $this->profiles->updatePreferences($request->user(), $data);

        return $this->success(AccountResource::make($request->user()->load('profile', 'preferences')), 'Preferências salvas.');
    }

    public function export(Request $request): JsonResponse
    {
        return $this->success($this->accounts->export($request->user()->load('profile', 'preferences')));
    }

    public function destroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'confirmation' => ['required', 'string'],
            'password' => ['nullable', 'string'],
        ]);

        $this->accounts->delete($request->user(), $data['confirmation'], $data['password'] ?? null);

        return $this->success(null, 'Conta e dados excluídos definitivamente.');
    }

    /**
     * @return array<string, mixed>
     */
    private function profileRules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'min:2', 'max:255'],
            'birth_date' => ['sometimes', 'nullable', 'date_format:Y-m-d', 'before:today', 'after:1900-01-01'],
            'sex' => ['sometimes', 'nullable', Rule::enum(Sex::class)],
            'height_cm' => ['sometimes', 'nullable', 'numeric', 'min:50', 'max:260', 'decimal:0,1'],
            'initial_weight_kg' => ['sometimes', 'nullable', 'numeric', 'min:20', 'max:500', 'decimal:0,2'],
            'current_weight_kg' => ['sometimes', 'numeric', 'min:20', 'max:500', 'decimal:0,2'],
            'target_weight_kg' => ['sometimes', 'nullable', 'numeric', 'min:20', 'max:500', 'decimal:0,2'],
            'activity_level' => ['sometimes', 'nullable', Rule::enum(ActivityLevel::class)],
            'goal' => ['sometimes', 'nullable', Rule::enum(GoalType::class)],
            'timezone' => ['sometimes', 'timezone:all'],
        ];
    }
}
