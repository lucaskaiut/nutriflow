<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * NutriFlow — diário alimentar.
 *
 * meals.date/time são a data e o horário LOCAIS da pessoa (fuso em profiles.timezone):
 * o diário é um conceito de "dia do calendário" de quem come, não um instante UTC.
 *
 * meal_items guarda um SNAPSHOT dos valores usados no registro:
 *   basis_* = nutrientes por basis_amount (ex.: por 100 g do alimento, ou por 1 porção da receita);
 *   kcal..fiber_g = totais do item = basis_* × base_quantity / basis_amount.
 * Alterar a quantidade reescala o próprio snapshot; editar o alimento/receita de origem
 * não altera registros já feitos.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meals', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('date');
            $table->time('time');
            $table->string('type', 20);                          // MealType
            $table->string('custom_name', 80)->nullable();       // para type = custom
            $table->string('notes', 500)->nullable();
            $table->timestamps();
            $table->index(['user_id', 'date']);
        });

        Schema::create('meal_items', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('meal_id')->constrained('meals')->cascadeOnDelete();
            $table->string('kind', 10);                          // food | recipe
            $table->foreignId('food_id')->nullable()->constrained('foods')->nullOnDelete();
            $table->foreignId('recipe_id')->nullable()->constrained('recipes')->nullOnDelete();
            $table->foreignId('food_portion_id')->nullable()->constrained('food_portions')->nullOnDelete();
            $table->string('name', 160);
            $table->string('portion_label', 80)->nullable();
            $table->decimal('quantity', 10, 3);
            $table->string('unit', 10);
            $table->decimal('base_quantity', 12, 3);
            $table->decimal('basis_amount', 10, 3);
            $table->string('basis_unit', 10);                    // g | ml | un | serving
            $table->decimal('basis_kcal', 10, 3)->nullable();
            $table->decimal('basis_protein_g', 10, 3)->nullable();
            $table->decimal('basis_carbs_g', 10, 3)->nullable();
            $table->decimal('basis_fat_g', 10, 3)->nullable();
            $table->decimal('basis_fiber_g', 10, 3)->nullable();
            $table->decimal('kcal', 10, 3)->default(0);
            $table->decimal('protein_g', 10, 3)->default(0);
            $table->decimal('carbs_g', 10, 3)->default(0);
            $table->decimal('fat_g', 10, 3)->default(0);
            $table->decimal('fiber_g', 10, 3)->default(0);
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
            $table->index(['food_id', 'meal_id']);
            $table->index('recipe_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meal_items');
        Schema::dropIfExists('meals');
    }
};
