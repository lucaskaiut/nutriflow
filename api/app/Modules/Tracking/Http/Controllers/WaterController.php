<?php

namespace App\Modules\Tracking\Http\Controllers;

use App\Modules\Account\Support\UserClock;
use App\Modules\Shared\Http\Controllers\ApiController;
use App\Modules\Tracking\Http\Resources\WaterEntryResource;
use App\Modules\Tracking\Models\WaterEntry;
use App\Modules\Tracking\Services\WaterService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WaterController extends ApiController
{
    public function __construct(
        private readonly WaterService $water,
        private readonly UserClock $clock,
    ) {}

    public function day(Request $request): JsonResponse
    {
        $date = $request->validate(['date' => ['nullable', 'date_format:Y-m-d']])['date'] ?? null;
        $day = $this->water->day($request->user(), $date);

        return $this->success([...$day, 'entries' => WaterEntryResource::collection($day['entries'])]);
    }

    /** Totais diários dos últimos N dias (padrão 7). */
    public function history(Request $request): JsonResponse
    {
        $days = (int) ($request->validate(['days' => ['nullable', 'integer', 'min:1', 'max:366']])['days'] ?? 7);
        $user = $request->user();
        $to = $this->clock->today($user);
        $from = CarbonImmutable::parse($to)->subDays($days - 1)->toDateString();
        $totals = $this->water->dailyTotals($user, $from, $to);

        $series = [];
        for ($d = CarbonImmutable::parse($from); $d->toDateString() <= $to; $d = $d->addDay()) {
            $series[] = ['date' => $d->toDateString(), 'total_ml' => $totals[$d->toDateString()] ?? 0];
        }

        return $this->success(['from' => $from, 'to' => $to, 'days' => $series]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules(true), [], $this->attributes());
        $entry = $this->water->add($request->user(), $data);

        return $this->created(WaterEntryResource::make($entry), "+{$entry->amount_ml} ml registrados.");
    }

    public function update(Request $request, WaterEntry $water): JsonResponse
    {
        $this->authorize('update', $water);
        $data = $request->validate($this->rules(false), [], $this->attributes());

        return $this->success(WaterEntryResource::make($this->water->update($water, $data)), 'Registro de água atualizado.');
    }

    public function destroy(WaterEntry $water): JsonResponse
    {
        $this->authorize('delete', $water);
        $this->water->delete($water);

        return $this->success(null, 'Registro de água removido.');
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $creating): array
    {
        return [
            'amount_ml' => [$creating ? 'required' : 'sometimes', 'integer', 'min:10', 'max:5000'],
            'date' => ['sometimes', 'date_format:Y-m-d'],
            'time' => ['sometimes', 'date_format:H:i'],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function attributes(): array
    {
        return ['amount_ml' => 'quantidade de água', 'date' => 'data', 'time' => 'horário'];
    }
}
