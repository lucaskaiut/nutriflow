<?php

namespace App\Modules\SavedMeal\Http\Requests;

use App\Modules\Diary\Enums\MealType;
use App\Modules\Nutrition\Support\ItemRules;
use App\Modules\Shared\Http\Requests\AuthorizesRouteModel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveSavedMealRequest extends FormRequest
{
    use AuthorizesRouteModel;

    protected function routeModelParameter(): string
    {
        return 'savedMeal';
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'min:2', 'max:160'],
            'description' => ['nullable', 'string', 'max:500'],
            'meal_type' => ['nullable', Rule::enum(MealType::class)],
            'is_favorite' => ['sometimes', 'boolean'],
            'items' => [$required, 'array', 'min:1', 'max:50'],
            ...ItemRules::for('items.*'),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['items.min' => 'Adicione pelo menos um item.', 'items.required' => 'Adicione pelo menos um item.'];
    }
}
