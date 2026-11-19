<?php

namespace App\Modules\Tracking\Models;

use App\Modules\Shared\Models\Concerns\HasUuid;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Builder;
use App\Modules\Shared\Contracts\OwnedByUser;
use Illuminate\Database\Eloquent\Model;

class WaterEntry extends Model implements OwnedByUser
{
    use HasUuid;

    protected $fillable = ['user_id', 'date', 'time', 'amount_ml'];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'amount_ml' => 'integer',
        ];
    }

    public function scopeOwnedBy(Builder $query, User $user): Builder
    {
        return $query->where('water_entries.user_id', $user->id);
    }

    public function isOwnedBy(User $user): bool
    {
        return (int) $this->user_id === (int) $user->id;
    }
}
