<?php

namespace App\Modules\Account\Support;

use App\Modules\User\Models\User;
use Carbon\CarbonImmutable;

/**
 * "Hoje" e "agora" no fuso da pessoa (profiles.timezone). O diário, a água e as pesagens são
 * registrados em data/hora local; o servidor nunca usa a data UTC para decidir o dia de alguém.
 */
final class UserClock
{
    public const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

    public function timezone(User $user): string
    {
        $tz = $user->profile?->timezone;

        return $tz !== null && in_array($tz, timezone_identifiers_list(), true) ? $tz : self::DEFAULT_TIMEZONE;
    }

    public function now(User $user): CarbonImmutable
    {
        return CarbonImmutable::now($this->timezone($user));
    }

    public function today(User $user): string
    {
        return $this->now($user)->toDateString();
    }

    public function currentTime(User $user): string
    {
        return $this->now($user)->format('H:i');
    }
}
