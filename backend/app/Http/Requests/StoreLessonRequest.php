<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;

class StoreLessonRequest extends FormRequest
{
    use NormalizesInput;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash'],
            'type' => ['sometimes', 'string', 'in:lesson'],
            'content' => ['nullable', 'string'],
            'video_url' => ['nullable', 'string', 'max:2048'],
            'video_name' => ['nullable', 'string', 'max:255'],
            'video' => ['nullable', 'file', 'mimetypes:video/mp4,video/quicktime,video/webm,video/x-matroska', 'max:512000'],
            'remove_video' => ['sometimes', 'boolean'],
            'estimated_time_minutes' => ['nullable', 'integer', 'min:0'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'revision_status' => ['sometimes', 'string', 'in:draft,pending_review,pending_unpublish,published'],
            'is_published' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeTextFields(['title']);
        $this->normalizeLowercaseFields(['slug']);
        $this->normalizeTrimmedFields(['type', 'content', 'video_url', 'video_name']);
        $this->normalizeTrimmedFields(['revision_status']);
        $this->normalizeBooleanFields(['is_published', 'remove_video']);
    }
}