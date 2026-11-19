<?php

namespace App\Modules\SavedMeal\Models;

use App\Modules\Diary\Enums\ItemKind;
use App\Modules\Food\Models\Food;
use App\Modules\Food\Models\FoodPortion;
use App\Modules\Nutrition\Enums\QuantityUnit;
use App\Modules\Recipe\Models\Recipe;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavedMealItem extends Model
{
    public $timestamps = false;

    protected $fillable = ['saved_meal_id', 'kind', 'food_id', 'recipe_id', 'food_portion_id', 'quantity', 'unit', 'base_quantity', 'position'];

    protected function casts(): array
    {
        return [
            'kind' => ItemKind::class,
            'unit' => QuantityUnit::class,
            'quantity' => 'decimal:3',
            'base_quantity' => 'decimal:3',
        ];
    }

    /** @return BelongsTo<Food, $this> */
    public function food(): BelongsTo
    {
        return $this->belongsTo(Food::class)->withTrashed();
    }

    /** @return BelongsTo<Recipe, $this> */
    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class)->withTrashed();
    }

    /** @return BelongsTo<FoodPortion, $this> */
    public function portion(): BelongsTo
    {
        return $this->belongsTo(FoodPortion::class, 'food_portion_id');
    }
}
