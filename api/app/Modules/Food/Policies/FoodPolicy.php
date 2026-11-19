<?php

namespace App\Modules\Food\Policies;

use App\Modules\Food\Models\Food;
use App\Modules\User\Models\User;
use Illuminate\Auth\Access\Response;

/** Base de referência: leitura para todos. Personalizados: somente o dono. */
class FoodPolicy
{
    public function view(User $user, Food $food): Response
    {
        return $food->isVisibleTo($user) ? Response::allow() : Response::denyAsNotFound();
    }

    public function update(User $user, Food $food): Response
    {
        if (! $food->isVisibleTo($user)) {
            return Response::denyAsNotFound();
        }

        return $food->isOwnedBy($user) ? Response::allow() : Response::deny('Alimentos da base de referência não podem ser alterados.');
    }

    public function delete(User $user, Food $food): Response
    {
        return $this->update($user, $food);
    }
}
