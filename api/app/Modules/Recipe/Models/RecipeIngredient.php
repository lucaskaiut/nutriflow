<?php

namespace App\Modules\Recipe\Models;

use App\Modules\Food\Models\Food;
use App\Modules\Food\Models\FoodPortion;
use App\Modules\Nutrition\Enums\QuantityUnit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecipeIngredient extends Model
{
    public $timestamps = false;

    protected $fillable = ['recipe_id', 'food_id', 'food_portion_id', 'quantity', 'unit', 'base_quantity', 'position'];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',
            'base_quantity' => 'decimal:3',
            'unit' => QuantityUnit::class,
        ];
    }

    /** @return BelongsTo<Food, $this> */
    public function food(): BelongsTo
    {
        return $this->belongsTo(Food::class)->withTrashed();
    }

    /** @return BelongsTo<FoodPortion, $this> */
    public function portion(): BelongsTo
    {
        return $this->belongsTo(FoodPortion::class, 'food_portion_id');
    }
}
