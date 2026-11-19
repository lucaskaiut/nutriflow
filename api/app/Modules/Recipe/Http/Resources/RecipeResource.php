<?php

namespace App\Modules\Recipe\Http\Resources;

use App\Modules\Nutrition\Services\NutritionCalculator;
use App\Modules\Recipe\Models\Recipe;
use App\Modules\Recipe\Models\RecipeIngredient;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Recipe */
class RecipeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $calc = app(NutritionCalculator::class);
        $total = $calc->recipeTotal($this->resource);

        return [
            'id' => $this->uuid,
            'name' => $this->name,
            'description' => $this->description,
            'servings' => (float) $this->servings,
            'yield_weight_g' => $this->yield_weight_g !== null ? (float) $this->yield_weight_g : null,
            'prep_time_minutes' => $this->prep_time_minutes,
            'instructions' => $this->instructions,
            'is_favorite' => $this->is_favorite,
            'is_archived' => $this->archived_at !== null,
            'has_photo' => $this->photo_path !== null,
            'photo_version' => $this->photo_path ? substr(md5($this->photo_path), 0, 8) : null,
            'nutrition' => [
                'total' => $total->toApi(),
                'per_serving' => $total->dividedBy((string) $this->servings)->toApi(),
            ],
            'ingredients' => $this->ingredients->map(fn (RecipeIngredient $i) => [
                'food' => [
                    'id' => $i->food->uuid,
                    'name' => $i->food->name,
                    'reference_amount' => (float) $i->food->reference_amount,
                    'reference_unit' => $i->food->reference_unit,
                    'is_deleted' => $i->food->trashed(),
                ],
                'quantity' => (float) $i->quantity,
                'unit' => $i->unit->value,
                'portion' => $i->portion ? ['id' => $i->portion->uuid, 'label' => $i->portion->label, 'amount' => (float) $i->portion->amount] : null,
                'base_quantity' => (float) $i->base_quantity,
                'nutrients' => $calc->ingredient($i)->toApi(),
            ])->values(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
