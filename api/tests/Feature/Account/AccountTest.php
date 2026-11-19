<?php

namespace Tests\Feature\Account;

use App\Modules\Account\Notifications\PasswordResetCodeNotification;
use App\Modules\Diary\Models\Meal;
use App\Modules\Food\Models\Food;
use App\Modules\Recipe\Models\Recipe;
use App\Modules\Tenant\Models\Tenant;
use App\Modules\Tracking\Models\WeightEntry;
use App\Modules\User\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\NutriFlowAccounts;
use Tests\TestCase;

class AccountTest extends TestCase
{
    use NutriFlowAccounts;
    use RefreshDatabase;

    public function test_register_requires_terms_and_password_confirmation_and_hashes_the_password(): void
    {
        $this->postJson('/api/auth/register', ['name' => 'Ana', 'email' => 'ana@example.com', 'password' => 'Senha@12345', 'password_confirmation' => 'outra'])
            ->assertUnprocessable()->assertJsonValidationErrors(['password', 'accept_terms']);

        $this->postJson('/api/auth/register', ['name' => 'Ana', 'email' => 'ana@example.com', 'password' => 'Senha@12345', 'password_confirmation' => 'Senha@12345', 'accept_terms' => true])
            ->assertCreated()->assertJsonStructure(['data' => ['token']]);

        $user = User::query()->withoutTenancy()->where('email', 'ana@example.com')->firstOrFail();
        $this->assertNotSame('Senha@12345', $user->password);
        $this->assertTrue(password_verify('Senha@12345', $user->password));
    }

    public function test_onboarding_saves_profile_initial_weight_and_estimated_goals(): void
    {
        $this->travelTo(\Carbon\CarbonImmutable::parse('2026-11-18 12:00', 'America/Sao_Paulo'));
        $this->actingAsPerson();

        $this->postJson('/api/me/onboarding', [
            'name' => 'Ana', 'birth_date' => '1992-03-15', 'sex' => 'female', 'height_cm' => 165,
            'current_weight_kg' => 82.5, 'target_weight_kg' => 68, 'activity_level' => 'light', 'goal' => 'lose_weight',
        ])->assertOk()->assertJsonPath('data.onboarding_completed', true)->assertJsonPath('data.profile.initial_weight_kg', 82.5);

        $goals = $this->getJson('/api/goals')->assertOk()->json('data');
        // TMB = 10·82,5 + 6,25·165 − 5·34 − 161 = 1525,25; × 1,375 = 2097,22; − 500 = 1597,22 → 1600
        $this->assertSame(1600, $goals['nutrition']['kcal']);
        // proteína pelo peso meta: 68 kg × 1,8 g/kg = 122,4 → 122 g (e não 82,5 × 1,8 = 149 g)
        $this->assertEquals(122, $goals['nutrition']['protein_g']);
        // gordura = 25% de 1597,22 ÷ 9 = 44,4 → 44; carboidratos = (1597,22 − 489,6 − 399,3) ÷ 4 = 177,1 → 177
        $this->assertEquals(44, $goals['nutrition']['fat_g']);
        $this->assertEquals(177, $goals['nutrition']['carbs_g']);
        $this->assertSame('estimated', $goals['nutrition']['mode']);
        $this->assertStringContainsString('Não substitui', $goals['estimate']['disclaimer']);
        $this->getJson('/api/weights?period=all')->assertJsonCount(1, 'data.entries');
    }

    public function test_manual_goals_override_and_keep_history(): void
    {
        $user = $this->actingAsPerson();

        $this->putJson('/api/goals', ['kcal' => 2100, 'protein_g' => 160, 'carbs_g' => 220, 'fat_g' => 65, 'water_ml' => 2500, 'target_weight_kg' => 95])
            ->assertOk()
            ->assertJsonPath('data.nutrition.kcal', 2100)
            ->assertJsonPath('data.nutrition.mode', 'manual')
            ->assertJsonPath('data.target_weight_kg', 95);

        $this->putJson('/api/goals', ['kcal' => 100, 'protein_g' => 1, 'carbs_g' => 1, 'fat_g' => 1, 'water_ml' => 1])
            ->assertUnprocessable()->assertJsonValidationErrors(['kcal', 'water_ml']);
    }

