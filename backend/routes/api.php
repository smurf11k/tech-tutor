<?php

use App\Http\Controllers\AdminModerationQueueController;
use App\Http\Controllers\AdminPlatformDashboardController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\CourseCertificateController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\DevTokenController;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\InstructorDashboardController;
use App\Http\Controllers\LessonController;
use App\Http\Controllers\ModuleController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProgressController;
use App\Http\Controllers\QuizAnalyticsController;
use App\Http\Controllers\QuizAttemptController;
use App\Http\Controllers\QuizController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\StripeWebhookController;
use App\Http\Controllers\PaymentStatusController;
use App\Http\Middleware\EnsureUserIsNotBanned;
use Illuminate\Support\Facades\Route;

Route::apiResource('courses', CourseController::class)->only(['index', 'show']);

Route::post('dev/token', DevTokenController::class);
Route::post('auth/register', [AuthController::class, 'register'])->middleware('throttle:auth');
Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:auth');
Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:auth');
Route::post('auth/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:auth');
Route::get('auth/password/reset/{token}', fn(string $token) => response()->json([
    'token' => $token,
    'email' => request('email'),
]))->name('password.reset');
Route::get('auth/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware('signed')
    ->name('verification.verify');
Route::post('stripe/webhook', StripeWebhookController::class);
Route::get('payments/status', [PaymentStatusController::class, 'show']);

Route::middleware(['auth:sanctum', EnsureUserIsNotBanned::class])->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::post('auth/email/resend', [AuthController::class, 'resendVerification'])->middleware('throttle:auth-email');
    Route::get('admin/users', [AdminUserController::class, 'index']);
    Route::patch('admin/users/{user}', [AdminUserController::class, 'update']);
    Route::get('admin/platform-dashboard', [AdminPlatformDashboardController::class, 'show']);
    Route::get('admin/moderation-queue', [AdminModerationQueueController::class, 'index']);
    Route::patch('admin/moderation-queue/reviews/{review}', [AdminModerationQueueController::class, 'updateReview']);
    Route::patch('admin/moderation-queue/comments/{comment}', [AdminModerationQueueController::class, 'updateComment']);
    Route::get('certificates', [CourseCertificateController::class, 'index']);
    Route::get('certificates/{certificate}', [CourseCertificateController::class, 'show']);
    Route::post('courses/{course}/certificate', [CourseCertificateController::class, 'store']);
    Route::get('instructor/dashboard', [InstructorDashboardController::class, 'show']);
    Route::apiResource('courses', CourseController::class)->except(['index', 'show']);
    Route::apiResource('courses.enrollments', EnrollmentController::class)->only(['index', 'store', 'destroy']);
    Route::apiResource('courses.modules', ModuleController::class);
    Route::apiResource('modules.lessons', LessonController::class);
    Route::apiResource('lessons.comments', CommentController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::apiResource('courses.quizzes', QuizController::class);
    Route::get('quizzes/{quiz}/analytics', [QuizAnalyticsController::class, 'show']);
    Route::apiResource('quizzes.attempts', QuizAttemptController::class)->only(['index', 'store']);
    Route::apiResource('courses.reviews', ReviewController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::apiResource('payments', PaymentController::class)->only(['index', 'show']);
    Route::post('payments/stripe/confirm', [PaymentController::class, 'confirmStripeCheckout']);
    Route::post('courses/{course}/payments', [PaymentController::class, 'store']);
    Route::post('courses/{course}/payments/stripe-checkout', [PaymentController::class, 'stripeCheckout']);
    Route::post('lessons/{lesson}/progress', [ProgressController::class, 'store']);
    Route::put('lessons/{lesson}/progress', [ProgressController::class, 'update']);
});
