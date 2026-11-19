<?php

namespace App\Modules\Diary\Models;

use App\Modules\Diary\Enums\MealType;
use App\Modules\Nutrition\Support\Nutrients;
use App\Modules\Shared\Models\Concerns\HasUuid;
use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Builder;
use App\Modules\Shared\Contracts\OwnedByUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Refeição do diário. date/time são locais (fuso do perfil). */
class Meal extends Model implements OwnedByUser
{
    use HasUuid;

    protected $fillable = ['user_id', 'date', 'time', 'type', 'custom_name', 'notes'];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'type' => MealType::class,
        ];
    }

    public function scopeOwnedBy(Builder $query, User $user): Builder
    {
        return $query->where('meals.user_id', $user->id);
    }

    public function isOwnedBy(User $user): bool
    {
        return (int) $this->user_id === (int) $user->id;
    }

    public function title(): string
    {
        return $this->type === MealType::CUSTOM && filled($this->custom_name)
            ? $this->custom_name
            : $this->type->label();
    }

    /** Totais da refeição = soma dos snapshots dos itens. */
    public function totals(): Nutrients
    {
        return Nutrients::sum($this->items->map(fn (MealItem $item) => $item->totals()));
    }

    /** @return HasMany<MealItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(MealItem::class)->orderBy('position')->orderBy('id');
    }
}
