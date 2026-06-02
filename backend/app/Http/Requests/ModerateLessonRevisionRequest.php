<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ModerateLessonRevisionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        return [
            'action' => ['required', 'string', 'in:accept,decline'],
            'declined_reason' => ['nullable', 'string', 'max:1000'],
        ];
    }
}