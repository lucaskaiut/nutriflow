<?php

namespace App\Modules\Diary\Services;

use App\Modules\Diary\Enums\ItemKind;
use App\Modules\Nutrition\Services\NutritionCalculator;
use App\Modules\Nutrition\Support\Nutrients;
use App\Modules\Nutrition\Support\ResolvedItem;
use Brick\Math\BigDecimal;

/**
 * Monta os atributos de um meal_item a partir de um item resolvido, congelando
 * os valores nutricionais do momento (snapshot) — integridade histórica do diário.
 */
final class MealItemSnapshotter
{
    public function __construct(private readonly NutritionCalculator $calculator) {}

    /**
     * @return array<string, mixed>
     */
    public function attributes(ResolvedItem $item, int $position): array
    {
        if ($item->kind === ItemKind::RECIPE) {
            $recipe = $item->recipe;
            $basis = $this->calculator->recipePerServing($recipe);   // por 1 porção
            $basisAmount = BigDecimal::one();
            $basisUnit = 'serving';
            $name = $recipe->name;
            $portionLabel = null;
        } else {
            $food = $item->food;
            $basis = $food->nutrients();                              // por reference_amount
            $basisAmount = BigDecimal::of((string) $food->reference_amount);
            $basisUnit = $food->reference_unit;
            $name = $food->name;
            $portionLabel = $item->portion?->label;
        }

        $totals = $this->calculator->fromSnapshot($basis, $item->baseQuantity, $basisAmount);

        return [
            ...$item->toRow($position),
            'name' => $name,
            'portion_label' => $portionLabel,
            'basis_amount' => (string) $basisAmount,
            'basis_unit' => $basisUnit,
            ...$basis->toStorage('basis_'),
            ...$totals->toStorage(),
        ];
    }

    /**
     * Nova quantidade para um item já registrado: reescala o PRÓPRIO snapshot.
     *
     * @return array<string, string|null>
     */
    public function rescale(Nutrients $basis, BigDecimal $baseQuantity, string $basisAmount): array
    {
        return $this->calculator->fromSnapshot($basis, $baseQuantity, $basisAmount)->toStorage();
    }
}
