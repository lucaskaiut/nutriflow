<?php

namespace App\Modules\Nutrition\Support;

use Brick\Math\BigDecimal;
use Brick\Math\BigNumber;
use Brick\Math\RoundingMode;

/**
 * Conjunto imutável de nutrientes principais com aritmética decimal exata (sem float binário).
 *
 * Um nutriente NULL significa "valor desconhecido na fonte". Em somas ele conta como zero
 * (o total é o que se sabe), mas o valor de origem é preservado como NULL no snapshot.
 */
final readonly class Nutrients
{
    /** Escala interna dos cálculos intermediários; o banco guarda 3 casas. */
    public const SCALE = 6;

    public const KEYS = ['kcal', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g'];

    public function __construct(
        public ?BigDecimal $kcal,
        public ?BigDecimal $protein_g,
        public ?BigDecimal $carbs_g,
        public ?BigDecimal $fat_g,
        public ?BigDecimal $fiber_g,
    ) {}

    public static function zero(): self
    {
        return new self(BigDecimal::zero(), BigDecimal::zero(), BigDecimal::zero(), BigDecimal::zero(), BigDecimal::zero());
    }

    /**
     * @param  array<string, BigNumber|int|float|string|null>  $values  chaves de self::KEYS (ou prefixadas)
     */
    public static function fromArray(array $values, string $prefix = ''): self
    {
        $get = static function (string $key) use ($values, $prefix): ?BigDecimal {
            $value = $values[$prefix.$key] ?? null;

            return $value === null || $value === '' ? null : self::decimal($value);
        };

        return new self($get('kcal'), $get('protein_g'), $get('carbs_g'), $get('fat_g'), $get('fiber_g'));
    }

    public static function decimal(BigNumber|int|float|string $value): BigDecimal
    {
        // float só entra aqui vindo de input já validado; convertido via string para não herdar ruído binário.
        return BigDecimal::of(is_float($value) ? (string) $value : $value);
    }

    /** Multiplica todos os nutrientes por numerator / denominator. */
    public function scale(BigNumber|int|string $numerator, BigNumber|int|string $denominator): self
    {
        $num = BigDecimal::of($numerator);
        $den = BigDecimal::of($denominator);

        if ($den->isZero()) {
            throw new \InvalidArgumentException('O denominador da escala não pode ser zero.');
        }

        return $this->map(fn (BigDecimal $v): BigDecimal => $v->multipliedBy($num)->dividedBy($den, self::SCALE, RoundingMode::HalfUp));
    }

    public function dividedBy(BigNumber|int|string $divisor): self
    {
        return $this->scale(1, $divisor);
    }

    public function plus(self $other): self
    {
        $sum = static fn (?BigDecimal $a, ?BigDecimal $b): BigDecimal => ($a ?? BigDecimal::zero())->plus($b ?? BigDecimal::zero());

        return new self(
            $sum($this->kcal, $other->kcal),
            $sum($this->protein_g, $other->protein_g),
            $sum($this->carbs_g, $other->carbs_g),
            $sum($this->fat_g, $other->fat_g),
            $sum($this->fiber_g, $other->fiber_g),
        );
    }

    /**
     * @param  iterable<self>  $items
     */
    public static function sum(iterable $items): self
    {
        $total = self::zero();
        foreach ($items as $item) {
            $total = $total->plus($item);
        }

        return $total;
    }

    /** Nutrientes desconhecidos viram zero (para totais exibidos). */
    public function orZero(): self
    {
        return $this->plus(self::zero());
    }

    public function get(string $key): ?BigDecimal
    {
        return $this->{$key};
    }

    /**
     * Valores para persistência (3 casas, string decimal).
     *
     * @return array<string, ?string>
     */
    public function toStorage(string $prefix = ''): array
    {
        $out = [];
        foreach (self::KEYS as $key) {
            $value = $this->{$key};
            $out[$prefix.$key] = $value?->toScale(3, RoundingMode::HalfUp)->__toString();
        }

        return $out;
    }

    /**
     * Valores para a API: kcal com 1 casa e gramas com 1 casa, como número JSON.
     * O arredondamento acontece só na borda; somas usam os valores completos.
     *
     * @return array<string, float|null>
     */
    public function toApi(): array
    {
        $out = [];
        foreach (self::KEYS as $key) {
            $value = $this->{$key};
            $out[$key] = $value === null ? null : (float) (string) $value->toScale(1, RoundingMode::HalfUp);
        }

        return $out;
    }

    private function map(callable $fn): self
    {
        $apply = static fn (?BigDecimal $v): ?BigDecimal => $v === null ? null : $fn($v);

        return new self($apply($this->kcal), $apply($this->protein_g), $apply($this->carbs_g), $apply($this->fat_g), $apply($this->fiber_g));
    }
}
