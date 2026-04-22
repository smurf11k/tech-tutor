<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLessonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash'],
            'type' => ['sometimes', 'string', 'in:text,video,file'],
            'content' => ['nullable', 'string'],
            'video_url' => ['nullable', 'string', 'max:2048'],
            'file_path' => ['nullable', 'string', 'max:255'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'is_preview' => ['sometimes', 'boolean'],
        ];
    }
}