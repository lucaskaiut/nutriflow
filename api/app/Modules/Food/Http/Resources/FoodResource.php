<?php

namespace App\Modules\Food\Http\Resources;

use App\Modules\Food\Models\Food;
use App\Modules\Food\Models\FoodNutrient;
use App\Modules\Food\Models\FoodPortion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Food */
class FoodResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $userId = $request->user()?->id;

        return [
            'id' => $this->uuid,
            'name' => $this->name,
            'description' => $this->description,
            'category' => $this->whenLoaded('category', fn () => $this->category ? ['slug' => $this->category->slug, 'name' => $this->category->name] : null),
            'source' => $this->source->value,
            'source_label' => $this->source->label(),
            'is_custom' => $this->user_id !== null,
            'is_owner' => $this->user_id !== null && (int) $this->user_id === (int) $userId,
            'is_favorite' => (bool) ($this->is_favorite ?? false),
            'is_deleted' => $this->trashed(),
            'reference_amount' => (float) $this->reference_amount,
            'reference_unit' => $this->reference_unit,
            'accepted_units' => array_map(fn ($u) => $u->value, $this->referenceUnit()->acceptedUnits()),
            'nutrients' => $this->nutrients()->toApi(),
            'extra_nutrients' => $this->whenLoaded('extraNutrients', fn () => $this->extraNutrients
                ->map(fn (FoodNutrient $n) => ['nutrient' => $n->nutrient, 'amount' => $n->amount !== null ? (float) $n->amount : null, 'unit' => $n->unit])
                ->values()),
            'portions' => $this->whenLoaded('portions', fn () => $this->portions
                ->map(fn (FoodPortion $p) => FoodPortionResource::make($p)->resolve($request))
                ->values()),
        ];
    }
}
