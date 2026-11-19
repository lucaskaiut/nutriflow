<?php

namespace App\Modules\Account\Enums;

enum ActivityLevel: string
{
    case SEDENTARY = 'sedentary';
    case LIGHT = 'light';
    case MODERATE = 'moderate';
    case ACTIVE = 'active';
    case VERY_ACTIVE = 'very_active';

    public function label(): string
    {
        return match ($this) {
            self::SEDENTARY => 'Sedentário',
            self::LIGHT => 'Levemente ativo',
            self::MODERATE => 'Moderadamente ativo',
            self::ACTIVE => 'Muito ativo',
            self::VERY_ACTIVE => 'Extremamente ativo',
        };
    }

    /** Fatores de atividade usuais aplicados à taxa metabólica basal (estimativa). */
    public function factor(): string
    {
        return match ($this) {
            self::SEDENTARY => '1.2',
            self::LIGHT => '1.375',
            self::MODERATE => '1.55',
            self::ACTIVE => '1.725',
            self::VERY_ACTIVE => '1.9',
        };
    }
}
