<?php

namespace App\Modules\Account\Models;

use App\Modules\Account\Enums\ActivityLevel;
use App\Modules\Account\Enums\GoalType;
use App\Modules\Account\Enums\Sex;
use Illuminate\Database\Eloquent\Model;

class Profile extends Model
{
    protected $fillable = [
        'user_id', 'birth_date', 'sex', 'height_cm', 'initial_weight_kg', 'target_weight_kg',
        'activity_level', 'goal', 'timezone', 'onboarded_at',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date:Y-m-d',
            'sex' => Sex::class,
            'height_cm' => 'decimal:1',
            'initial_weight_kg' => 'decimal:2',
            'target_weight_kg' => 'decimal:2',
            'activity_level' => ActivityLevel::class,
            'goal' => GoalType::class,
            'onboarded_at' => 'datetime',
        ];
    }
}
