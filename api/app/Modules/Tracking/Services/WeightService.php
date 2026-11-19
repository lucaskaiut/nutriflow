<?php

namespace App\Modules\Tracking\Services;

use App\Modules\Account\Support\UserClock;
use App\Modules\Tracking\Models\WeightEntry;
use App\Modules\Tracking\Support\Period;
use App\Modules\User\Models\User;
use Brick\Math\BigDecimal;
use Illuminate\Support\Collection;

final class WeightService
{
    public function __construct(private readonly UserClock $clock) {}

    /**
     * Pesagens do período em ordem cronológica crescente.
     *
     * @return Collection<int, WeightEntry>
     */
    public function history(User $user, Period $period = Period::ALL): Collection
    {
        $from = $period->startFrom($this->clock->today($user));

        return WeightEntry::query()->ownedBy($user)
            ->when($from, fn ($q) => $q->where('measured_on', '>=', $from))
            ->chronological()
            ->get();
    }

    /** Pesagem mais recente pela data/horário da medição (não pela data de cadastro). */
    public function latest(User $user): ?WeightEntry
    {
        return WeightEntry::query()->ownedBy($user)->chronological('desc')->first();
    }

    public function earliest(User $user): ?WeightEntry
    {
        return WeightEntry::query()->ownedBy($user)->chronological()->first();
    }

    /**
     * @param  array{weight_kg: numeric-string|float, measured_on?: string, measured_at?: ?string, notes?: ?string}  $data
     */
    public function create(User $user, array $data): WeightEntry
    {
        return WeightEntry::query()->create([
            'user_id' => $user->id,
            'weight_kg' => (string) $data['weight_kg'],
            'measured_on' => $data['measured_on'] ?? $this->clock->today($user),
            'measured_at' => $data['measured_at'] ?? (isset($data['measured_on']) ? null : $this->clock->currentTime($user)),
            'notes' => $data['notes'] ?? null,
        ]);
    }

    /**
     * Edita um registro existente (os demais nunca são sobrescritos).
     *
     * @param  array<string, mixed>  $data
     */
    public function update(WeightEntry $entry, array $data): WeightEntry
    {
        $entry->fill(array_intersect_key($data, array_flip(['weight_kg', 'measured_on', 'measured_at', 'notes'])))->save();

        return $entry->refresh();
    }

    public function delete(WeightEntry $entry): void
    {
        $entry->delete();
    }

    /**
     * Resumo: inicial, atual, desejado, variação e distância até a meta.
     * Inicial = peso informado no perfil; sem ele, a pesagem mais antiga.
     *
     * @return array<string, mixed>
     */
    public function summary(User $user): array
    {
        $profile = $user->profile;
        $latest = $this->latest($user);
        $initial = $profile?->initial_weight_kg ?? $this->earliest($user)?->weight_kg;
        $current = $latest?->weight_kg ?? $initial;
        $target = $profile?->target_weight_kg;

        $diff = static fn (?string $a, ?string $b): ?float => $a !== null && $b !== null
            ? (float) (string) BigDecimal::of($a)->minus(BigDecimal::of($b))->toScale(2, \Brick\Math\RoundingMode::HalfUp)
            : null;

        return [
            'initial_kg' => $initial !== null ? (float) $initial : null,
            'current_kg' => $current !== null ? (float) $current : null,
            'target_kg' => $target !== null ? (float) $target : null,
            'change_kg' => $diff($current, $initial),          // atual − inicial (negativo = perdeu)
            'remaining_kg' => $diff($current, $target),        // atual − meta (positivo = acima da meta)
            'last_measured_on' => $latest?->measured_on?->toDateString(),
            'entries_count' => WeightEntry::query()->ownedBy($user)->count(),
        ];
    }

    /**
     * Variação dentro de um período (última − primeira pesagem do período).
     *
     * @return array{first_kg: ?float, last_kg: ?float, change_kg: ?float}
     */
    public function periodChange(User $user, Period $period): array
    {
        $history = $this->history($user, $period);
        $first = $history->first()?->weight_kg;
        $last = $history->last()?->weight_kg;

        return [
            'first_kg' => $first !== null ? (float) $first : null,
            'last_kg' => $last !== null ? (float) $last : null,
            'change_kg' => $first !== null && $last !== null
                ? (float) (string) BigDecimal::of($last)->minus(BigDecimal::of($first))->toScale(2, \Brick\Math\RoundingMode::HalfUp)
                : null,
        ];
    }
}
