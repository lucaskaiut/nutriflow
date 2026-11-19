<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * NutriFlow — metas e acompanhamento (peso, medidas, água).
 *
 * nutrition_goals é versionada por effective_from: a meta vigente em um dia é a mais recente
 * com effective_from <= dia. Assim relatórios de períodos passados usam a meta da época.
 * Várias pesagens no mesmo dia são permitidas; o "peso atual" é a pesagem mais recente
 * (data, horário), não a última cadastrada.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nutrition_goals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('effective_from');
            $table->unsignedInteger('kcal');
            $table->decimal('protein_g', 7, 1);
            $table->decimal('carbs_g', 7, 1);
            $table->decimal('fat_g', 7, 1);
            $table->unsignedInteger('water_ml');
            $table->string('mode', 12)->default('manual');      // manual | estimated
            $table->timestamps();
            $table->unique(['user_id', 'effective_from']);
        });

        Schema::create('weight_entries', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('measured_on');
            $table->time('measured_at')->nullable();
            $table->decimal('weight_kg', 5, 2);
            $table->string('notes', 500)->nullable();
            $table->timestamps();
            $table->index(['user_id', 'measured_on']);
        });

        Schema::create('body_measurements', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 20);                          // waist | hip | arm | thigh | chest | body_fat
            $table->decimal('value', 6, 2);
            $table->string('unit', 5);                           // cm | %
            $table->date('measured_on');
            $table->string('notes', 500)->nullable();
            $table->timestamps();
            $table->index(['user_id', 'type', 'measured_on']);
        });

        Schema::create('water_entries', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('date');
            $table->time('time');
            $table->unsignedInteger('amount_ml');
            $table->timestamps();
            $table->index(['user_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('water_entries');
        Schema::dropIfExists('body_measurements');
        Schema::dropIfExists('weight_entries');
        Schema::dropIfExists('nutrition_goals');
    }
};
