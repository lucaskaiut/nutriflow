<?php

namespace App\Modules\Tracking\Http\Resources;

use App\Modules\Tracking\Models\WeightEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin WeightEntry */
class WeightEntryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'weight_kg' => (float) $this->weight_kg,
            'measured_on' => $this->measured_on->toDateString(),
            'measured_at' => $this->measured_at ? substr((string) $this->measured_at, 0, 5) : null,
            'notes' => $this->notes,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
