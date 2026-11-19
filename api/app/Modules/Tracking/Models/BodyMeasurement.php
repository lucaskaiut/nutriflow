<?php

namespace App\Modules\Tracking\Models;

use App\Modules\Shared\Models\Concerns\HasUuid;
use App\Modules\Tracking\Enums\MeasurementType;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Builder;
use App\Modules\Shared\Contracts\OwnedByUser;
use Illuminate\Database\Eloquent\Model;

class BodyMeasurement extends Model implements OwnedByUser
{
    use HasUuid;

    protected $fillable = ['user_id', 'type', 'value', 'unit', 'measured_on', 'notes'];

    protected function casts(): array
    {
        return [
            'type' => MeasurementType::class,
            'value' => 'decimal:2',
            'measured_on' => 'date:Y-m-d',
        ];
    }

    public function scopeOwnedBy(Builder $query, User $user): Builder
    {
        return $query->where('body_measurements.user_id', $user->id);
    }

    public function isOwnedBy(User $user): bool
    {
        return (int) $this->user_id === (int) $user->id;
    }
}
