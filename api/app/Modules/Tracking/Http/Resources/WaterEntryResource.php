<?php

namespace App\Modules\Tracking\Http\Resources;

use App\Modules\Tracking\Models\WaterEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin WaterEntry */
class WaterEntryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'amount_ml' => $this->amount_ml,
            'date' => $this->date->toDateString(),
            'time' => substr((string) $this->time, 0, 5),
        ];
    }
}
