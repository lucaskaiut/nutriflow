<?php

namespace Tests\Feature\Auth;

use App\Modules\ApiToken\Models\ApiToken;
use App\Modules\Auth\Support\GoogleIdTokenVerifier;
use App\Modules\Tenant\Models\Tenant;
use App\Modules\User\Models\User;
use Firebase\JWT\JWT;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GoogleLoginTest extends TestCase
{
    use RefreshDatabase;

    private const CLIENT_ID = 'teste-123.apps.googleusercontent.com';

    private string $privateKey = '';

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.google.client_ids' => [self::CLIENT_ID, 'teste-ios.apps.googleusercontent.com']]);
        Cache::flush();

        // Par de chaves próprio, publicado como se fosse o JWKS do Google.
        $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        openssl_pkey_export($key, $this->privateKey);
        $details = openssl_pkey_get_details($key)['rsa'];
        $b64 = fn (string $v) => rtrim(strtr(base64_encode($v), '+/', '-_'), '=');

        Http::fake([GoogleIdTokenVerifier::JWKS_URL => Http::response(['keys' => [[
            'kty' => 'RSA', 'alg' => 'RS256', 'use' => 'sig', 'kid' => 'k1',
            'n' => $b64($details['n']), 'e' => $b64($details['e']),
        ]]])]);
    }

    private function credential(array $overrides = []): string
    {
        return JWT::encode([
            'iss' => 'https://accounts.google.com',
            'aud' => self::CLIENT_ID,
            'sub' => '1098765',
            'email' => 'maria@gmail.com',
            'email_verified' => true,
            'name' => 'Maria Souza',
            'iat' => time(),
            'exp' => time() + 3600,
            ...$overrides,
        ], $this->privateKey, 'RS256', 'k1');
    }

    public function test_providers_reports_google_only_when_configured(): void
    {
        $this->getJson('/api/auth/providers')->assertOk()->assertJsonPath('data.google', true);

        config(['services.google.client_ids' => []]);
        $this->getJson('/api/auth/providers')->assertOk()->assertJsonPath('data.google', false);
        $this->postJson('/api/auth/google', ['credential' => $this->credential()])->assertNotFound();
    }

    public function test_new_google_user_must_accept_terms_then_gets_an_independent_account(): void
    {
        $this->postJson('/api/auth/google', ['credential' => $this->credential()])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('accept_terms');
        $this->assertSame(0, User::query()->withoutTenancy()->count());

        $this->postJson('/api/auth/google', ['credential' => $this->credential(), 'accept_terms' => true])
            ->assertOk()
            ->assertJsonPath('data.user.email', 'maria@gmail.com');

        $user = User::query()->withoutTenancy()->firstOrFail();
        $this->assertSame('1098765', $user->google_id);
        $this->assertNotNull($user->email_verified_at);
        $this->assertNull(Tenant::query()->findOrFail($user->tenant_id)->parent_id);
        $this->assertFalse((bool) $user->is_master);

        // Segunda vez: entra direto, sem pedir termo.
        $this->postJson('/api/auth/google', ['credential' => $this->credential()])->assertOk();
        $this->assertSame(1, User::query()->withoutTenancy()->count());
    }

    public function test_linking_an_unverified_password_account_revokes_the_previous_access(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Alguém', 'email' => 'maria@gmail.com',
            'password' => 'senha-antiga-123', 'password_confirmation' => 'senha-antiga-123', 'accept_terms' => true,
        ])->assertCreated();
        $user = User::query()->withoutTenancy()->firstOrFail();
        ApiToken::query()->withoutTenancy()->create(['tenant_id' => $user->tenant_id, 'name' => 'leitor', 'token_hash' => 'x', 'permissions' => ['glucose.import']]);

        $this->postJson('/api/auth/google', ['credential' => $this->credential()])->assertOk();

        $user->refresh();
        $this->assertSame('1098765', $user->google_id);
        $this->assertFalse(Hash::check('senha-antiga-123', $user->password));
        $this->assertSame(0, ApiToken::query()->withoutTenancy()->count());
        $this->postJson('/api/auth/login', ['email' => 'maria@gmail.com', 'password' => 'senha-antiga-123'])->assertUnprocessable();
    }

    public function test_linking_a_verified_account_keeps_its_password(): void
    {
        $this->postJson('/api/auth/register', [
            'name' => 'Maria', 'email' => 'maria@gmail.com',
            'password' => 'minha-senha-123', 'password_confirmation' => 'minha-senha-123', 'accept_terms' => true,
        ])->assertCreated();
        User::query()->withoutTenancy()->firstOrFail()->forceFill(['email_verified_at' => now()])->save();

        $this->postJson('/api/auth/google', ['credential' => $this->credential()])->assertOk();

        $this->assertTrue(Hash::check('minha-senha-123', User::query()->withoutTenancy()->firstOrFail()->password));
    }

    public function test_invalid_credentials_are_rejected(): void
    {
        $cases = [
            'outro destinatário' => $this->credential(['aud' => 'outro-app.apps.googleusercontent.com']),
            'expirado' => $this->credential(['exp' => time() - 3600, 'iat' => time() - 7200]),
            'e-mail não verificado' => $this->credential(['email_verified' => false]),
            'emissor falso' => $this->credential(['iss' => 'https://evil.example.com']),
            'assinatura alheia' => JWT::encode(['aud' => self::CLIENT_ID], openssl_pkey_get_private(openssl_pkey_new(['private_key_bits' => 2048])), 'RS256', 'k1'),
            'lixo' => 'nao-e-um-jwt',
        ];

        foreach ($cases as $label => $credential) {
            $response = $this->postJson('/api/auth/google', ['credential' => $credential, 'accept_terms' => true]);
            $this->assertSame(422, $response->status(), "caso: {$label}");
            $this->assertArrayHasKey('credential', $response->json('errors') ?? [], "caso: {$label}");
        }

        $this->assertSame(0, User::query()->withoutTenancy()->count());
    }

    public function test_a_different_google_account_cannot_take_over_a_linked_account(): void
    {
        $this->postJson('/api/auth/google', ['credential' => $this->credential(), 'accept_terms' => true])->assertOk();

        $this->postJson('/api/auth/google', ['credential' => $this->credential(['sub' => '5555'])])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('credential');
    }
}
