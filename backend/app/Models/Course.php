<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $instructor_id
 * @property string $title
 * @property string $slug
 * @property string|null $description
 * @property string|null $thumbnail_path
 * @property string $price
 * @property bool $is_published
 * @property string|null $published_at
 * @property-read User $instructor
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Module> $modules
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Enrollment> $enrollments
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Quiz> $quizzes
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Review> $reviews
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Payment> $payments
 */
class Course extends Model
{
    use HasFactory;

    protected $fillable = [
        'instructor_id',
        'title',
        'slug',
        'description',
        'thumbnail_path',
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
            'is_published' => 'boolean',
            'published_at' => 'datetime',
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
}
