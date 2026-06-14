<?php

namespace App\Models;

use App\Notifications\ResetPasswordNotification;
use App\Services\StorageUrlService;
use Database\Factories\UserFactory;
use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailBehavior;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $name
 * @property string $nickname
 * @property string $email
 * @property string|null $email_verified_at
 * @property string $password
 * @property string $role
 * @property string|null $bio
 * @property bool $is_banned
 * @property string|null $banned_at
     * @property bool $email_notifications_enabled
     * @property bool $email_notifications_comment_reply
     * @property bool $email_notifications_thread
     * @property bool $email_notifications_quiz_result
     * @property bool $email_notifications_new_course
     * @property bool $email_notifications_new_content
     * @property bool $email_notifications_new_enrollment
     * @property bool $email_notifications_instructor_quiz_result
     * @property bool $email_notifications_approval_result
     * @property bool $email_notifications_course_submitted
 * @property bool $email_notifications_lesson_submitted
 * @property bool $email_notifications_review_declined
 * @property string|null $avatar_path
 * @property-read Collection<int, Course> $taughtCourses
 * @property-read Collection<int, Enrollment> $enrollments
 * @property-read Collection<int, Progress> $progressEntries
 * @property-read Collection<int, QuizAttempt> $quizAttempts
 * @property-read Collection<int, Review> $reviews
 * @property-read Collection<int, Comment> $comments
 * @property-read Collection<int, Payment> $payments
 * @property-read Collection<int, CourseCertificate> $certificates
 */
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, MustVerifyEmailBehavior, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'nickname',
        'email',
        'bio',
        'password',
        'role',
        'is_banned',
        'banned_at',
        'email_notifications_enabled',
        'email_notifications_comment_reply',
        'email_notifications_thread',
        'email_notifications_quiz_result',
        'email_notifications_new_course',
        'email_notifications_new_content',
        'email_notifications_new_enrollment',
        'email_notifications_instructor_quiz_result',
        'email_notifications_approval_result',
        'email_notifications_course_submitted',
        'email_notifications_lesson_submitted',
        'email_notifications_review_declined',
        'avatar_path',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'role_badge',
        'avatar_url',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => 'string',
            'is_banned' => 'boolean',
            'banned_at' => 'datetime',
            'email_notifications_enabled' => 'boolean',
            'email_notifications_comment_reply' => 'boolean',
            'email_notifications_thread' => 'boolean',
            'email_notifications_quiz_result' => 'boolean',
            'email_notifications_new_course' => 'boolean',
            'email_notifications_new_content' => 'boolean',
            'email_notifications_new_enrollment' => 'boolean',
            'email_notifications_instructor_quiz_result' => 'boolean',
            'email_notifications_approval_result' => 'boolean',
            'email_notifications_course_submitted' => 'boolean',
            'email_notifications_lesson_submitted' => 'boolean',
            'email_notifications_review_declined' => 'boolean',
        ];
    }

    public function taughtCourses(): HasMany
    {
        return $this->hasMany(Course::class, 'instructor_id');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function progressEntries(): HasMany
    {
        return $this->hasMany(Progress::class);
    }

    public function quizAttempts(): HasMany
    {
        return $this->hasMany(QuizAttempt::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(CourseCertificate::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isInstructor(): bool
    {
        return in_array($this->role, ['admin', 'instructor'], true);
    }

    public function isBanned(): bool
    {
        return (bool) $this->is_banned;
    }

    protected function roleBadge(): Attribute
    {
        return Attribute::make(
            get: fn() => match ($this->role) {
                'admin' => 'Admin',
                'instructor' => 'Instructor',
                default => null,
            }
        );
    }

    protected function avatarUrl(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->avatar_path
                ? app(StorageUrlService::class)->publicUrl($this->avatar_path)
                : null,
        );
    }

    public function sendPasswordResetNotification(#[\SensitiveParameter] $token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    public static function generateUniqueNickname(string $seed, ?int $ignoreUserId = null): string
    {
        $base = Str::slug(trim($seed), '-') ?: 'user';
        $candidate = $base;
        $suffix = 2;

        while (
            static::query()
                ->when($ignoreUserId, fn($query) => $query->whereKeyNot($ignoreUserId))
                ->where('nickname', $candidate)
                ->exists()
        ) {
            $candidate = $base . '-' . $suffix;
            $suffix++;
        }

        return $candidate;
    }

    public function deleteAccount(): void
    {
        if ($this->avatar_path) {
            try {
                Storage::disk('s3')->delete($this->avatar_path);
            } catch (\Throwable $e) {
                // Storage may not be configured in testing environment
            }
        }

        $this->tokens()->delete();
        $this->delete();
    }

    public function canReceiveEmailNotification(string $type): bool
    {
        if (! $this->email_notifications_enabled) {
            return false;
        }

        return match ($type) {
            'comment_reply' => $this->email_notifications_comment_reply,
            'thread' => $this->email_notifications_thread,
            'quiz_result' => $this->email_notifications_quiz_result,
            'new_course' => $this->email_notifications_new_course,
            'new_content' => $this->email_notifications_new_content,
            'new_enrollment' => $this->email_notifications_new_enrollment,
            'instructor_quiz_result' => $this->email_notifications_instructor_quiz_result,
            'approval_result' => $this->email_notifications_approval_result,
            'course_submitted' => $this->email_notifications_course_submitted,
            'lesson_submitted' => $this->email_notifications_lesson_submitted,
            default => true,
        };
    }
}
