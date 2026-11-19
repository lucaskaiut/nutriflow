<?php

namespace Database\Seeders;

use App\Modules\Auth\DTOs\NewTenantData;
use App\Modules\Auth\DTOs\NewUserData;
use App\Modules\Auth\Services\AuthService;
use App\Modules\User\Models\User;
use Illuminate\Database\Seeder;

/**
 * Conta de demonstração SEM dados de saúde (apenas para testar login localmente).
 * Só roda em APP_ENV=local (ver DatabaseSeeder).
 */
class DemoAccountSeeder extends Seeder
{
    public const EMAIL = 'demo@nutriflow.localhost';

    public function run(): void
    {
        if (User::query()->withoutTenancy()->where('email', self::EMAIL)->exists()) {
            return;
        }

        app(AuthService::class)->register(
            NewTenantData::personal('Conta Demo', self::EMAIL),
            NewUserData::fromArray(['name' => 'Conta Demo', 'email' => self::EMAIL, 'password' => 'password']),
        );
    }
}
