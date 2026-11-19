<?php

namespace App\Modules\Account\Http\Controllers;

use App\Modules\Account\Services\PasswordResetService;
use App\Modules\Shared\Http\Controllers\ApiController;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

class PasswordResetController extends ApiController
{
    public function __construct(private readonly PasswordResetService $service) {}

    public function forgot(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email', 'max:255']]);
        $this->service->request($data['email']);

        // mesma resposta exista ou não a conta
        return $this->success(null, 'Se houver uma conta com este e-mail, enviamos um código de verificação.');
    }

    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'code' => ['required', 'digits:6'],
            'password' => ['required', 'string', 'confirmed', Password::min(8)],
        ]);
        $this->service->reset($data['email'], $data['code'], $data['password']);

        return $this->success(null, 'Senha redefinida. Entre com a nova senha.');
    }
}
