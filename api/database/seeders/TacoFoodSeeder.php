<?php

namespace Database\Seeders;

use App\Modules\Food\Enums\FoodSource;
use App\Modules\Food\Models\Food;
use App\Modules\Food\Models\FoodCategory;
use App\Modules\Food\Models\FoodNutrient;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Importa a TACO 4ª ed. (database/data/taco, ver README). Idempotente: atualiza pelo id da fonte.
 * Valores vazios na fonte permanecem NULL — nada é estimado.
 */
class TacoFoodSeeder extends Seeder
{
    private const EXTRA = [
        'sodium' => 'sodium_mg',
        'cholesterol' => 'cholesterol_mg',
        'calcium' => 'calcium_mg',
        'iron' => 'iron_mg',
        'potassium' => 'potassium_mg',
        'magnesium' => 'magnesium_mg',
        'phosphorus' => 'phosphorus_mg',
        'zinc' => 'zinc_mg',
        'vitaminC' => 'vitamin_c_mg',
    ];

    public function run(): void
    {
        $dir = database_path('data/taco');
        $foods = $this->read("{$dir}/food.csv");
        $nutrients = collect($this->read("{$dir}/nutrients.csv"))->keyBy('foodId');
        $categories = FoodCategory::query()->pluck('id', 'slug');

        DB::transaction(function () use ($foods, $nutrients, $categories): void {
            foreach ($foods as $row) {
                $n = $nutrients->get($row['id']) ?? throw new RuntimeException("TACO: alimento {$row['id']} sem nutrientes.");
                $slug = FoodCategorySeeder::TACO_SLUGS[(int) $row['categoryId']][0] ?? 'outros';

                $food = Food::query()->updateOrCreate(
                    ['source' => FoodSource::TACO->value, 'source_ref' => $row['id']],
                    [
                        'user_id' => null,
                        'food_category_id' => $categories[$slug] ?? null,
                        'name' => Str::squish($row['name']),
                        'reference_amount' => '100',
                        'reference_unit' => 'g',
                        'kcal' => $this->value($n['kcal']),
                        'protein_g' => $this->value($n['protein']),
                        'carbs_g' => $this->value($n['carbohydrates']),
                        'fat_g' => $this->value($n['lipids']),
                        'fiber_g' => $this->value($n['dietaryFiber']),
                    ],
                );

                foreach (self::EXTRA as $column => $key) {
                    FoodNutrient::query()->updateOrCreate(
                        ['food_id' => $food->id, 'nutrient' => $key],
                        ['amount' => $this->value($n[$column] ?? ''), 'unit' => 'mg'],
                    );
                }
            }
        });
    }

    private function value(string $raw): ?string
    {
        $raw = trim($raw);

        return $raw === '' ? null : $raw;
    }

    /**
     * @return list<array<string, string>>
     */
    private function read(string $path): array
    {
        $handle = fopen($path, 'r') ?: throw new RuntimeException("Não foi possível ler {$path}.");
        $header = fgetcsv($handle, escape: '\\');
        $rows = [];
        while (($line = fgetcsv($handle, escape: '\\')) !== false) {
            if ($line === [null]) {
                continue;
            }
            $rows[] = array_combine($header, array_pad($line, count($header), ''));
        }
        fclose($handle);

        return $rows;
    }
}
