<?php

namespace App\Modules\Report\Http\Controllers;

use App\Modules\Report\Services\DashboardService;
use App\Modules\Report\Services\ReportService;
use App\Modules\Shared\Http\Controllers\ApiController;
use App\Modules\Tracking\Support\Period;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportController extends ApiController
{
    public function dashboard(Request $request, DashboardService $dashboard): JsonResponse
    {
        $date = $request->validate(['date' => ['nullable', 'date_format:Y-m-d']])['date'] ?? null;

        return $this->success($dashboard->build($request->user(), $date));
    }

    public function report(Request $request, ReportService $reports): JsonResponse
    {
        $period = $request->validate(['period' => ['nullable', Rule::enum(Period::class)]])['period'] ?? Period::MONTH->value;

        return $this->success($reports->build($request->user(), Period::from($period)));
    }
}
