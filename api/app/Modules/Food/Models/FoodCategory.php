<?php

namespace App\Modules\Food\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FoodCategory extends Model
{
    protected $fillable = ['slug', 'name', 'position'];

    /** @return HasMany<Food, $this> */
    public function foods(): HasMany
    {
        return $this->hasMany(Food::class);
    }
}
