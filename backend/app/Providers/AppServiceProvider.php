<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
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
        RateLimiter::for('auth', function (Request $request): array {
            return [
                Limit::perMinute(20)->by($request->ip()),
            ];
        });

        RateLimiter::for('auth-email', function (Request $request): array {
            return [
                Limit::perMinute(5)->by($request->ip()),
            ];
        });

        RateLimiter::for('auth-oauth', function (Request $request): array {
            return [
                Limit::perMinute(10)->by($request->ip()),
            ];
        });
    }
}
