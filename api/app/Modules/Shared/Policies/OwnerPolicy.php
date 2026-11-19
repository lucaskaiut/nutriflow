<?php

namespace App\Modules\Shared\Policies;

use App\Modules\Shared\Contracts\OwnedByUser;
use App\Modules\User\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Dados de saúde são estritamente pessoais: só o dono vê, altera ou exclui.
 * Registros de outra pessoa respondem 404 (não revelam que existem).
 */
class OwnerPolicy
{
    public function view(User $user, OwnedByUser $model): Response
    {
        return $this->owner($user, $model);
    }

    public function update(User $user, OwnedByUser $model): Response
    {
        return $this->owner($user, $model);
    }

    public function delete(User $user, OwnedByUser $model): Response
    {
        return $this->owner($user, $model);
    }

    private function owner(User $user, OwnedByUser $model): Response
    {
        return $model->isOwnedBy($user) ? Response::allow() : Response::denyAsNotFound();
    }
}
