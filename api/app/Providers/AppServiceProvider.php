<?php

namespace App\Providers;

use App\Modules\ACL\Models\Role;
use App\Modules\ACL\Policies\RolePolicy;
use App\Modules\ApiToken\Models\ApiToken;
use App\Modules\Assistant\Models\Conversation;
use App\Modules\Assistant\Policies\ConversationPolicy;
use App\Modules\ApiToken\Policies\ApiTokenPolicy;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Models\Plan;
use App\Modules\Billing\Models\Subscription;
use App\Modules\Billing\Policies\InvoicePolicy;
use App\Modules\Billing\Policies\PlanPolicy;
use App\Modules\Billing\Policies\SubscriptionPolicy;
use App\Modules\Tenant\Models\Tenant;
use App\Modules\Tenant\Policies\TenantPolicy;
use App\Modules\User\Models\User;
use App\Modules\User\Policies\UserPolicy;
use App\Modules\Webhook\Models\Webhook;
use App\Modules\Webhook\Policies\WebhookPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureRateLimiting();
        $this->configurePolicies();
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->getKey() ?: $request->ip());
        });

        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // NutriFlow: uso geral do app autenticado e operações sensíveis (exportar / excluir conta), com chaves distintas.
        RateLimiter::for('app', function (Request $request) {
            return Limit::perMinute(180)->by('app:'.($request->user()?->getKey() ?: $request->ip()));
        });

        RateLimiter::for('sensitive', function (Request $request) {
            return Limit::perMinute(5)->by('sensitive:'.($request->user()?->getKey() ?: $request->ip()));
        });


    }

    private function configurePolicies(): void
    {
        Gate::policy(User::class, UserPolicy::class);

        // NutriFlow: dados de saúde — acesso exclusivo do dono.
        Gate::policy(\App\Modules\Food\Models\Food::class, \App\Modules\Food\Policies\FoodPolicy::class);
        foreach ([
            \App\Modules\Food\Models\FoodPortion::class,
            \App\Modules\Recipe\Models\Recipe::class,
            \App\Modules\SavedMeal\Models\SavedMeal::class,
            \App\Modules\Diary\Models\Meal::class,
            \App\Modules\Diary\Models\MealItem::class,
            \App\Modules\Tracking\Models\WeightEntry::class,
            \App\Modules\Tracking\Models\BodyMeasurement::class,
            \App\Modules\Tracking\Models\WaterEntry::class,
        ] as $model) {
            Gate::policy($model, \App\Modules\Shared\Policies\OwnerPolicy::class);
        }
        Gate::policy(Tenant::class, TenantPolicy::class);
        Gate::policy(Role::class, RolePolicy::class);
        Gate::policy(Conversation::class, ConversationPolicy::class);
        Gate::policy(ApiToken::class, ApiTokenPolicy::class);
        Gate::policy(Webhook::class, WebhookPolicy::class);
        Gate::policy(Plan::class, PlanPolicy::class);
        Gate::policy(Subscription::class, SubscriptionPolicy::class);
        Gate::policy(Invoice::class, InvoicePolicy::class);
    }
}
