<?php

namespace App\Modules\Diary\Services;

use App\Modules\Account\Support\UserClock;
use App\Modules\Diary\Enums\ItemKind;
use App\Modules\Diary\Enums\MealType;
use App\Modules\Diary\Models\Meal;
use App\Modules\Diary\Models\MealItem;
use App\Modules\Food\Models\Food;
use App\Modules\Food\Models\FoodPortion;
use App\Modules\Nutrition\Enums\QuantityUnit;
use App\Modules\Nutrition\Services\ItemResolver;
use App\Modules\Nutrition\Support\Nutrients;
use App\Modules\Nutrition\Support\QuantityConverter;
use App\Modules\User\Models\User;
use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class MealService
{
    public function __construct(
        private readonly UserClock $clock,
        private readonly ItemResolver $resolver,
        private readonly MealItemSnapshotter $snapshotter,
        private readonly QuantityConverter $converter,
    ) {}

    /**
     * Refeições de um dia local, em ordem de horário.
     *
     * @return Collection<int, Meal>
     */
    public function day(User $user, string $date): Collection
    {
        return Meal::query()->ownedBy($user)
            ->where('date', $date)
            ->with('items.food', 'items.recipe')
            ->orderBy('time')->orderBy('id')
            ->get();
    }

    /**
     * @param  Collection<int, Meal>  $meals
     */
    public function totals(Collection $meals): Nutrients
    {
        return Nutrients::sum($meals->map(fn (Meal $m) => $m->totals()));
    }

    /**
     * Totais diários de um intervalo (somente dias com refeições).
     *
     * @return array<string, Nutrients>
     */
    public function dailyTotals(User $user, string $from, string $to): array
    {
        $rows = DB::table('meal_items')
            ->join('meals', 'meals.id', '=', 'meal_items.meal_id')
            ->where('meals.user_id', $user->id)
            ->whereBetween('meals.date', [$from, $to])
            ->groupBy('meals.date')
            ->orderBy('meals.date')
            ->selectRaw('meals.date as date, SUM(meal_items.kcal) as kcal, SUM(meal_items.protein_g) as protein_g, SUM(meal_items.carbs_g) as carbs_g, SUM(meal_items.fat_g) as fat_g, SUM(meal_items.fiber_g) as fiber_g')
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $out[\Carbon\CarbonImmutable::parse($row->date)->toDateString()] = Nutrients::fromArray((array) $row);
        }

        return $out;
    }

    /**
     * Datas (no intervalo) com ao menos uma refeição registrada.
     *
     * @return list<string>
     */
    public function datesWithMeals(User $user, string $from, string $to): array
    {
        return Meal::query()->ownedBy($user)
            ->whereBetween('date', [$from, $to])
            ->distinct()->orderBy('date')
            ->pluck('date')
            ->map(fn ($d) => \Carbon\CarbonImmutable::parse($d)->toDateString())
            ->values()->all();
    }

    /**
     * @param  array{date?: string, time?: ?string, type: string, custom_name?: ?string, notes?: ?string, items?: list<array<string, mixed>>}  $data
     */
    public function create(User $user, array $data): Meal
    {
        $type = MealType::from($data['type']);

        return DB::transaction(function () use ($user, $data, $type) {
            $meal = Meal::query()->create([
                'user_id' => $user->id,
                'date' => $data['date'] ?? $this->clock->today($user),
                'time' => $data['time'] ?? $type->defaultTime(),
                'type' => $type,
                'custom_name' => $type === MealType::CUSTOM ? ($data['custom_name'] ?? null) : null,
                'notes' => $data['notes'] ?? null,
            ]);

            $this->appendItems($user, $meal, $data['items'] ?? []);

            return $meal->load('items.food', 'items.recipe');
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Meal $meal, array $data): Meal
    {
        $attrs = collect($data)->only(['date', 'time', 'type', 'custom_name', 'notes'])->all();
        $type = isset($attrs['type']) ? MealType::from($attrs['type']) : $meal->type;
        if ($type !== MealType::CUSTOM) {
            $attrs['custom_name'] = null;
        }

        $meal->fill($attrs)->save();

        return $meal->refresh()->load('items.food', 'items.recipe');
    }

    public function delete(Meal $meal): void
    {
        $meal->delete(); // itens em cascata
    }

    /**
     * Duplica a refeição (com os mesmos snapshots) para outra data/período.
     *
     * @param  array{date?: string, time?: ?string, type?: string}  $data
     */
    public function duplicate(Meal $meal, array $data): Meal
    {
        return DB::transaction(function () use ($meal, $data) {
            $copy = $meal->replicate(['uuid']);
            $copy->fill(array_filter([
                'date' => $data['date'] ?? null,
                'time' => $data['time'] ?? null,
                'type' => $data['type'] ?? null,
            ]))->save();

            foreach ($meal->items as $item) {
                $copy->items()->create($item->replicate(['uuid', 'meal_id'])->getAttributes());
            }

            return $copy->load('items.food', 'items.recipe');
        });
    }

    /**
     * @param  list<array<string, mixed>>  $items
     */
    public function addItems(User $user, Meal $meal, array $items): Meal
    {
        DB::transaction(fn () => $this->appendItems($user, $meal, $items));

        return $meal->refresh()->load('items.food', 'items.recipe');
    }

    /**
     * Altera a quantidade (e opcionalmente a unidade/medida) de um item, reescalando o snapshot.
     *
     * @param  array{quantity: numeric, unit?: ?string, portion_id?: ?string}  $data
     */
    public function updateItem(User $user, MealItem $item, array $data): MealItem
    {
        $quantity = BigDecimal::of((string) $data['quantity']);
        if ($quantity->isNegativeOrZero()) {
            throw ValidationException::withMessages(['quantity' => ['A quantidade deve ser maior que zero.']]);
        }

        $unit = isset($data['unit']) ? QuantityUnit::from($data['unit']) : $item->unit;
        $portionId = $item->food_portion_id;
        $portionLabel = $item->portion_label;

        if ($item->kind === ItemKind::RECIPE) {
            $base = $quantity; // porções consumidas
            $unit = QuantityUnit::SERVING;
        } elseif ($unit === $item->unit && ! isset($data['portion_id'])) {
            // mesma unidade: proporcional ao registro original (funciona mesmo se o alimento foi removido)
            $base = BigDecimal::of((string) $item->base_quantity)
                ->multipliedBy($quantity)
                ->dividedBy(BigDecimal::of((string) $item->quantity), 6, RoundingMode::HalfUp);
        } else {
            $food = $item->food_id ? Food::query()->withTrashed()->find($item->food_id) : null;
            if ($food === null) {
                throw ValidationException::withMessages(['unit' => ['O alimento original não existe mais; altere apenas a quantidade.']]);
            }
            $portion = null;
            if ($unit === QuantityUnit::PORTION) {
                $portion = FoodPortion::query()->visibleTo($user)->where('uuid', $data['portion_id'] ?? null)->first();
            }
            $base = $this->converter->toReference($food, (string) $quantity, $unit, $portion);
            $portionId = $portion?->id;
            $portionLabel = $portion?->label;
        }

        $item->fill([
            'quantity' => (string) $quantity,
            'unit' => $unit,
            'food_portion_id' => $portionId,
            'portion_label' => $portionLabel,
            'base_quantity' => (string) $base->toScale(3, RoundingMode::HalfUp),
            ...$this->snapshotter->rescale($item->basis(), $base, (string) $item->basis_amount),
        ])->save();

        return $item->refresh();
    }

    public function deleteItem(MealItem $item): void
    {
        $item->delete();
    }

    /**
     * @param  list<array<string, mixed>>  $items
     */
    private function appendItems(User $user, Meal $meal, array $items): void
    {
        $position = (int) $meal->items()->max('position') + ($meal->items()->exists() ? 1 : 0);

        foreach (array_values($items) as $i => $input) {
            $resolved = $this->resolver->resolve($user, $input, "items.{$i}");
            $meal->items()->create($this->snapshotter->attributes($resolved, $position + $i));
        }
    }
}
