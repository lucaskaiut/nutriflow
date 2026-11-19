<?php

namespace App\Modules\Nutrition\Services;

use App\Modules\Diary\Enums\ItemKind;
use App\Modules\Food\Models\Food;
use App\Modules\Food\Models\FoodPortion;
use App\Modules\Nutrition\Enums\QuantityUnit;
use App\Modules\Nutrition\Support\QuantityConverter;
use App\Modules\Nutrition\Support\ResolvedItem;
use App\Modules\Recipe\Models\Recipe;
use App\Modules\User\Models\User;
use Brick\Math\BigDecimal;
use Illuminate\Validation\ValidationException;

/**
 * Resolve itens recebidos da API (ids públicos) garantindo que pertencem/são visíveis à pessoa.
 * Nunca confia no id enviado pelo app sem checar a posse.
 */
final class ItemResolver
{
    public function __construct(private readonly QuantityConverter $converter) {}

    /**
     * @param  array{kind?: string, food_id?: ?string, recipe_id?: ?string, portion_id?: ?string, quantity: numeric, unit?: ?string}  $input
     */
    public function resolve(User $user, array $input, string $field = 'item', bool $allowRecipes = true, bool $allowTrashedFood = false): ResolvedItem
    {
        $kind = ItemKind::tryFrom($input['kind'] ?? 'food') ?? ItemKind::FOOD;
        $quantity = BigDecimal::of((string) $input['quantity']);

        if ($quantity->isNegativeOrZero()) {
            throw ValidationException::withMessages(["{$field}.quantity" => ['A quantidade deve ser maior que zero.']]);
        }

        if ($kind === ItemKind::RECIPE) {
            if (! $allowRecipes) {
                throw ValidationException::withMessages(["{$field}.kind" => ['Receitas não podem ser usadas aqui.']]);
            }

            $recipe = Recipe::query()->ownedBy($user)->where('uuid', $input['recipe_id'] ?? null)->first()
                ?? throw ValidationException::withMessages(["{$field}.recipe_id" => ['Receita não encontrada.']]);

            return new ResolvedItem(ItemKind::RECIPE, null, $recipe, null, $quantity, QuantityUnit::SERVING, $quantity);
        }

        $food = Food::query()
            ->when($allowTrashedFood, fn ($q) => $q->withTrashed())
            ->visibleTo($user)
            ->where('uuid', $input['food_id'] ?? null)
            ->first()
            ?? throw ValidationException::withMessages(["{$field}.food_id" => ['Alimento não encontrado.']]);

        $unit = QuantityUnit::tryFrom((string) ($input['unit'] ?? $food->reference_unit))
            ?? throw ValidationException::withMessages(["{$field}.unit" => ['Unidade inválida.']]);

        $portion = null;
        if (filled($input['portion_id'] ?? null)) {
            $portion = FoodPortion::query()->visibleTo($user)->where('uuid', $input['portion_id'])->first()
                ?? throw ValidationException::withMessages(["{$field}.portion_id" => ['Medida caseira não encontrada.']]);
        }

        $base = $this->converter->toReference($food, (string) $quantity, $unit, $portion, "{$field}.unit");

        return new ResolvedItem(ItemKind::FOOD, $food, null, $unit === QuantityUnit::PORTION ? $portion : null, $quantity, $unit, $base);
    }
}
