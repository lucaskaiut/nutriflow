<?php

namespace App\Modules\Account\Http\Resources;

use App\Modules\Account\Models\Profile;
use App\Modules\Account\Models\UserPreference;
use App\Modules\User\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Conta da pessoa para o app: identidade, perfil e preferências.
 *
 * @mixin User
 */
class AccountResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Profile|null $profile */
        $profile = $this->profile;
        /** @var UserPreference|null $prefs */
        $prefs = $this->preferences;

        return [
            'id' => $this->uuid,
            'name' => $this->name,
            'email' => $this->email,
            'google_linked' => $this->google_id !== null,
            'onboarding_completed' => $profile?->onboarded_at !== null,
            'profile' => [
                'birth_date' => $profile?->birth_date?->toDateString(),
                'sex' => $profile?->sex?->value,
                'height_cm' => $profile?->height_cm !== null ? (float) $profile->height_cm : null,
                'initial_weight_kg' => $profile?->initial_weight_kg !== null ? (float) $profile->initial_weight_kg : null,
                'target_weight_kg' => $profile?->target_weight_kg !== null ? (float) $profile->target_weight_kg : null,
                'activity_level' => $profile?->activity_level?->value,
                'goal' => $profile?->goal?->value,
                'timezone' => $profile?->timezone,
            ],
            'preferences' => [
                'theme' => $prefs?->theme ?? 'system',
                'weight_unit' => $prefs?->weight_unit ?? 'kg',
                'length_unit' => $prefs?->length_unit ?? 'cm',
                'meal_reminders' => (bool) ($prefs?->meal_reminders ?? false),
                'water_reminders' => (bool) ($prefs?->water_reminders ?? false),
                'weight_reminder' => (bool) ($prefs?->weight_reminder ?? false),
            ],
        ];
    }
}
