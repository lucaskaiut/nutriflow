<?php

namespace App\Modules\Account\Services;

use App\Modules\Account\Notifications\PasswordResetCodeNotification;
use App\Modules\User\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * Recuperação de senha por código de 6 dígitos enviado por e-mail (adequado ao app mobile).
 *
 * - O código é guardado apenas como hash (password_reset_tokens), expira e é de uso único.
 * - A resposta do pedido é sempre a mesma, exista ou não a conta (sem enumeração de e-mails).
 * - Tentativas erradas são limitadas por e-mail; ao estourar, o código é invalidado.
 * - Ao redefinir, todas as sessões (tokens) da conta são revogadas.
 */
final class PasswordResetService
{
    public const EXPIRES_MINUTES = 30;

    public const MAX_ATTEMPTS = 5;

    public function request(string $email): void
    {
        $email = mb_strtolower(trim($email));
        $user = User::query()->withoutTenancy()->where('email', $email)->first();

        if ($user === null) {
            return;
        }

        $code = str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $email],
            ['token' => Hash::make($code), 'created_at' => now()],
        );
        RateLimiter::clear($this->attemptsKey($email));

        $user->notify(new PasswordResetCodeNotification($code, self::EXPIRES_MINUTES));
    }

    public function reset(string $email, string $code, string $password): void
    {
        $email = mb_strtolower(trim($email));
        $key = $this->attemptsKey($email);
        $record = DB::table('password_reset_tokens')->where('email', $email)->first();

        $expired = $record === null
            || Carbon::parse($record->created_at)->addMinutes(self::EXPIRES_MINUTES)->isPast();

        if ($expired || RateLimiter::tooManyAttempts($key, self::MAX_ATTEMPTS)) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            throw $this->invalid();
        }

        if (! Hash::check($code, $record->token)) {
            RateLimiter::hit($key, self::EXPIRES_MINUTES * 60);
            throw $this->invalid();
        }

        $user = User::query()->withoutTenancy()->where('email', $email)->first() ?? throw $this->invalid();

        DB::transaction(function () use ($user, $password, $email) {
            $user->forceFill(['password' => $password])->save();
            $user->tokens()->delete();
            DB::table('password_reset_tokens')->where('email', $email)->delete();
        });
        RateLimiter::clear($key);
    }

    private function attemptsKey(string $email): string
    {
        return 'password-reset:'.sha1($email);
    }

    private function invalid(): ValidationException
    {
        return ValidationException::withMessages(['code' => ['Código inválido ou expirado. Solicite um novo código.']]);
    }
}
