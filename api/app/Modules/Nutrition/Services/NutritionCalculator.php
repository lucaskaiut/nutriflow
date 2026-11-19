<?php

namespace App\Modules\Nutrition\Services;

use App\Modules\Diary\Enums\ItemKind;
use App\Modules\Food\Models\Food;
use App\Modules\Recipe\Models\Recipe;
use App\Modules\Recipe\Models\RecipeIngredient;
use App\Modules\SavedMeal\Models\SavedMeal;
use App\Modules\SavedMeal\Models\SavedMealItem;
use App\Modules\Nutrition\Support\Nutrients;
use Brick\Math\BigDecimal;
use Brick\Math\BigNumber;

/**
 * Único ponto de cálculo nutricional do sistema.
 *
 *  alimento:  nutriente × quantidade_na_referência / quantidade_de_referência
 *  receita:   total = Σ ingredientes;  por porção = total / porções
 *  consumo:   por porção × porções consumidas (independente do rendimento)
 */
final class NutritionCalculator
{
    public function forFood(Food $food, BigNumber|string $referenceQuantity): Nutrients
    {
        return $food->nutrients()->scale($referenceQuantity, (string) $food->reference_amount);
    }

    public function ingredient(RecipeIngredient $ingredient): Nutrients
    {
        return $this->forFood($ingredient->food, (string) $ingredient->base_quantity);
    }

    /** Valor nutricional total da receita inteira. */
    public function recipeTotal(Recipe $recipe): Nutrients
    {
        $recipe->loadMissing('ingredients.food');

        return Nutrients::sum($recipe->ingredients->map(fn (RecipeIngredient $i) => $this->ingredient($i)));
    }

    /** Valor nutricional de 1 porção da receita. */
    public function recipePerServing(Recipe $recipe): Nutrients
    {
        return $this->recipeTotal($recipe)->dividedBy((string) $recipe->servings);
    }

    /** Consumo de N porções (ex.: 1,5) de uma receita. */
    public function recipeServings(Recipe $recipe, BigNumber|string $servings): Nutrients
    {
        return $this->recipePerServing($recipe)->scale($servings, 1);
    }

    public function savedMealItem(SavedMealItem $item): Nutrients
    {
        return $item->kind === ItemKind::RECIPE
            ? $this->recipeServings($item->recipe, (string) $item->base_quantity)
            : $this->forFood($item->food, (string) $item->base_quantity);
    }

    public function savedMealTotal(SavedMeal $meal): Nutrients
    {
        $meal->loadMissing(['items.food', 'items.recipe.ingredients.food']);

        return Nutrients::sum($meal->items->map(fn (SavedMealItem $i) => $this->savedMealItem($i)));
    }

    /** Reescala um snapshot (basis por basis_amount) para uma nova quantidade. */
    public function fromSnapshot(Nutrients $basis, BigNumber|string $baseQuantity, BigNumber|string $basisAmount): Nutrients
    {
        return $basis->scale($baseQuantity, $basisAmount)->orZero();
    }

    public static function decimal(BigNumber|int|string $value): BigDecimal
    {
        return BigDecimal::of($value);
    }
}
