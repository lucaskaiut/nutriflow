<?php

namespace App\Modules\Tracking\Models;

use App\Modules\Shared\Models\Concerns\HasUuid;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Builder;
use App\Modules\Shared\Contracts\OwnedByUser;
use Illuminate\Database\Eloquent\Model;

class WeightEntry extends Model implements OwnedByUser
{
    use HasUuid;

    protected $fillable = ['user_id', 'measured_on', 'measured_at', 'weight_kg', 'notes'];

    protected function casts(): array
    {
        return [
            'measured_on' => 'date:Y-m-d',
            'weight_kg' => 'decimal:2',
        ];
    }

    public function scopeOwnedBy(Builder $query, User $user): Builder
    {
        return $query->where('weight_entries.user_id', $user->id);
    }

    /** Ordem cronológica real: data, horário (sem horário = início do dia) e, por fim, criação. */
    public function scopeChronological(Builder $query, string $direction = 'asc'): Builder
    {
        return $query->orderBy('measured_on', $direction)
            ->orderByRaw('COALESCE(measured_at, \'00:00:00\') '.($direction === 'desc' ? 'desc' : 'asc'))
            ->orderBy('id', $direction);
    }

    public function isOwnedBy(User $user): bool
    {
        return (int) $this->user_id === (int) $user->id;
    }
}
