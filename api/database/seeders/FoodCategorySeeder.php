<?php

namespace Database\Seeders;

use App\Modules\Food\Models\FoodCategory;
use Illuminate\Database\Seeder;

/** Categorias da TACO (mesmos ids da fonte em "position") + categoria livre para personalizados. */
class FoodCategorySeeder extends Seeder
{
    public const TACO_SLUGS = [
        1 => ['cereais', 'Cereais e derivados'],
        2 => ['verduras', 'Verduras, hortaliças e derivados'],
        3 => ['frutas', 'Frutas e derivados'],
        4 => ['gorduras', 'Gorduras e óleos'],
        5 => ['pescados', 'Pescados e frutos do mar'],
        6 => ['carnes', 'Carnes e derivados'],
        7 => ['leite', 'Leite e derivados'],
        8 => ['bebidas', 'Bebidas'],
        9 => ['ovos', 'Ovos e derivados'],
        10 => ['acucarados', 'Produtos açucarados'],
        11 => ['miscelaneas', 'Miscelâneas'],
        12 => ['industrializados', 'Outros industrializados'],
        13 => ['preparados', 'Alimentos preparados'],
        14 => ['leguminosas', 'Leguminosas e derivados'],
        15 => ['nozes', 'Nozes e sementes'],
    ];

    public function run(): void
    {
        foreach (self::TACO_SLUGS as $position => [$slug, $name]) {
            FoodCategory::query()->updateOrCreate(['slug' => $slug], ['name' => $name, 'position' => $position]);
        }

        FoodCategory::query()->updateOrCreate(['slug' => 'outros'], ['name' => 'Outros', 'position' => 99]);
    }
}
