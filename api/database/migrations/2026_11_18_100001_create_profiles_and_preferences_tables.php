<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * NutriFlow — perfil (dados corporais e objetivo, base das estimativas) e preferências do app.
 * Pesos em kg e alturas em cm (canônicos); a conversão para lb/in é apenas de exibição.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->date('birth_date')->nullable();
            $table->string('sex', 10)->nullable();               // male | female
            $table->decimal('height_cm', 5, 1)->nullable();
            $table->decimal('initial_weight_kg', 5, 2)->nullable();
            $table->decimal('target_weight_kg', 5, 2)->nullable();
            $table->string('activity_level', 20)->nullable();    // ActivityLevel
            $table->string('goal', 20)->nullable();              // GoalType
            $table->string('timezone', 64)->default('America/Sao_Paulo');
            $table->timestamp('onboarded_at')->nullable();
            $table->timestamps();
        });

        Schema::create('user_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('theme', 10)->default('system');      // light | dark | system
            $table->string('weight_unit', 5)->default('kg');     // kg | lb
            $table->string('length_unit', 5)->default('cm');     // cm | in
            $table->boolean('meal_reminders')->default(false);
            $table->boolean('water_reminders')->default(false);
            $table->boolean('weight_reminder')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_preferences');
        Schema::dropIfExists('profiles');
    }
};
