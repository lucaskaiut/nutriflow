<?php

namespace App\Modules\Account\Models;

use Illuminate\Database\Eloquent\Model;

class UserPreference extends Model
{
    protected $fillable = ['user_id', 'theme', 'weight_unit', 'length_unit', 'meal_reminders', 'water_reminders', 'weight_reminder'];

    protected $attributes = [
        'theme' => 'system',
        'weight_unit' => 'kg',
        'length_unit' => 'cm',
        'meal_reminders' => false,
        'water_reminders' => false,
        'weight_reminder' => false,
    ];

    protected function casts(): array
    {
        return [
            'meal_reminders' => 'boolean',
            'water_reminders' => 'boolean',
            'weight_reminder' => 'boolean',
        ];
    }
}
