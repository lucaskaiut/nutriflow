<?php

namespace Tests\Concerns;

use App\Modules\Auth\DTOs\NewTenantData;
use App\Modules\Auth\DTOs\NewUserData;
use App\Modules\Auth\Services\AuthService;
use App\Modules\Food\Enums\FoodSource;
use App\Modules\Food\Models\Food;
use App\Modules\User\Models\User;
use Laravel\Sanctum\Sanctum;

/** Contas pessoais (um tenant por pessoa) e alimentos com valores conhecidos para os testes. */
trait NutriFlowAccounts
{
    protected function person(string $name = 'Pessoa', ?string $email = null, string $timezone = 'America/Sao_Paulo'): User
    {
        $email ??= strtolower(str_replace(' ', '.', $name)).'.'.uniqid().'@example.com';
        $user = app(AuthService::class)->register(
            NewTenantData::personal($name, $email),
            NewUserData::fromArray(['name' => $name, 'email' => $email, 'password' => 'Senha@12345']),
        )->user;
        $user->profile()->create(['timezone' => $timezone]);

        return $user->refresh();
    }

    protected function actingAsPerson(?User $user = null): User
    {
        $user ??= $this->person();
        Sanctum::actingAs($user);

        return $user;
    }

    /**
     * Alimento da base de referência (por 100 g) com valores fixos.
     */
    protected function referenceFood(string $name, string $kcal, string $protein, string $carbs, string $fat, ?string $fiber = '0', string $unit = 'g', string $amount = '100'): Food
    {
        return Food::query()->create([
            'source' => FoodSource::TACO, 'source_ref' => uniqid(), 'user_id' => null,
            'name' => $name, 'reference_amount' => $amount, 'reference_unit' => $unit,
            'kcal' => $kcal, 'protein_g' => $protein, 'carbs_g' => $carbs, 'fat_g' => $fat, 'fiber_g' => $fiber,
        ]);
    }

    protected function customFood(User $owner, string $name, string $kcal = '100', string $protein = '10', string $carbs = '10', string $fat = '1'): Food
    {
        return Food::query()->create([
            'source' => FoodSource::CUSTOM, 'user_id' => $owner->id,
            'name' => $name, 'reference_amount' => '100', 'reference_unit' => 'g',
            'kcal' => $kcal, 'protein_g' => $protein, 'carbs_g' => $carbs, 'fat_g' => $fat, 'fiber_g' => '0',
        ]);
    }
}
