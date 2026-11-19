<?php

namespace App\Modules\Nutrition\Support;

use App\Modules\Nutrition\Enums\QuantityUnit;
use Illuminate\Validation\Rule;

/** Regras de validação compartilhadas para itens (ingredientes, itens de refeição). */
final class ItemRules
{
    /**
     * @return array<string, mixed>
     */
    public static function for(string $prefix, bool $allowRecipes = true): array
    {
        $kinds = $allowRecipes ? ['food', 'recipe'] : ['food'];

        return [
            "{$prefix}.kind" => ['sometimes', Rule::in($kinds)],
            "{$prefix}.food_id" => ["required_unless:{$prefix}.kind,recipe", 'nullable', 'uuid'],
            "{$prefix}.recipe_id" => $allowRecipes ? ["required_if:{$prefix}.kind,recipe", 'nullable', 'uuid'] : ['prohibited'],
            "{$prefix}.portion_id" => ["required_if:{$prefix}.unit,portion", 'nullable', 'uuid'],
            "{$prefix}.quantity" => ['required', 'numeric', 'gt:0', 'max:100000', 'decimal:0,3'],
            "{$prefix}.unit" => ['sometimes', 'nullable', Rule::in([...QuantityUnit::foodValues(), QuantityUnit::SERVING->value])],
        ];
    }
}
