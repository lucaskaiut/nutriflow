<?php

namespace App\Modules\Food\Models;

use Illuminate\Database\Eloquent\Model;

class FoodNutrient extends Model
{
    public $timestamps = false;

    protected $fillable = ['food_id', 'nutrient', 'amount', 'unit'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:4'];
    }
}
