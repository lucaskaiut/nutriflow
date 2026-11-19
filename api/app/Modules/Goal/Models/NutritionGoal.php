<?php

namespace App\Modules\Goal\Models;

use App\Modules\Goal\Enums\GoalMode;
use Illuminate\Database\Eloquent\Model;

/** Meta diária vigente a partir de effective_from (histórico preservado). */
class NutritionGoal extends Model
{
    protected $fillable = ['user_id', 'effective_from', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'water_ml', 'mode'];

    protected function casts(): array
    {
        return [
            'effective_from' => 'date:Y-m-d',
            'kcal' => 'integer',
            'protein_g' => 'decimal:1',
            'carbs_g' => 'decimal:1',
            'fat_g' => 'decimal:1',
            'water_ml' => 'integer',
            'mode' => GoalMode::class,
        ];
    }
}
