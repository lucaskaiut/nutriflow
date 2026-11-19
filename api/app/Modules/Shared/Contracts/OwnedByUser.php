<?php

namespace App\Modules\Shared\Contracts;

use App\Modules\User\Models\User;

interface OwnedByUser
{
    public function isOwnedBy(User $user): bool;
}
