<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int $module_id
 * @property string $title
 * @property string $slug
 * @property string $type
 * @property string|null $content
 * @property string|null $video_url
 * @property string|null $file_path
 * @property int $position
 * @property bool $is_preview
 * @property-read Module $module
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Comment> $comments
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Progress> $progressEntries
 */
class Lesson extends Model
{
    use HasFactory;

    protected $appends = [
        'file_url',
    ];

    protected $fillable = [
        'module_id',
        'title',
        'slug',
        'type',
        'content',
        'video_url',
        'file_path',
        'position',
        'is_preview',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'is_preview' => 'boolean',
        ];
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    public function progressEntries(): HasMany
    {
        return $this->hasMany(Progress::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->latest();
    }

    protected function fileUrl(): Attribute
    {
        return Attribute::get(function (): ?string {
            if (blank($this->file_path)) {
                return null;
            }

            if (filter_var($this->file_path, FILTER_VALIDATE_URL)) {
                return $this->file_path;
            }

            $publicDiskUrl = rtrim((string) config('filesystems.disks.public.url'), '/');

            return $publicDiskUrl !== ''
                ? $publicDiskUrl . '/' . ltrim($this->file_path, '/')
                : url('storage/' . ltrim($this->file_path, '/'));
        });
    }
}
