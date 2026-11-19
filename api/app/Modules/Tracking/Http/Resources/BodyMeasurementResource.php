<?php

namespace App\Modules\Tracking\Http\Resources;

use App\Modules\Tracking\Models\BodyMeasurement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin BodyMeasurement */
class BodyMeasurementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'type' => $this->type->value,
            'label' => $this->type->label(),
            'value' => (float) $this->value,
            'unit' => $this->unit,
            'measured_on' => $this->measured_on->toDateString(),
            'notes' => $this->notes,
        ];
    }
}
