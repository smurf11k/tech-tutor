<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreQuizRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'pass_score' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'is_published' => ['sometimes', 'boolean'],
        ];
    }
}