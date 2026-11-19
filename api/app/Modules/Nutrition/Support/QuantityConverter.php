<?php

namespace App\Modules\Nutrition\Support;

use App\Modules\Food\Models\Food;
use App\Modules\Food\Models\FoodPortion;
use App\Modules\Nutrition\Enums\QuantityUnit;
use Brick\Math\BigDecimal;
use Illuminate\Validation\ValidationException;

/**
 * Converte "quantidade + unidade (+ medida caseira)" para a unidade de referência do alimento.
 * Ex.: 1,5 kg de um alimento por 100 g => 1500 g; 2 × "fatia (25 g)" => 50 g.
 */
final class QuantityConverter
{
    public function toReference(Food $food, string $quantity, QuantityUnit $unit, ?FoodPortion $portion, string $field = 'unit'): BigDecimal
    {
        $amount = BigDecimal::of($quantity);

        if (! in_array($unit, $food->referenceUnit()->acceptedUnits(), true)) {
            throw ValidationException::withMessages([
                $field => ["A unidade \"{$unit->value}\" não é compatível com \"{$food->name}\" (referência em {$food->reference_unit})."],
            ]);
        }

        if ($unit === QuantityUnit::PORTION) {
            if ($portion === null || (int) $portion->food_id !== (int) $food->id) {
                throw ValidationException::withMessages([
                    $field => ['Selecione uma medida caseira válida para este alimento.'],
                ]);
            }

            return $amount->multipliedBy(BigDecimal::of($portion->amount));
        }

        return $amount->multipliedBy(BigDecimal::of($unit->factorToReference()));
    }
}
