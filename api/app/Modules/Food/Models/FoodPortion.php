<?php

namespace App\Modules\Food\Models;

use App\Modules\Shared\Models\Concerns\HasUuid;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Builder;
use App\Modules\Shared\Contracts\OwnedByUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Medida caseira: "label" equivale a "amount" na unidade de referência do alimento. */
class FoodPortion extends Model implements OwnedByUser
{
    use HasUuid;

    protected $fillable = ['food_id', 'user_id', 'label', 'amount'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:3'];
    }

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return $query->where(fn (Builder $q) => $q->whereNull('food_portions.user_id')->orWhere('food_portions.user_id', $user->id));
    }

    public function isOwnedBy(User $user): bool
    {
        return $this->user_id !== null && (int) $this->user_id === (int) $user->id;
    }

    /** @return BelongsTo<Food, $this> */
    public function food(): BelongsTo
    {
        return $this->belongsTo(Food::class)->withTrashed();
    }
}
