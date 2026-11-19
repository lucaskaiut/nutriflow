<?php

use App\Modules\Account\Http\Controllers\AccountController;
use App\Modules\Account\Http\Controllers\PasswordResetController;
use App\Modules\Auth\Http\Controllers\AuthController;
use App\Modules\Diary\Http\Controllers\MealController;
use App\Modules\Food\Http\Controllers\FoodController;
use App\Modules\Goal\Http\Controllers\GoalController;
use App\Modules\Recipe\Http\Controllers\RecipeController;
use App\Modules\Report\Http\Controllers\ReportController;
use App\Modules\SavedMeal\Http\Controllers\SavedMealController;
use App\Modules\Tracking\Http\Controllers\MeasurementController;
use App\Modules\Tracking\Http\Controllers\WaterController;
use App\Modules\Tracking\Http\Controllers\WeightController;
use Illuminate\Support\Facades\Route;

/*
 * NutriFlow — API do app mobile (Bearer tokens do Sanctum).
 *
 * Contas pessoais e independentes: cada pessoa só acessa os próprios registros (policies de dono
 * + consultas sempre filtradas pelo usuário autenticado). As rotas do skeleton para tenants,
 * usuários, papéis, tokens de API, webhooks, billing e assistente de IA não são expostas.
 */

Route::prefix('auth')->group(function (): void {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:auth');
    Route::post('google', [AuthController::class, 'google'])->middleware('throttle:auth');
    Route::get('providers', [AuthController::class, 'providers']);
    Route::post('password/forgot', [PasswordResetController::class, 'forgot'])->middleware('throttle:auth');
    Route::post('password/reset', [PasswordResetController::class, 'reset'])->middleware('throttle:auth');

    Route::middleware(['auth:sanctum', 'tenant'])->post('logout', [AuthController::class, 'logout']);
});

Route::middleware(['auth:sanctum', 'tenant', 'throttle:app'])->group(function (): void {
    // Conta, perfil e preferências
    Route::get('me', [AccountController::class, 'show']);
    Route::match(['put', 'patch'], 'me', [AccountController::class, 'update']);
    Route::post('me/onboarding', [AccountController::class, 'onboarding']);
    Route::match(['put', 'patch'], 'me/preferences', [AccountController::class, 'preferences']);
    Route::get('me/export', [AccountController::class, 'export'])->middleware('throttle:sensitive');
    Route::delete('me', [AccountController::class, 'destroy'])->middleware('throttle:sensitive');

    // Dashboard e relatórios
    Route::get('dashboard', [ReportController::class, 'dashboard']);
    Route::get('reports', [ReportController::class, 'report']);

    // Metas
    Route::get('goals', [GoalController::class, 'show']);
    Route::put('goals', [GoalController::class, 'update']);

    // Alimentos
    Route::get('foods', [FoodController::class, 'index']);
    Route::get('foods/recent', [FoodController::class, 'recent']);
    Route::get('food-categories', [FoodController::class, 'categories']);
    Route::post('foods', [FoodController::class, 'store']);
    Route::get('foods/{food}', [FoodController::class, 'show']);
    Route::match(['put', 'patch'], 'foods/{food}', [FoodController::class, 'update']);
    Route::delete('foods/{food}', [FoodController::class, 'destroy']);
    Route::post('foods/{food}/favorite', [FoodController::class, 'favorite']);
    Route::delete('foods/{food}/favorite', [FoodController::class, 'unfavorite']);
    Route::post('foods/{food}/portions', [FoodController::class, 'storePortion']);
    Route::delete('food-portions/{portion}', [FoodController::class, 'destroyPortion']);

    // Receitas
    Route::get('recipes', [RecipeController::class, 'index']);
    Route::post('recipes', [RecipeController::class, 'store']);
    Route::get('recipes/{recipe}', [RecipeController::class, 'show']);
    Route::match(['put', 'patch'], 'recipes/{recipe}', [RecipeController::class, 'update']);
    Route::delete('recipes/{recipe}', [RecipeController::class, 'destroy']);
    Route::post('recipes/{recipe}/duplicate', [RecipeController::class, 'duplicate']);
    Route::put('recipes/{recipe}/archive', [RecipeController::class, 'archive']);
    Route::put('recipes/{recipe}/favorite', [RecipeController::class, 'favorite']);
    Route::get('recipes/{recipe}/usage', [RecipeController::class, 'usage']);
    Route::get('recipes/{recipe}/photo', [RecipeController::class, 'photo']);
    Route::post('recipes/{recipe}/photo', [RecipeController::class, 'uploadPhoto']);
    Route::delete('recipes/{recipe}/photo', [RecipeController::class, 'deletePhoto']);

    // Refeições salvas
    Route::get('saved-meals', [SavedMealController::class, 'index']);
    Route::post('saved-meals', [SavedMealController::class, 'store']);
    Route::get('saved-meals/{savedMeal}', [SavedMealController::class, 'show']);
    Route::match(['put', 'patch'], 'saved-meals/{savedMeal}', [SavedMealController::class, 'update']);
    Route::delete('saved-meals/{savedMeal}', [SavedMealController::class, 'destroy']);
    Route::post('saved-meals/{savedMeal}/duplicate', [SavedMealController::class, 'duplicate']);
    Route::put('saved-meals/{savedMeal}/favorite', [SavedMealController::class, 'favorite']);
    Route::post('saved-meals/{savedMeal}/add-to-diary', [SavedMealController::class, 'addToDiary']);

    // Diário
    Route::get('diary', [MealController::class, 'day']);
    Route::post('meals', [MealController::class, 'store']);
    Route::get('meals/{meal}', [MealController::class, 'show']);
    Route::match(['put', 'patch'], 'meals/{meal}', [MealController::class, 'update']);
    Route::delete('meals/{meal}', [MealController::class, 'destroy']);
    Route::post('meals/{meal}/duplicate', [MealController::class, 'duplicate']);
    Route::post('meals/{meal}/items', [MealController::class, 'addItems']);
    Route::match(['put', 'patch'], 'meal-items/{item}', [MealController::class, 'updateItem']);
    Route::delete('meal-items/{item}', [MealController::class, 'destroyItem']);

    // Peso
    Route::get('weights', [WeightController::class, 'index']);
    Route::post('weights', [WeightController::class, 'store']);
    Route::match(['put', 'patch'], 'weights/{weight}', [WeightController::class, 'update']);
    Route::delete('weights/{weight}', [WeightController::class, 'destroy']);

    // Hidratação
    Route::get('water', [WaterController::class, 'day']);
    Route::get('water/history', [WaterController::class, 'history']);
    Route::post('water', [WaterController::class, 'store']);
    Route::match(['put', 'patch'], 'water/{water}', [WaterController::class, 'update']);
    Route::delete('water/{water}', [WaterController::class, 'destroy']);

    // Medidas corporais
    Route::get('measurements', [MeasurementController::class, 'index']);
    Route::post('measurements', [MeasurementController::class, 'store']);
    Route::match(['put', 'patch'], 'measurements/{measurement}', [MeasurementController::class, 'update']);
    Route::delete('measurements/{measurement}', [MeasurementController::class, 'destroy']);
});
