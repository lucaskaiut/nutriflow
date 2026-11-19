<?php

namespace App\Modules\Tracking\Http\Controllers;

use App\Modules\Shared\Http\Controllers\ApiController;
use App\Modules\Tracking\Enums\MeasurementType;
use App\Modules\Tracking\Http\Resources\BodyMeasurementResource;
use App\Modules\Tracking\Models\BodyMeasurement;
use App\Modules\Tracking\Services\MeasurementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MeasurementController extends ApiController
{
    public function __construct(private readonly MeasurementService $measurements) {}

    public function index(Request $request): JsonResponse
    {
        $type = $request->validate(['type' => ['nullable', Rule::enum(MeasurementType::class)]])['type'] ?? null;
        $user = $request->user();

        return $this->success([
            'latest' => $this->measurements->latestByType($user),
            'entries' => BodyMeasurementResource::collection($this->measurements->history($user, $type ? MeasurementType::from($type) : null)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'measured_on' => ['sometimes', 'date_format:Y-m-d', 'before_or_equal:2100-12-31'],
            'notes' => ['nullable', 'string', 'max:500'],
            'values' => ['required', 'array', 'min:1'],
            'values.waist' => ['sometimes', 'numeric', 'gt:0', 'max:400', 'decimal:0,2'],
            'values.hip' => ['sometimes', 'numeric', 'gt:0', 'max:400', 'decimal:0,2'],
            'values.arm' => ['sometimes', 'numeric', 'gt:0', 'max:200', 'decimal:0,2'],
            'values.thigh' => ['sometimes', 'numeric', 'gt:0', 'max:200', 'decimal:0,2'],
            'values.chest' => ['sometimes', 'numeric', 'gt:0', 'max:400', 'decimal:0,2'],
            'values.body_fat' => ['sometimes', 'numeric', 'gt:0', 'lt:100', 'decimal:0,2'],
        ], ['values.required' => 'Informe pelo menos uma medida.', 'values.min' => 'Informe pelo menos uma medida.'], [
            'values.waist' => 'cintura', 'values.hip' => 'quadril', 'values.arm' => 'braço',
            'values.thigh' => 'coxa', 'values.chest' => 'peito', 'values.body_fat' => 'percentual de gordura',
        ]);
        $data['values'] = array_intersect_key($data['values'], array_flip(array_column(MeasurementType::cases(), 'value')));

        $created = $this->measurements->record($request->user(), $data);

        return $this->created(BodyMeasurementResource::collection($created), 'Medidas registradas.');
    }

    public function update(Request $request, BodyMeasurement $measurement): JsonResponse
    {
        $this->authorize('update', $measurement);
        $max = $measurement->type === MeasurementType::BODY_FAT ? 'lt:100' : 'max:400';
        $data = $request->validate([
            'value' => ['sometimes', 'numeric', 'gt:0', $max, 'decimal:0,2'],
            'measured_on' => ['sometimes', 'date_format:Y-m-d'],
            'notes' => ['nullable', 'string', 'max:500'],
        ], [], ['value' => 'valor', 'measured_on' => 'data']);

        return $this->success(BodyMeasurementResource::make($this->measurements->update($measurement, $data)), 'Medida atualizada.');
    }

    public function destroy(BodyMeasurement $measurement): JsonResponse
    {
        $this->authorize('delete', $measurement);
        $this->measurements->delete($measurement);

        return $this->success(null, 'Medida excluída.');
    }
}
