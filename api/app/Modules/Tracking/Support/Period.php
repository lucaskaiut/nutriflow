<?php

namespace App\Modules\Tracking\Support;

use Carbon\CarbonImmutable;

/** Filtros de período do acompanhamento: 7d, 30d, 3m, 6m, 1y, all. */
enum Period: string
{
    case WEEK = '7d';
    case MONTH = '30d';
    case QUARTER = '3m';
    case SEMESTER = '6m';
    case YEAR = '1y';
    case ALL = 'all';

    /** Primeiro dia (inclusive) do período terminando em $today; null = sem limite. */
    public function startFrom(string $today): ?string
    {
        $end = CarbonImmutable::parse($today);

        return match ($this) {
            self::WEEK => $end->subDays(6)->toDateString(),
            self::MONTH => $end->subDays(29)->toDateString(),
            self::QUARTER => $end->subMonthsNoOverflow(3)->addDay()->toDateString(),
            self::SEMESTER => $end->subMonthsNoOverflow(6)->addDay()->toDateString(),
            self::YEAR => $end->subYearNoOverflow()->addDay()->toDateString(),
            self::ALL => null,
        };
    }
}
