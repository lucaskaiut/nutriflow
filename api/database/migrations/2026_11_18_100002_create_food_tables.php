<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * NutriFlow — base de alimentos.
 *
 * - foods.user_id NULL = alimento de referência (ex.: TACO), visível a todos e somente leitura;
 *   preenchido = alimento personalizado, visível apenas ao dono.
 * - Os nutrientes principais ficam em colunas (consultas e somas frequentes); os demais
 *   (sódio, colesterol, minerais, vitaminas...) em food_nutrients. NULL = valor não disponível
 *   na fonte (nunca é inventado).
 * - Alimentos personalizados são excluídos com soft delete: receitas, refeições salvas e o
 *   histórico do diário continuam íntegros.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('food_categories', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 60)->unique();
            $table->string('name', 120);
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('foods', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->foreignId('food_category_id')->nullable()->constrained('food_categories')->nullOnDelete();
            $table->string('source', 20);                        // taco | custom
            $table->string('source_ref', 40)->nullable();        // id do alimento na fonte
            $table->string('name', 160);
            $table->string('description', 500)->nullable();
            $table->decimal('reference_amount', 10, 3);          // ex.: 100
            $table->string('reference_unit', 5);                 // g | ml | un
            $table->decimal('kcal', 10, 3)->nullable();
            $table->decimal('protein_g', 10, 3)->nullable();
            $table->decimal('carbs_g', 10, 3)->nullable();
            $table->decimal('fat_g', 10, 3)->nullable();
            $table->decimal('fiber_g', 10, 3)->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['source', 'source_ref']);
            $table->index(['user_id', 'deleted_at']);
            $table->index('name');
        });

        Schema::create('food_nutrients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('food_id')->constrained('foods')->cascadeOnDelete();
            $table->string('nutrient', 40);                      // sodium_mg, cholesterol_mg, ...
            $table->decimal('amount', 12, 4)->nullable();
            $table->string('unit', 10);
            $table->unique(['food_id', 'nutrient']);
        });

        // Medidas caseiras ("1 unidade", "1 fatia"): quantidade equivalente na unidade de referência do alimento.
        Schema::create('food_portions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('food_id')->constrained('foods')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('label', 80);
            $table->decimal('amount', 10, 3);
            $table->timestamps();
            $table->index(['food_id', 'user_id']);
        });

        Schema::create('food_favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('food_id')->constrained('foods')->cascadeOnDelete();
            $table->timestamp('created_at')->nullable();
            $table->unique(['user_id', 'food_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('food_favorites');
        Schema::dropIfExists('food_portions');
        Schema::dropIfExists('food_nutrients');
        Schema::dropIfExists('foods');
        Schema::dropIfExists('food_categories');
    }
};
