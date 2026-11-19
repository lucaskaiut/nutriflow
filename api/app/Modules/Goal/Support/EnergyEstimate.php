<?php

namespace App\Modules\Goal\Support;

/**
 * Resultado de uma estimativa energética. É uma ESTIMATIVA populacional (Mifflin-St Jeor ×
 * fator de atividade), não uma prescrição médica ou nutricional; a pessoa pode ajustar tudo.
 */
final readonly class EnergyEstimate
{
    /**
     * @param  list<string>  $missing  campos do perfil que faltam para estimar
     */
    public function __construct(
        public bool $available,
        public array $missing = [],
        public ?int $bmrKcal = null,
        public ?int $tdeeKcal = null,
        public ?int $kcal = null,
        public ?int $proteinG = null,
        public ?int $carbsG = null,
        public ?int $fatG = null,
        public ?int $waterMl = null,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'available' => $this->available,
            'missing' => $this->missing,
            'bmr_kcal' => $this->bmrKcal,
            'tdee_kcal' => $this->tdeeKcal,
            'kcal' => $this->kcal,
            'protein_g' => $this->proteinG,
            'carbs_g' => $this->carbsG,
            'fat_g' => $this->fatG,
            'water_ml' => $this->waterMl,
            'method' => 'Mifflin-St Jeor × fator de atividade; proteína pelo peso meta',
            'disclaimer' => 'Estimativa automática para referência. Não substitui orientação de nutricionista ou médico.',
        ];
    }
}
