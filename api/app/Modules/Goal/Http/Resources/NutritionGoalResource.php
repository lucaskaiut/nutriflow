<?php

namespace App\Modules\Goal\Http\Resources;

use App\Modules\Goal\Models\NutritionGoal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin NutritionGoal */
class NutritionGoalResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'kcal' => $this->kcal,
            'protein_g' => (float) $this->protein_g,
            'carbs_g' => (float) $this->carbs_g,
            'fat_g' => (float) $this->fat_g,
            'water_ml' => $this->water_ml,
            'mode' => $this->mode->value,
            'effective_from' => $this->effective_from->toDateString(),
        ];
    }
}
