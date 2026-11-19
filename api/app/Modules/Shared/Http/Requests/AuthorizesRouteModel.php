<?php

namespace App\Modules\Shared\Http\Requests;

use Illuminate\Support\Facades\Gate;

/**
 * Autoriza o model da rota ANTES da validação: registros de outra pessoa respondem 404
 * sem que as regras de validação sejam avaliadas sobre eles.
 */
trait AuthorizesRouteModel
{
    public function authorize(): bool
    {
        $model = $this->route($this->routeModelParameter());

        if ($model !== null && ! is_string($model)) {
            Gate::authorize('update', $model);
        }

        return true;
    }

    abstract protected function routeModelParameter(): string;
}
