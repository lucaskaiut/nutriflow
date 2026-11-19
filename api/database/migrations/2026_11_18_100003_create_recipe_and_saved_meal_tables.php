<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * NutriFlow — receitas e refeições salvas (modelos reutilizáveis).
 *
 * Os valores nutricionais NÃO são armazenados aqui: são sempre calculados a partir dos
 * ingredientes/itens atuais. O que preserva o histórico é o snapshot gravado em meal_items
 * no momento do registro no diário.
 *
 * quantity + unit (+ food_portion_id) é o que a pessoa digitou; base_quantity é o equivalente
 * na unidade de referência do alimento (g, ml ou un), calculado pelo servidor.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recipes', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 160);
            $table->text('description')->nullable();
            $table->string('photo_path')->nullable();
            $table->decimal('servings', 8, 2);                   // quantidade de porções
            $table->decimal('yield_weight_g', 10, 1)->nullable(); // rendimento total (opcional)
            $table->unsignedSmallInteger('prep_time_minutes')->nullable();
            $table->text('instructions')->nullable();
            $table->boolean('is_favorite')->default(false);
            $table->timestamp('archived_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
            $table->index(['user_id', 'archived_at', 'deleted_at']);
        });

        Schema::create('recipe_ingredients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recipe_id')->constrained('recipes')->cascadeOnDelete();
            $table->foreignId('food_id')->constrained('foods')->cascadeOnDelete();
            $table->foreignId('food_portion_id')->nullable()->constrained('food_portions')->nullOnDelete();
            $table->decimal('quantity', 10, 3);
            $table->string('unit', 10);                          // g | kg | ml | l | un | portion
            $table->decimal('base_quantity', 12, 3);
            $table->unsignedSmallInteger('position')->default(0);
        });

        Schema::create('saved_meals', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 160);
            $table->string('description', 500)->nullable();
            $table->string('meal_type', 20)->nullable();         // sugestão de período
            $table->boolean('is_favorite')->default(false);
            $table->timestamps();
            $table->index('user_id');
        });

        Schema::create('saved_meal_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('saved_meal_id')->constrained('saved_meals')->cascadeOnDelete();
            $table->string('kind', 10);                          // food | recipe
            $table->foreignId('food_id')->nullable()->constrained('foods')->cascadeOnDelete();
            $table->foreignId('recipe_id')->nullable()->constrained('recipes')->cascadeOnDelete();
            $table->foreignId('food_portion_id')->nullable()->constrained('food_portions')->nullOnDelete();
            $table->decimal('quantity', 10, 3);
            $table->string('unit', 10);                          // g | kg | ml | l | un | portion | serving
            $table->decimal('base_quantity', 12, 3);
            $table->unsignedSmallInteger('position')->default(0);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_meal_items');
        Schema::dropIfExists('saved_meals');
        Schema::dropIfExists('recipe_ingredients');
        Schema::dropIfExists('recipes');
    }
};
