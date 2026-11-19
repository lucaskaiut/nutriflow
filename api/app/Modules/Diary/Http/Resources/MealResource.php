<?php

namespace App\Modules\Diary\Http\Resources;

use App\Modules\Diary\Models\Meal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Meal */
class MealResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'date' => $this->date->toDateString(),
            'time' => substr((string) $this->time, 0, 5),
            'type' => $this->type->value,
            'title' => $this->title(),
            'custom_name' => $this->custom_name,
            'notes' => $this->notes,
            'totals' => $this->totals()->toApi(),
            'items' => MealItemResource::collection($this->items),
        ];
    }
}
