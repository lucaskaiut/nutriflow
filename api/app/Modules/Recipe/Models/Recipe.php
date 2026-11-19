<?php

namespace App\Modules\Recipe\Models;

use App\Modules\Shared\Models\Concerns\HasUuid;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Builder;
use App\Modules\Shared\Contracts\OwnedByUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Receita. Os nutrientes são sempre derivados dos ingredientes (ver NutritionCalculator);
 * arquivar esconde da lista sem excluir; excluir é soft delete (o diário guarda snapshots).
 */
class Recipe extends Model implements OwnedByUser
{
    use HasUuid;
    use SoftDeletes;

    protected $fillable = [
        'user_id', 'name', 'description', 'photo_path', 'servings', 'yield_weight_g',
        'prep_time_minutes', 'instructions', 'is_favorite', 'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'servings' => 'decimal:2',
            'yield_weight_g' => 'decimal:1',
            'prep_time_minutes' => 'integer',
            'is_favorite' => 'boolean',
            'archived_at' => 'datetime',
        ];
    }

    public function scopeOwnedBy(Builder $query, User $user): Builder
    {
        return $query->where('recipes.user_id', $user->id);
    }

    public function isOwnedBy(User $user): bool
    {
        return (int) $this->user_id === (int) $user->id;
    }

    /** @return HasMany<RecipeIngredient, $this> */
    public function ingredients(): HasMany
    {
        return $this->hasMany(RecipeIngredient::class)->orderBy('position');
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