    public function test_password_reset_with_emailed_code(): void
    {
        Notification::fake();
        $user = $this->person('Rita', 'rita@example.com');
        $code = null;

        $this->postJson('/api/auth/password/forgot', ['email' => 'rita@example.com'])->assertOk();
        // mesma resposta para e-mail inexistente (sem enumeração)
        $this->postJson('/api/auth/password/forgot', ['email' => 'ninguem@example.com'])->assertOk();

        Notification::assertSentTo($user, PasswordResetCodeNotification::class, function ($n) use (&$code, $user) {
            preg_match('/\*\*(\d{6})\*\*/', implode(' ', $n->toMail($user)->introLines), $m);
            $code = $m[1] ?? null;

            return $code !== null;
        });
        Notification::assertSentTimes(PasswordResetCodeNotification::class, 1);

        $this->postJson('/api/auth/password/reset', ['email' => 'rita@example.com', 'code' => '000000' === $code ? '111111' : '000000', 'password' => 'NovaSenha@1', 'password_confirmation' => 'NovaSenha@1'])
            ->assertUnprocessable()->assertJsonValidationErrors('code');

        $this->postJson('/api/auth/password/reset', ['email' => 'rita@example.com', 'code' => $code, 'password' => 'NovaSenha@1', 'password_confirmation' => 'NovaSenha@1'])
            ->assertOk();

        // código é de uso único
        $this->postJson('/api/auth/password/reset', ['email' => 'rita@example.com', 'code' => $code, 'password' => 'Outra@1234', 'password_confirmation' => 'Outra@1234'])
            ->assertUnprocessable();

        $this->postJson('/api/auth/login', ['email' => 'rita@example.com', 'password' => 'NovaSenha@1'])->assertOk();
    }

    public function test_password_reset_code_is_invalidated_after_too_many_attempts(): void
    {
        Notification::fake();
        $user = $this->person('Rui', 'rui@example.com');
        $this->postJson('/api/auth/password/forgot', ['email' => 'rui@example.com']);
        $code = null;
        Notification::assertSentTo($user, PasswordResetCodeNotification::class, function ($n) use (&$code, $user) {
            preg_match('/\*\*(\d{6})\*\*/', implode(' ', $n->toMail($user)->introLines), $m);

            return (bool) ($code = $m[1] ?? null);
        });
        $wrong = $code === '123456' ? '654321' : '123456';

        for ($i = 0; $i < 5; $i++) {
            $this->withServerVariables(['REMOTE_ADDR' => "10.0.0.{$i}"])
                ->postJson('/api/auth/password/reset', ['email' => 'rui@example.com', 'code' => $wrong, 'password' => 'NovaSenha@1', 'password_confirmation' => 'NovaSenha@1']);
        }

        $this->withServerVariables(['REMOTE_ADDR' => '10.0.1.1'])
            ->postJson('/api/auth/password/reset', ['email' => 'rui@example.com', 'code' => $code, 'password' => 'NovaSenha@1', 'password_confirmation' => 'NovaSenha@1'])
            ->assertUnprocessable();
    }

    public function test_account_deletion_requires_confirmation_and_removes_all_data(): void
    {
        $user = $this->actingAsPerson();
        $other = $this->person('Outra pessoa');
        $food = $this->customFood($user, 'Meu pão');
        $this->postJson('/api/recipes', ['name' => 'Pão recheado', 'servings' => 1, 'ingredients' => [['food_id' => $food->uuid, 'quantity' => 100]]])->assertCreated();
        $this->postJson('/api/meals', ['type' => 'lunch', 'items' => [['food_id' => $food->uuid, 'quantity' => 100]]])->assertCreated();
        $this->postJson('/api/weights', ['weight_kg' => 80])->assertCreated();

        $this->deleteJson('/api/me', ['confirmation' => 'excluir', 'password' => 'Senha@12345'])->assertUnprocessable()->assertJsonValidationErrors('confirmation');
        $this->deleteJson('/api/me', ['confirmation' => 'EXCLUIR', 'password' => 'errada'])->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->deleteJson('/api/me', ['confirmation' => 'EXCLUIR', 'password' => 'Senha@12345'])->assertOk();

        $this->assertNull(User::query()->withoutTenancy()->withTrashed()->find($user->id));
        $this->assertNull(Tenant::query()->find($user->tenant_id));
        $this->assertSame(0, Food::query()->withTrashed()->where('user_id', $user->id)->count());
        $this->assertSame(0, Recipe::query()->withTrashed()->where('user_id', $user->id)->count());
        $this->assertSame(0, Meal::query()->where('user_id', $user->id)->count());
        $this->assertSame(0, WeightEntry::query()->where('user_id', $user->id)->count());
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);
        $this->assertNotNull(User::query()->withoutTenancy()->find($other->id));
    }

    public function test_preferences_are_persisted(): void
    {
        $this->actingAsPerson();

        $this->patchJson('/api/me/preferences', ['theme' => 'dark', 'weight_unit' => 'lb', 'length_unit' => 'in', 'water_reminders' => true])
            ->assertOk()
            ->assertJsonPath('data.preferences.theme', 'dark')
            ->assertJsonPath('data.preferences.weight_unit', 'lb')
            ->assertJsonPath('data.preferences.water_reminders', true);

        $this->patchJson('/api/me/preferences', ['theme' => 'neon'])->assertUnprocessable();
        $this->getJson('/api/me')->assertJsonPath('data.preferences.length_unit', 'in');
    }
}
