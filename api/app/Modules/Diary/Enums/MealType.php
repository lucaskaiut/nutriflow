<?php

namespace App\Modules\Diary\Enums;

enum MealType: string
{
    case BREAKFAST = 'breakfast';
    case MORNING_SNACK = 'morning_snack';
    case LUNCH = 'lunch';
    case AFTERNOON_SNACK = 'afternoon_snack';
    case DINNER = 'dinner';
    case SUPPER = 'supper';
    case CUSTOM = 'custom';

    public function label(): string
    {
        return match ($this) {
            self::BREAKFAST => 'Café da manhã',
            self::MORNING_SNACK => 'Lanche da manhã',
            self::LUNCH => 'Almoço',
            self::AFTERNOON_SNACK => 'Lanche da tarde',
            self::DINNER => 'Jantar',
            self::SUPPER => 'Ceia',
            self::CUSTOM => 'Personalizada',
        };
    }

    /** Horário sugerido (HH:MM) quando a pessoa não informa. */
    public function defaultTime(): string
    {
        return match ($this) {
            self::BREAKFAST => '08:00',
            self::MORNING_SNACK => '10:30',
            self::LUNCH => '12:30',
            self::AFTERNOON_SNACK => '16:00',
            self::DINNER => '20:00',
            self::SUPPER => '22:00',
            self::CUSTOM => '12:00',
        };
    }
}
