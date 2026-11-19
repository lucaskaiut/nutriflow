<?php

namespace App\Modules\Diary\Http\Requests;

use App\Modules\Diary\Enums\MealType;
use App\Modules\Nutrition\Support\ItemRules;
use App\Modules\Shared\Http\Requests\AuthorizesRouteModel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveMealRequest extends FormRequest
{
    use AuthorizesRouteModel;

    protected function routeModelParameter(): string
    {
        return 'meal';
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:2000-01-01', 'before_or_equal:2100-12-31'],
            'time' => ['sometimes', 'nullable', 'date_format:H:i'],
            'type' => [$required, Rule::enum(MealType::class)],
            'custom_name' => ['required_if:type,custom', 'nullable', 'string', 'max:80'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['sometimes', 'array', 'max:50'],
            ...ItemRules::for('items.*'),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['date' => 'data', 'time' => 'horário', 'type' => 'tipo de refeição', 'custom_name' => 'nome da refeição', 'notes' => 'observação'];
    }
}
