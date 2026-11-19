<?php

namespace App\Modules\Nutrition\Enums;

/** Unidade em que a pessoa informa uma quantidade consumida ou usada em receita. */
enum QuantityUnit: string
{
    case GRAM = 'g';
    case KILOGRAM = 'kg';
    case MILLILITER = 'ml';
    case LITER = 'l';
    case UNIT = 'un';
    case PORTION = 'portion';   // medida caseira do alimento (food_portions)
    case SERVING = 'serving';   // porção de receita

    /** Fator para converter para a unidade de referência correspondente (g, ml, un). */
    public function factorToReference(): ?string
    {
        return match ($this) {
            self::GRAM, self::MILLILITER, self::UNIT => '1',
            self::KILOGRAM, self::LITER => '1000',
            self::PORTION, self::SERVING => null,
        };
    }

    /**
     * @return list<string>
     */
    public static function foodValues(): array
    {
        return array_values(array_map(
            fn (self $u) => $u->value,
            array_filter(self::cases(), fn (self $u) => $u !== self::SERVING),
        ));
    }
}
