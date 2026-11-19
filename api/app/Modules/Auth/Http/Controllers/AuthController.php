<?php

namespace App\Modules\Auth\Http\Controllers;

use App\Modules\ACL\Http\Resources\RoleResource;
use App\Modules\Auth\DTOs\AuthenticatedUser;
use App\Modules\Auth\DTOs\NewTenantData;
use App\Modules\Auth\DTOs\NewUserData;
use App\Modules\Auth\DTOs\RegisterResult;
use App\Modules\Auth\Http\Requests\GoogleLoginRequest;
use App\Modules\Auth\Http\Requests\LoginRequest;
use App\Modules\Auth\Http\Requests\RegisterRequest;
use App\Modules\Auth\Http\Requests\SelectTenantRequest;
use App\Modules\Auth\Services\AuthService;
use App\Modules\Auth\Support\GoogleIdTokenVerifier;
use App\Modules\Billing\Http\Resources\InvoiceResource;
use App\Modules\Shared\Http\Controllers\ApiController;
use App\Modules\Tenant\Http\Resources\AvailableTenantResource;
use App\Modules\Tenant\Http\Resources\TenantResource;
use App\Modules\Tenant\Models\Tenant;
use App\Modules\Tenant\Services\TenantSwitchService;
use App\Modules\Tenant\Support\Facades\TenantContext;
use App\Modules\User\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class AuthController extends ApiController
{
    public function __construct(
        private readonly AuthService $service,
        private readonly TenantSwitchService $tenantSwitch,
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $data = $request->validated();

        // A conta (tenant) é criada a partir da própria pessoa; o domínio é só um identificador interno.
        $result = $this->service->register(
            NewTenantData::personal($data['name'], $data['email']),
            NewUserData::fromArray([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
            ]),
        );

        return $this->created(
            $this->registerPayload($result),
            'Cadastro realizado com sucesso.',
        );
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->service->login(
            $request->validated('email'),
            $request->validated('password'),
        );

        return $this->success($this->authPayload($result), 'Login realizado com sucesso.');
    }

    /** Formas de login disponíveis (o Client ID do Google é público). */
    public function providers(GoogleIdTokenVerifier $google): JsonResponse
    {
        return $this->success([
            'google' => $google->enabled(),
        ]);
    }

    public function google(GoogleLoginRequest $request, GoogleIdTokenVerifier $google): JsonResponse
    {
        abort_unless($google->enabled(), 404);

        $result = $this->service->loginWithGoogle(
            $google->verify($request->validated('credential')),
            (bool) $request->validated('accept_terms', false),
        );

        return $this->success($this->authPayload($result), 'Login realizado com sucesso.');
    }

    public function logout(Request $request): JsonResponse
    {
        $this->service->logout($request->user());

        return $this->success(null, 'Logout realizado com sucesso.');
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles.permissions');
        /** @var Tenant|null $tenant */
        $tenant = TenantContext::tenant();

        return $this->success([
            'user' => UserResource::make($user),
            'tenant' => TenantResource::make($tenant),
            'roles' => RoleResource::collection($user->roles),
            'permissions' => $this->effectivePermissions($user->permissionValues(), $tenant),
            'is_master' => (bool) $user->is_master,
            'available_tenants' => AvailableTenantResource::collection(
                $this->service->availableTenantsFor($user),
            ),
        ]);
    }

    public function selectTenant(SelectTenantRequest $request): JsonResponse
    {
        $tenant = $this->tenantSwitch->select(
            $request->user(),
            $request->validated('tenant_id'),
        );

        return $this->success([
            'tenant' => AvailableTenantResource::make($tenant),
        ], 'Tenant selecionado com sucesso.');
    }

    /**
     * @return array<string, mixed>
     */
    private function registerPayload(RegisterResult $result): array
    {
        return [
            ...$this->authPayload(new AuthenticatedUser(
                user: $result->user,
                tenant: $result->tenant,
                token: $result->token,
                availableTenants: $result->availableTenants,
            )),
            'requires_payment' => $result->requiresPayment,
            'is_trial' => $result->isTrial,
            'trial_days' => $result->trialDays,
            'billing_status' => $result->billingStatus,
            'payment_methods' => $result->paymentMethods,
            'invoice' => $result->invoice
                ? InvoiceResource::make($result->invoice)
                : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function authPayload(AuthenticatedUser $result): array
    {
        return [
            'token' => $result->token,
            'token_type' => 'Bearer',
            'user' => UserResource::make($result->user),
            'tenant' => TenantResource::make($result->tenant),
            'is_master' => (bool) $result->user->is_master,
            'available_tenants' => AvailableTenantResource::collection($result->availableTenants),
        ];
    }

    /**
     * Permissões de plano só são efetivas para tenants umbrella (sem parent_id).
     *
     * @param  Collection<int, string>  $permissions
     * @return list<string>
     */
    private function effectivePermissions(Collection $permissions, ?Tenant $tenant): array
    {
        if ($tenant?->isUmbrella()) {
            return $permissions->values()->all();
        }

        return $permissions
            ->reject(fn (string $permission): bool => str_starts_with($permission, 'plan.'))
            ->values()
            ->all();
    }
}
