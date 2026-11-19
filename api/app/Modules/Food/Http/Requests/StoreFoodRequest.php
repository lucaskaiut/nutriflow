<?php

namespace App\Modules\Food\Http\Requests;

use App\Modules\Shared\Http\Requests\AuthorizesRouteModel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFoodRequest extends FormRequest
{
    use AuthorizesRouteModel;

    protected function routeModelParameter(): string
    {
        return 'food';
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $required = $this->isMethod('post') ? 'required' : 'sometimes';
        $nutrient = ['nullable', 'numeric', 'min:0', 'max:100000', 'decimal:0,3'];

        return [
            'name' => [$required, 'string', 'min:2', 'max:160'],
            'description' => ['nullable', 'string', 'max:500'],
            'category' => ['nullable', 'string', Rule::exists('food_categories', 'slug')],
            'reference_amount' => [$required, 'numeric', 'gt:0', 'max:100000', 'decimal:0,3'],
            'reference_unit' => [$required, Rule::in(['g', 'ml', 'un'])],
            'kcal' => [$required, ...$nutrient],
            'protein_g' => [$required, ...$nutrient],
            'carbs_g' => [$required, ...$nutrient],
            'fat_g' => [$required, ...$nutrient],
            'fiber_g' => $nutrient,
            'nutrients' => ['sometimes', 'array'],
            'nutrients.*' => $nutrient,
            'nutrients.sodium_mg' => $nutrient,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        $data = $this->safe()->except(['category']);
        if ($this->has('category')) {
            $data['food_category_id'] = $this->filled('category')
                ? \App\Modules\Food\Models\FoodCategory::query()->where('slug', $this->input('category'))->value('id')
                : null;
        }
        if (isset($data['nutrients'])) {
            $allowed = ['sodium_mg', 'cholesterol_mg', 'calcium_mg', 'iron_mg', 'potassium_mg', 'magnesium_mg', 'phosphorus_mg', 'zinc_mg', 'vitamin_c_mg', 'sugar_g', 'saturated_fat_g'];
            $data['nutrients'] = array_intersect_key($data['nutrients'], array_flip($allowed));
        }

        return $data;
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nome', 'reference_amount' => 'quantidade de referência', 'reference_unit' => 'unidade de referência',
            'kcal' => 'calorias', 'protein_g' => 'proteínas', 'carbs_g' => 'carboidratos', 'fat_g' => 'gorduras', 'fiber_g' => 'fibras',
        ];
    }
}
