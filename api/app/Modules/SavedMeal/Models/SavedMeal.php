<?php

namespace App\Modules\SavedMeal\Models;

use App\Modules\Diary\Enums\MealType;
use App\Modules\Shared\Models\Concerns\HasUuid;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Builder;
use App\Modules\Shared\Contracts\OwnedByUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Combinação de alimentos/receitas que a pessoa costuma consumir (não é uma preparação). */
class SavedMeal extends Model implements OwnedByUser
{
    use HasUuid;

    protected $fillable = ['user_id', 'name', 'description', 'meal_type', 'is_favorite'];

    protected function casts(): array
    {
        return [
            'meal_type' => MealType::class,
            'is_favorite' => 'boolean',
        ];
    }

    public function scopeOwnedBy(Builder $query, User $user): Builder
    {
        return $query->where('saved_meals.user_id', $user->id);
    }

    public function isOwnedBy(User $user): bool
    {
        return (int) $this->user_id === (int) $user->id;
    }

    /** @return HasMany<SavedMealItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(SavedMealItem::class)->orderBy('position');
    }
}
