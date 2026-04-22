<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreQuizAttemptRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'answers' => ['required', 'array'],
            'score' => ['nullable', 'integer', 'min:0', 'max:100'],
            'started_at' => ['nullable', 'date'],
            'completed_at' => ['nullable', 'date'],
        ];
    }
}