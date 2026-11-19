<?php

namespace App\Modules\Food\Enums;

enum FoodSource: string
{
    /** Tabela Brasileira de Composição de Alimentos — NEPA/UNICAMP, 4ª ed. revisada e ampliada (2011). */
    case TACO = 'taco';
    case CUSTOM = 'custom';

    public function label(): string
    {
        return match ($this) {
            self::TACO => 'TACO 4ª ed. (NEPA/UNICAMP)',
            self::CUSTOM => 'Personalizado',
        };
    }
}
