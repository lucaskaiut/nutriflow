<?php

namespace App\Modules\Food\Http\Resources;

use App\Modules\Food\Models\FoodPortion;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin FoodPortion */
class FoodPortionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'label' => $this->label,
            'amount' => (float) $this->amount,
            'is_custom' => $this->user_id !== null,
        ];
    }
}
