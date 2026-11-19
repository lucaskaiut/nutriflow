<?php

namespace App\Modules\Food\Models;

use App\Modules\Food\Enums\FoodSource;
use App\Modules\Nutrition\Enums\ReferenceUnit;
use App\Modules\Nutrition\Support\Nutrients;
use App\Modules\Shared\Models\Concerns\HasUuid;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Alimento. user_id NULL = base de referência (somente leitura); preenchido = personalizado.
 *
 * @property string $reference_amount
 * @property string $reference_unit
 */
class Food extends Model
{
    use HasUuid;
    use SoftDeletes;

    protected $table = 'foods';

    protected $fillable = [
        'user_id', 'food_category_id', 'source', 'source_ref', 'name', 'description',
        'reference_amount', 'reference_unit', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g',
    ];

    protected function casts(): array
    {
        return [
            'source' => FoodSource::class,
            'reference_amount' => 'decimal:3',
            'kcal' => 'decimal:3',
            'protein_g' => 'decimal:3',
            'carbs_g' => 'decimal:3',
            'fat_g' => 'decimal:3',
            'fiber_g' => 'decimal:3',
        ];
    }

    /** Alimentos que a pessoa pode ver/usar: base de referência + os próprios. */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        return $query->where(fn (Builder $q) => $q->whereNull('foods.user_id')->orWhere('foods.user_id', $user->id));
    }

    public function isCustom(): bool
    {
        return $this->user_id !== null;
    }

    public function isOwnedBy(User $user): bool
    {
        return $this->user_id !== null && (int) $this->user_id === (int) $user->id;
    }

    public function isVisibleTo(User $user): bool
    {
        return $this->user_id === null || $this->isOwnedBy($user);
    }

    public function referenceUnit(): ReferenceUnit
    {
        return ReferenceUnit::from($this->reference_unit);
    }

    /** Nutrientes por reference_amount da reference_unit. */
    public function nutrients(): Nutrients
    {
        return Nutrients::fromArray($this->only(Nutrients::KEYS));
    }

    /** @return BelongsTo<FoodCategory, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(FoodCategory::class, 'food_category_id');
    }

    /** @return HasMany<FoodNutrient, $this> */
    public function extraNutrients(): HasMany
    {
        return $this->hasMany(FoodNutrient::class);
    }

    /** @return HasMany<FoodPortion, $this> */
    public function portions(): HasMany
    {
        return $this->hasMany(FoodPortion::class);
    }

    /** @return HasMany<FoodFavorite, $this> */
    public function favorites(): HasMany
    {
        return $this->hasMany(FoodFavorite::class);
    }
}
