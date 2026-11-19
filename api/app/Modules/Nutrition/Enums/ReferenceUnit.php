<?php

namespace App\Modules\Nutrition\Enums;

/** Unidade em que os nutrientes de um alimento são expressos (ex.: por 100 g). */
enum ReferenceUnit: string
{
    case GRAM = 'g';
    case MILLILITER = 'ml';
    case UNIT = 'un';

    /**
     * Unidades de entrada aceitas para um alimento com esta referência
     * ("portion" = medida caseira cadastrada para o alimento).
     *
     * @return list<QuantityUnit>
     */
    public function acceptedUnits(): array
    {
        return match ($this) {
            self::GRAM => [QuantityUnit::GRAM, QuantityUnit::KILOGRAM, QuantityUnit::PORTION],
            self::MILLILITER => [QuantityUnit::MILLILITER, QuantityUnit::LITER, QuantityUnit::PORTION],
            self::UNIT => [QuantityUnit::UNIT, QuantityUnit::PORTION],
        };
    }
}
