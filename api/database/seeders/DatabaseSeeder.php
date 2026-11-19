<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * NutriFlow: base de referência (categorias + TACO) em todos os ambientes;
 * conta de demonstração apenas em APP_ENV=local.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([FoodCategorySeeder::class, TacoFoodSeeder::class]);

        if (app()->environment('local')) {
            $this->call(DemoAccountSeeder::class);
        }
    }
}
