<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;

class UpdateLessonRequest extends FormRequest
{
    use NormalizesInput;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'required', 'string', 'max:255', 'alpha_dash'],
            'type' => ['sometimes', 'string', 'in:text,video,file'],
            'content' => ['nullable', 'string'],
            'video_url' => ['nullable', 'string', 'max:2048'],
            'file_path' => ['nullable', 'string', 'max:255'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'is_preview' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeTextFields(['title']);
        $this->normalizeLowercaseFields(['slug']);
        $this->normalizeTrimmedFields(['type', 'content', 'video_url', 'file_path']);
    }
}