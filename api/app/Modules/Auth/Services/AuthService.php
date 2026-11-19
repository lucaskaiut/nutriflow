<?php

namespace App\Modules\Auth\Services;

use App\Modules\ACL\Enums\DefaultRole;
use App\Modules\ACL\Services\RoleService;
use App\Modules\ApiToken\Models\ApiToken;
use App\Modules\Audit\Enums\AuditAction;
use App\Modules\Audit\Services\AuditLogService;
use App\Modules\Auth\DTOs\AuthenticatedUser;
use App\Modules\Auth\DTOs\NewTenantData;
use App\Modules\Auth\DTOs\NewUserData;
use App\Modules\Auth\DTOs\RegisterResult;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Models\Subscription;
use App\Modules\Billing\Services\BillingService;
use App\Modules\Billing\Services\PlanService;
use App\Modules\Billing\Services\SubscriptionService;
use App\Modules\Billing\Support\PaymentGatewayResolver;
use App\Modules\Tenant\Models\Tenant;
use App\Modules\Tenant\Services\MasterTenantAccessService;
use App\Modules\Tenant\Services\TenantService;
use App\Modules\Tenant\Support\CurrentTenant;
use App\Modules\User\Models\User;
use App\Modules\User\Services\UserService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthService
{
    private const TOKEN_NAME = 'auth_token';

    public function __construct(
        private readonly TenantService $tenants,
        private readonly RoleService $roles,
        private readonly UserService $users,
        private readonly CurrentTenant $context,
        private readonly MasterTenantAccessService $masterAccess,
        private readonly AuditLogService $audit,
        private readonly SubscriptionService $subscriptions,
        private readonly BillingService $billing,
        private readonly PlanService $plans,
        private readonly PaymentGatewayResolver $gateways,
    ) {}

    public function register(
        NewTenantData $tenantData,
        NewUserData $userData,
        ?string $planId = null,
        ?string $paymentGateway = null,
        array $paymentData = [],
    ): RegisterResult {
        [$tenant, $user, $invoice, $subscription, $plan] = DB::transaction(
            function () use ($tenantData, $userData, $planId, $paymentGateway): array {
                $tenant = $this->tenants->create($tenantData->toArray());

                $roles = $this->roles->createDefaultRolesFor($tenant);

                $user = $this->users->createForTenant($tenant, $userData->toArray());

                // NutriFlow: nenhum usuário é master — cada conta só enxerga os próprios dados.

                $user->assignRole($roles[DefaultRole::ADMINISTRATOR->value]);

                $invoice = null;
                $subscription = null;
                $plan = null;

                if ($planId !== null) {
                    $plan = $this->plans->findActiveForSubscription($planId, $tenant);

                    // Método de pagamento é escolhido depois, na plataforma.
                    $gateway = filled($paymentGateway) ? $paymentGateway : null;
                    if ($gateway !== null) {
                        $this->gateways->assertActive($gateway);
                    }

                    $subscription = $this->subscriptions->createForTenant($tenant, $plan, $gateway);

                    if ($plan->requiresImmediatePayment()) {
                        $now = CarbonImmutable::now();
                        $windowDays = max(1, (int) config('billing.payment_window_days', 3));

                        $invoice = $this->billing->createLocalInvoice(
                            $subscription->fresh(['plan', 'tenant']),
                            dueDate: $now,
                            expiresAt: $now->addDays($windowDays),
                        );
                    }
                }

                return [$tenant, $user, $invoice, $subscription, $plan];
            }
        );

        $this->context->set($tenant);

        return new RegisterResult(
            user: $user->load('roles.permissions'),
            tenant: $tenant,
            token: $this->authenticate($user),
            invoice: $invoice,
            requiresPayment: $invoice !== null && $invoice->isOpen(),
            isTrial: $plan?->hasTrial() ?? false,
            trialDays: $plan?->free_trial_days ?? 0,
            billingStatus: $this->resolveBillingStatus($subscription, $invoice),
            paymentMethods: $this->paymentMethodsPayload(),
        );
    }

    /**
     * @throws ValidationException
     */
    public function login(string $email, string $password): AuthenticatedUser
    {
        $user = User::query()
            ->withoutTenancy()
            ->where('email', $email)
            ->first();

        if ($user === null || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['As credenciais informadas são inválidas.'],
            ]);
        }

        return $this->loginUser($user);
    }

    /**
     * Login com Google. Regras de vínculo:
     * - conta já vinculada a esse Google: entra;
     * - conta com o mesmo e-mail (cadastro por senha): vincula. Como o cadastro por senha não
     *   confirma e-mail, se ele nunca foi confirmado a senha antiga e os acessos são invalidados —
     *   quem tivesse criado a conta com o e-mail alheio perde o acesso;
     * - ninguém com esse e-mail: cria a conta, desde que a pessoa aceite o termo de uso dos dados.
     *
     * @param  array{sub: string, email: string, name: string}  $profile
     *
     * @throws ValidationException
     */
    public function loginWithGoogle(array $profile, bool $acceptTerms): AuthenticatedUser
    {
        $user = User::query()->withoutTenancy()->where('google_id', $profile['sub'])->first()
            ?? User::query()->withoutTenancy()->where('email', $profile['email'])->first();

        if ($user === null) {
            if (! $acceptTerms) {
                throw ValidationException::withMessages([
                    'accept_terms' => ['Ainda não há conta com este e-mail. Confirme para criar a sua.'],
                ]);
            }

            $result = $this->register(
                NewTenantData::personal($profile['name'], $profile['email']),
                new NewUserData(name: $profile['name'], email: $profile['email'], phone: null, document: null, password: Str::random(64)),
            );
            $result->user->forceFill(['google_id' => $profile['sub'], 'email_verified_at' => now()])->save();

            return new AuthenticatedUser(
                user: $result->user,
                tenant: $result->tenant,
                token: $result->token,
                availableTenants: $result->availableTenants,
            );
        }

        if ($user->google_id !== null && $user->google_id !== $profile['sub']) {
            throw ValidationException::withMessages([
                'credential' => ['Esta conta já está vinculada a outra conta do Google.'],
            ]);
        }

        if ($user->google_id === null) {
            DB::transaction(function () use ($user, $profile): void {
                if ($user->email_verified_at === null) {
                    $this->revokeAccessOf($user);
                    $user->password = Str::random(64);
                }

                $user->forceFill(['google_id' => $profile['sub'], 'email_verified_at' => $user->email_verified_at ?? now()])->save();
            });
        }

        return $this->loginUser($user);
    }

    private function loginUser(User $user): AuthenticatedUser
    {
        $tenant = $user->tenant;
        $availableTenants = $this->masterAccess->availableTenants($user);

        $this->context->set($tenant);

        if ($user->is_master) {
            $this->audit->record($user, AuditAction::MasterLogin, $tenant);
        }

        return new AuthenticatedUser(
            user: $user->load('roles.permissions'),
            tenant: $tenant,
            token: $this->authenticate($user),
            availableTenants: $availableTenants,
        );
    }

    /** Derruba sessões, tokens pessoais e códigos do leitor da conta. */
    private function revokeAccessOf(User $user): void
    {
        $user->tokens()->delete();
        ApiToken::query()->withoutTenancy()->where('tenant_id', $user->tenant_id)->delete();

        if (config('session.driver') === 'database') {
            DB::table(config('session.table', 'sessions'))->where('user_id', $user->getKey())->delete();
        }
    }

    public function logout(User $user): void
    {
        $token = $user->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        $request = request();

        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }
    }

    /**
     * @return Collection<int, Tenant>
     */
    public function availableTenantsFor(User $user): Collection
    {
        return $this->masterAccess->availableTenants($user);
    }

    private function resolveBillingStatus(?Subscription $subscription, ?Invoice $invoice): string
    {
        if ($subscription === null) {
            return 'none';
        }

        if ($invoice !== null && $invoice->isOpen()) {
            return 'pending_payment';
        }

        if ($subscription->isOnTrial()) {
            return 'trialing';
        }

        return strtolower($subscription->status->value);
    }

    /**
     * @return list<array{id: string, name: string, payment_method: string}>
     */
    private function paymentMethodsPayload(): array
    {
        return array_map(
            fn (array $item): array => [
                'id' => $item['key'],
                'name' => $item['label'],
                'payment_method' => $item['payment_method'],
            ],
            $this->gateways->catalog(),
        );
    }

    /**
     * Autentica via sessão (SPA stateful, cookie HttpOnly) quando disponível;
     * caso contrário emite um personal access token (clientes de API).
     */
    private function authenticate(User $user): ?string
    {
        $request = request();

        if ($request->hasSession()) {
            Auth::guard('web')->login($user);
            $request->session()->regenerate();

            return null;
        }

        return $user->createToken(self::TOKEN_NAME)->plainTextToken;
    }
}
