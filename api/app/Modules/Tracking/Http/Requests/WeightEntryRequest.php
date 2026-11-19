<?php

namespace App\Modules\Tracking\Http\Requests;

use App\Modules\Shared\Http\Requests\AuthorizesRouteModel;
use Illuminate\Foundation\Http\FormRequest;

class WeightEntryRequest extends FormRequest
{
    use AuthorizesRouteModel;

    protected function routeModelParameter(): string
    {
        return 'weight';
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'weight_kg' => [$required, 'numeric', 'gt:0', 'min:20', 'max:500', 'decimal:0,2'],
            'measured_on' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:1900-01-01', 'before_or_equal:2100-12-31'],
            'measured_at' => ['sometimes', 'nullable', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['weight_kg' => 'peso', 'measured_on' => 'data da pesagem', 'measured_at' => 'horário', 'notes' => 'observação'];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['weight_kg.gt' => 'Informe um peso válido, maior que zero.', 'weight_kg.min' => 'Informe um peso válido (mínimo 20 kg).'];
    }
}
