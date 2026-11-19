<?php

namespace App\Modules\Account\Services;

use App\Modules\Account\Models\Profile;
use App\Modules\Account\Models\UserPreference;
use App\Modules\Account\Support\UserClock;
use App\Modules\Goal\Enums\GoalMode;
use App\Modules\Goal\Services\EnergyEstimator;
use App\Modules\Goal\Services\GoalService;
use App\Modules\Goal\Support\EnergyEstimate;
use App\Modules\Tracking\Services\WeightService;
use App\Modules\User\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class ProfileService
{
    public function __construct(
        private readonly WeightService $weights,
        private readonly GoalService $goals,
        private readonly EnergyEstimator $estimator,
        private readonly UserClock $clock,
    ) {}

    public function profileOf(User $user): Profile
    {
        return $user->profile ?? $user->profile()->create([]);
    }

    public function preferencesOf(User $user): UserPreference
    {
        return $user->preferences ?? $user->preferences()->create([]);
    }

    /**
     * Atualiza nome e dados do perfil. "Peso atual" nunca sobrescreve histórico:
     * se informado e diferente do atual, vira uma nova pesagem com a data de hoje.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(User $user, array $data): User
    {
        DB::transaction(function () use ($user, $data) {
            if (array_key_exists('name', $data)) {
                $user->forceFill(['name' => trim((string) $data['name'])])->save();
            }

            $profile = $this->profileOf($user);
            $profile->fill(collect($data)->only([
                'birth_date', 'sex', 'height_cm', 'initial_weight_kg', 'target_weight_kg', 'activity_level', 'goal', 'timezone',
            ])->all())->save();
            $user->setRelation('profile', $profile);

            if (isset($data['current_weight_kg'])) {
                $latest = $this->weights->latest($user);
                if ($latest === null || bccomp((string) $latest->weight_kg, (string) $data['current_weight_kg'], 2) !== 0) {
                    $this->weights->create($user, ['weight_kg' => $data['current_weight_kg']]);
                }
            }
        });

        return $user->refresh()->load('profile', 'preferences');
    }

    /**
     * Conclui o onboarding: grava o perfil, a pesagem inicial e (se possível) metas estimadas.
     *
     * @param  array<string, mixed>  $data
     */
    public function completeOnboarding(User $user, array $data): User
    {
        return DB::transaction(function () use ($user, $data) {
            $hasWeights = $this->weights->latest($user) !== null;

            $this->update($user, [
                ...$data,
                'initial_weight_kg' => $data['initial_weight_kg'] ?? $data['current_weight_kg'] ?? null,
            ]);

            if (! $hasWeights && isset($data['current_weight_kg']) && $this->weights->latest($user) === null) {
                $this->weights->create($user, ['weight_kg' => $data['current_weight_kg']]);
            }

            $estimate = $this->estimate($user->refresh());
            if (($data['apply_estimated_goals'] ?? true) && $estimate->available && $this->goals->current($user) === null) {
                $this->goals->set($user, [
                    'kcal' => $estimate->kcal,
                    'protein_g' => $estimate->proteinG,
                    'carbs_g' => $estimate->carbsG,
                    'fat_g' => $estimate->fatG,
                    'water_ml' => $estimate->waterMl,
                ], GoalMode::ESTIMATED);
            }

            $this->profileOf($user)->forceFill(['onboarded_at' => now()])->save();

            return $user->refresh()->load('profile', 'preferences');
        });
    }

    public function estimate(User $user): EnergyEstimate
    {
        $profile = $this->profileOf($user);
        $current = $this->weights->latest($user)?->weight_kg ?? $profile->initial_weight_kg;

        return $this->estimator->estimate(
            sex: $profile->sex,
            birthDate: $profile->birth_date ? CarbonImmutable::parse($profile->birth_date) : null,
            heightCm: $profile->height_cm !== null ? (string) $profile->height_cm : null,
            weightKg: $current !== null ? (string) $current : null,
            activity: $profile->activity_level,
            goal: $profile->goal,
            today: CarbonImmutable::parse($this->clock->today($user)),
            targetWeightKg: $profile->target_weight_kg !== null ? (string) $profile->target_weight_kg : null,
        );
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updatePreferences(User $user, array $data): UserPreference
    {
        $prefs = $this->preferencesOf($user);
        $prefs->fill(collect($data)->only(['theme', 'weight_unit', 'length_unit', 'meal_reminders', 'water_reminders', 'weight_reminder'])->all())->save();

        return $prefs->refresh();
    }
}
