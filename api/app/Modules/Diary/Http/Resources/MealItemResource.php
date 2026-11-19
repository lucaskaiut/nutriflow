<?php

namespace App\Modules\Diary\Http\Resources;

use App\Modules\Diary\Models\MealItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin MealItem */
class MealItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'kind' => $this->kind->value,
            'food_id' => $this->whenLoaded('food', fn () => $this->food?->uuid),
            'recipe_id' => $this->whenLoaded('recipe', fn () => $this->recipe?->uuid),
            'name' => $this->name,
            'quantity' => (float) $this->quantity,
            'unit' => $this->unit->value,
            'portion_label' => $this->portion_label,
            'base_quantity' => (float) $this->base_quantity,
            'basis' => [
                'amount' => (float) $this->basis_amount,
                'unit' => $this->basis_unit,
                'nutrients' => $this->basis()->toApi(),
            ],
            'nutrients' => $this->totals()->toApi(),
        ];
    }
}
