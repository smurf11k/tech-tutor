<?php

use App\Http\Controllers\AdminModerationQueueController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\DevTokenController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Middleware\EnsureUserIsNotBanned;
use App\Http\Controllers\LessonController;
use App\Http\Controllers\ModuleController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProgressController;
use App\Http\Controllers\QuizAttemptController;
use App\Http\Controllers\QuizController;
use App\Http\Controllers\ReviewController;
use Illuminate\Support\Facades\Route;

Route::apiResource('courses', CourseController::class)->only(['index', 'show']);

Route::post('dev/token', DevTokenController::class);

Route::middleware(['auth:sanctum', EnsureUserIsNotBanned::class])->group(function () {
	Route::get('admin/users', [AdminUserController::class, 'index']);
	Route::patch('admin/users/{user}', [AdminUserController::class, 'update']);
	Route::get('admin/moderation-queue', [AdminModerationQueueController::class, 'index']);
	Route::patch('admin/moderation-queue/reviews/{review}', [AdminModerationQueueController::class, 'updateReview']);
	Route::apiResource('courses', CourseController::class)->except(['index', 'show']);
	Route::apiResource('courses.enrollments', EnrollmentController::class)->only(['index', 'store', 'destroy']);
	Route::apiResource('courses.modules', ModuleController::class);
	Route::apiResource('modules.lessons', LessonController::class);
	Route::apiResource('courses.quizzes', QuizController::class);
	Route::apiResource('quizzes.attempts', QuizAttemptController::class)->only(['index', 'store']);
	Route::apiResource('courses.reviews', ReviewController::class)->only(['index', 'store', 'update', 'destroy']);
	Route::apiResource('payments', PaymentController::class)->only(['index']);
	Route::post('courses/{course}/payments', [PaymentController::class, 'store']);
	Route::post('lessons/{lesson}/progress', [ProgressController::class, 'store']);
	Route::put('lessons/{lesson}/progress', [ProgressController::class, 'update']);
});
