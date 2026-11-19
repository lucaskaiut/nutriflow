<?php

namespace App\Modules\Tracking\Services;

use App\Modules\Account\Support\UserClock;
use App\Modules\Tracking\Enums\MeasurementType;
use App\Modules\Tracking\Models\BodyMeasurement;
use App\Modules\User\Models\User;
use Brick\Math\BigDecimal;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

final class MeasurementService
{
    public function __construct(private readonly UserClock $clock) {}

    /**
     * @return Collection<int, BodyMeasurement>
     */
    public function history(User $user, ?MeasurementType $type = null): Collection
    {
        return BodyMeasurement::query()->ownedBy($user)
            ->when($type, fn ($q) => $q->where('type', $type->value))
            ->orderBy('measured_on')->orderBy('id')
            ->get();
    }

    /**
     * Último valor de cada tipo com a diferença para o registro anterior do mesmo tipo.
     *
     * @return list<array<string, mixed>>
     */
    public function latestByType(User $user): array
    {
        $all = $this->history($user)->groupBy(fn (BodyMeasurement $m) => $m->type->value);

        return collect(MeasurementType::cases())->map(function (MeasurementType $type) use ($all) {
            /** @var Collection<int, BodyMeasurement> $items */
            $items = $all->get($type->value, collect());
            $last = $items->last();
            $previous = $items->count() > 1 ? $items->get($items->count() - 2) : null;

            return [
                'type' => $type->value,
                'label' => $type->label(),
                'unit' => $type->unit(),
                'value' => $last ? (float) $last->value : null,
                'measured_on' => $last?->measured_on?->toDateString(),
                'change' => $last && $previous
                    ? (float) (string) BigDecimal::of($last->value)->minus(BigDecimal::of($previous->value))->toScale(2, \Brick\Math\RoundingMode::HalfUp)
                    : null,
                'count' => $items->count(),
            ];
        })->all();
    }

    /**
     * Registra várias medidas de uma avaliação (mesma data) de uma vez.
     *
     * @param  array{measured_on?: string, notes?: ?string, values: array<string, numeric>}  $data
     * @return Collection<int, BodyMeasurement>
     */
    public function record(User $user, array $data): Collection
    {
        $date = $data['measured_on'] ?? $this->clock->today($user);

        return DB::transaction(fn () => collect($data['values'])->map(function ($value, string $type) use ($user, $date, $data) {
            $type = MeasurementType::from($type);

            return BodyMeasurement::query()->create([
                'user_id' => $user->id,
                'type' => $type,
                'value' => (string) $value,
                'unit' => $type->unit(),
                'measured_on' => $date,
                'notes' => $data['notes'] ?? null,
            ]);
        })->values());
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(BodyMeasurement $measurement, array $data): BodyMeasurement
    {
        $measurement->fill(array_intersect_key($data, array_flip(['value', 'measured_on', 'notes'])))->save();

        return $measurement->refresh();
    }

    public function delete(BodyMeasurement $measurement): void
    {
        $measurement->delete();
    }
}
