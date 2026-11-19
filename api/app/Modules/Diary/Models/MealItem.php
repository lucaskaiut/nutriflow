<?php

namespace App\Modules\Diary\Models;

use App\Modules\Diary\Enums\ItemKind;
use App\Modules\Nutrition\Enums\QuantityUnit;
use App\Modules\Nutrition\Support\Nutrients;
use App\Modules\Shared\Models\Concerns\HasUuid;
use App\Modules\Shared\Contracts\OwnedByUser;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Item do diário com snapshot nutricional (ver migration create_diary_tables). */
class MealItem extends Model implements OwnedByUser
{
    use HasUuid;

    protected $fillable = [
        'meal_id', 'kind', 'food_id', 'recipe_id', 'food_portion_id', 'name', 'portion_label',
        'quantity', 'unit', 'base_quantity', 'basis_amount', 'basis_unit',
        'basis_kcal', 'basis_protein_g', 'basis_carbs_g', 'basis_fat_g', 'basis_fiber_g',
        'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'position',
    ];

    protected function casts(): array
    {
        $decimal = array_fill_keys([
            'quantity', 'base_quantity', 'basis_amount', 'basis_kcal', 'basis_protein_g', 'basis_carbs_g',
            'basis_fat_g', 'basis_fiber_g', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g',
        ], 'decimal:3');

        return ['kind' => ItemKind::class, 'unit' => QuantityUnit::class] + $decimal;
    }

    public function isOwnedBy(User $user): bool
    {
        return $this->meal !== null && $this->meal->isOwnedBy($user);
    }

    public function basis(): Nutrients
    {
        return Nutrients::fromArray($this->getAttributes(), 'basis_');
    }

    public function totals(): Nutrients
    {
        return Nutrients::fromArray($this->getAttributes());
    }

    /** @return BelongsTo<\App\Modules\Food\Models\Food, $this> */
    public function food(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Food\Models\Food::class)->withTrashed();
    }

    /** @return BelongsTo<\App\Modules\Recipe\Models\Recipe, $this> */
    public function recipe(): BelongsTo
    {
        return $this->belongsTo(\App\Modules\Recipe\Models\Recipe::class)->withTrashed();
    }

    /** @return BelongsTo<Meal, $this> */
    public function meal(): BelongsTo
    {
        return $this->belongsTo(Meal::class);
    }
}
