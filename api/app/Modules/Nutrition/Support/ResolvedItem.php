<?php

namespace App\Modules\Nutrition\Support;

use App\Modules\Diary\Enums\ItemKind;
use App\Modules\Food\Models\Food;
use App\Modules\Food\Models\FoodPortion;
use App\Modules\Nutrition\Enums\QuantityUnit;
use App\Modules\Recipe\Models\Recipe;
use Brick\Math\BigDecimal;

/** Item (alimento ou receita) já validado, autorizado e convertido para a unidade base. */
final readonly class ResolvedItem
{
    public function __construct(
        public ItemKind $kind,
        public ?Food $food,
        public ?Recipe $recipe,
        public ?FoodPortion $portion,
        public BigDecimal $quantity,
        public QuantityUnit $unit,
        public BigDecimal $baseQuantity,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toRow(int $position): array
    {
        return [
            'kind' => $this->kind,
            'food_id' => $this->food?->id,
            'recipe_id' => $this->recipe?->id,
            'food_portion_id' => $this->portion?->id,
            'quantity' => (string) $this->quantity,
            'unit' => $this->unit,
            'base_quantity' => (string) $this->baseQuantity->toScale(3, \Brick\Math\RoundingMode::HalfUp),
            'position' => $position,
        ];
    }
}
