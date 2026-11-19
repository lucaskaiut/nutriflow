<?php

namespace App\Modules\Food\Models;

use Illuminate\Database\Eloquent\Model;

class FoodFavorite extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'food_id'];
}
