<?php

namespace App\Modules\Auth\Support;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Valida o ID token (JWT) emitido pelo Google Identity Services:
 * assinatura (chaves públicas do Google, em cache), emissor, destinatário (nosso
 * Client ID), validade e e-mail verificado.
 */
class GoogleIdTokenVerifier
{
    public const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

    private const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

    public function enabled(): bool
    {
        return $this->clientIds() !== [];
    }

    /**
     * @return array{sub: string, email: string, name: string}
     */
    public function verify(string $credential): array
    {
        try {
            JWT::$leeway = 60;
            $claims = (array) JWT::decode($credential, JWK::parseKeySet($this->keys(), 'RS256'));
        } catch (Throwable) {
            Cache::forget('google.jwks'); // as chaves podem ter sido rotacionadas
            throw $this->invalid();
        }

        $valid = in_array($claims['iss'] ?? null, self::ISSUERS, true)
            && in_array($claims['aud'] ?? null, $this->clientIds(), true)
            && filled($claims['sub'] ?? null)
            && filled($claims['email'] ?? null)
            && ($claims['email_verified'] ?? false) === true;

        if (! $valid) {
            throw $this->invalid();
        }

        return [
            'sub' => (string) $claims['sub'],
            'email' => mb_strtolower((string) $claims['email']),
            'name' => (string) ($claims['name'] ?? strstr((string) $claims['email'], '@', true)),
        ];
    }

    /**
     * @return list<string>
     */
    public function clientIds(): array
    {
        return array_values(array_filter((array) config('services.google.client_ids', [])));
    }

    /**
     * @return array{keys: list<array<string, string>>}
     */
    private function keys(): array
    {
        return Cache::remember('google.jwks', now()->addHour(), function (): array {
            return Http::timeout(10)->retry(2, 200)->get(self::JWKS_URL)->throw()->json();
        });
    }

    private function invalid(): ValidationException
    {
        return ValidationException::withMessages([
            'credential' => 'Não foi possível confirmar o login com o Google. Tente de novo.',
        ]);
    }
}
