<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Scout\Searchable;

/**
 * @property int $id
 * @property int $instructor_id
 * @property string $title
 * @property string $slug
 * @property string|null $description
 * @property string|null $subtitle
 * @property string|null $category
 * @property string|null $level
 * @property string|null $language
 * @property array<int, string>|null $what_you_will_learn
 * @property array<int, string>|null $price_benefits
 * @property string|null $thumbnail_path
 * @property int|null $duration_minutes
 * @property string $price
 * @property bool $is_published
 * @property string|null $published_at
 * @property-read User $instructor
 * @property-read Collection<int, Module> $modules
 * @property-read Collection<int, Enrollment> $enrollments
 * @property-read Collection<int, Quiz> $quizzes
 * @property-read Collection<int, Review> $reviews
 * @property-read Collection<int, Payment> $payments
 * @property-read Collection<int, CourseCertificate> $certificates
 */
class Course extends Model
{
    use HasFactory;
    use Searchable;

    protected $appends = [
        'duration',
        'total_estimated_minutes',
    ];

    protected $fillable = [
        'instructor_id',
        'title',
        'slug',
        'description',
        'subtitle',
        'category',
        'level',
        'language',
        'what_you_will_learn',
        'price_benefits',
        'thumbnail_path',
        'duration_minutes',
        'price',
        'is_published',
        'published_at',
    ];

    public function publishRequests()
    {
        return $this->hasMany(PublishRequest::class);
    }

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'duration_minutes' => 'integer',
            'is_published' => 'boolean',
            'published_at' => 'datetime',
            'what_you_will_learn' => 'array',
            'price_benefits' => 'array',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function resolveRouteBinding($value, $field = null): ?Model
    {
        $query = $this->newQuery();
        $routeField = $field ?? $this->getRouteKeyName();

        $record = $query->where($routeField, $value)->first();
        if ($record instanceof self) {
            return $record;
        }

        if (is_numeric($value)) {
            return $query->whereKey((int) $value)->first();
        }

        return null;
    }

    public function searchableAs(): string
    {
        return 'courses';
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'description' => $this->description,
            'subtitle' => $this->subtitle,
            'category' => $this->category,
            'level' => $this->level,
            'language' => $this->language,
            'what_you_will_learn' => $this->what_you_will_learn,
            'price_benefits' => $this->price_benefits,
            'thumbnail_path' => $this->thumbnail_path,
            'duration_minutes' => $this->duration_minutes,
            'price' => (float) $this->price,
            'is_published' => $this->is_published,
            'published_at' => $this->getRawOriginal('published_at'),
            'instructor_id' => $this->instructor_id,
            'tags' => $this->relationLoaded('tags')
                ? $this->tags->pluck('slug')->values()->all()
                : [],
        ];
    }

    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    public function modules(): HasMany
    {
        return $this->hasMany(Module::class)->orderBy('position');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function quizzes(): HasMany
    {
        return $this->hasMany(Quiz::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(CourseCertificate::class);
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class)->orderBy('name');
    }

    public function getTotalEstimatedMinutesAttribute(): ?int
    {
        if (!$this->relationLoaded('modules')) {
            return $this->duration_minutes;
        }

        $minutes = $this->modules->sum(function (Module $module): int {
            $lessonMinutes = $module->relationLoaded('lessons')
                ? $module->lessons->sum(fn(Lesson $lesson): int => (int) ($lesson->estimated_time_minutes ?? 0))
                : 0;

            $quizMinutes = $module->relationLoaded('quizzes')
                ? $module->quizzes->sum(fn(Quiz $quiz): int => (int) ($quiz->estimated_time_minutes ?? 0))
                : 0;

            return $lessonMinutes + $quizMinutes;
        });

        return $minutes > 0 ? $minutes : $this->duration_minutes;
    }

    public function getDurationAttribute(): ?string
    {
        $minutes = $this->total_estimated_minutes;

        if ($minutes === null || $minutes <= 0) {
            return null;
        }

        if ($minutes < 60) {
            return $minutes . 'm';
        }

        $hours = intdiv($minutes, 60);
        $remainingMinutes = $minutes % 60;

        return $remainingMinutes === 0
            ? $hours . 'h'
            : $hours . 'h ' . $remainingMinutes . 'm';
    }
}
