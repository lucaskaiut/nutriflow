<?php

namespace App\Modules\Account\Enums;

enum GoalType: string
{
    case LOSE_WEIGHT = 'lose_weight';
    case MAINTAIN_WEIGHT = 'maintain_weight';
    case GAIN_WEIGHT = 'gain_weight';
    case GAIN_MUSCLE = 'gain_muscle';

    public function label(): string
    {
        return match ($this) {
            self::LOSE_WEIGHT => 'Emagrecimento',
            self::MAINTAIN_WEIGHT => 'Manutenção',
            self::GAIN_WEIGHT => 'Ganho de peso',
            self::GAIN_MUSCLE => 'Ganho de massa muscular',
        };
    }
}
