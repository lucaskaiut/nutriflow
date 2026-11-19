<?php

namespace App\Modules\Recipe\Http\Requests;

use App\Modules\Nutrition\Support\ItemRules;
use App\Modules\Shared\Http\Requests\AuthorizesRouteModel;
use Illuminate\Foundation\Http\FormRequest;

class SaveRecipeRequest extends FormRequest
{
    use AuthorizesRouteModel;

    protected function routeModelParameter(): string
    {
        return 'recipe';
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'min:2', 'max:160'],
            'description' => ['nullable', 'string', 'max:2000'],
            'servings' => [$required, 'numeric', 'gt:0', 'max:1000', 'decimal:0,2'],
            'yield_weight_g' => ['nullable', 'numeric', 'gt:0', 'max:1000000', 'decimal:0,1'],
            'prep_time_minutes' => ['nullable', 'integer', 'min:1', 'max:6000'],
            'instructions' => ['nullable', 'string', 'max:10000'],
            'is_favorite' => ['sometimes', 'boolean'],
            'ingredients' => [$required, 'array', 'min:1', 'max:100'],
            ...ItemRules::for('ingredients.*', allowRecipes: false),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['ingredients.min' => 'Adicione pelo menos um ingrediente.', 'ingredients.required' => 'Adicione pelo menos um ingrediente.'];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nome', 'servings' => 'quantidade de porções', 'yield_weight_g' => 'rendimento total',
            'ingredients.*.quantity' => 'quantidade', 'ingredients.*.unit' => 'unidade', 'ingredients.*.food_id' => 'alimento',
        ];
    }
}
