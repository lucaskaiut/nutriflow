<?php

namespace App\Modules\SavedMeal\Http\Resources;

use App\Modules\Diary\Enums\ItemKind;
use App\Modules\Nutrition\Services\NutritionCalculator;
use App\Modules\SavedMeal\Models\SavedMeal;
use App\Modules\SavedMeal\Models\SavedMealItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin SavedMeal */
class SavedMealResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $calc = app(NutritionCalculator::class);

        return [
            'id' => $this->uuid,
            'name' => $this->name,
            'description' => $this->description,
            'meal_type' => $this->meal_type?->value,
            'is_favorite' => $this->is_favorite,
            'nutrition' => $calc->savedMealTotal($this->resource)->toApi(),
            'items' => $this->items->map(function (SavedMealItem $i) use ($calc) {
                $source = $i->kind === ItemKind::RECIPE ? $i->recipe : $i->food;

                return [
                    'kind' => $i->kind->value,
                    'food_id' => $i->food?->uuid,
                    'recipe_id' => $i->recipe?->uuid,
                    'name' => $source?->name ?? 'Item removido',
                    'reference_unit' => $i->food?->reference_unit,
                    'quantity' => (float) $i->quantity,
                    'unit' => $i->unit->value,
                    'portion' => $i->portion ? ['id' => $i->portion->uuid, 'label' => $i->portion->label, 'amount' => (float) $i->portion->amount] : null,
                    'is_available' => $source !== null && ! $source->trashed(),
                    'nutrients' => $calc->savedMealItem($i)->toApi(),
                ];
            })->values(),
        ];
    }
}
