<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateQuizRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'pass_score' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'is_published' => ['sometimes', 'boolean'],
            'questions' => ['sometimes', 'array'],
            'questions.*.type' => ['required_with:questions', 'in:single_choice,multiple_choice'],
            'questions.*.prompt' => ['required_with:questions', 'string'],
            'questions.*.points' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'questions.*.position' => ['sometimes', 'integer', 'min:1'],
            'questions.*.options' => ['required_with:questions', 'array', 'min:2'],
            'questions.*.options.*.key' => ['required_with:questions', 'string', 'max:100'],
            'questions.*.options.*.text' => ['required_with:questions', 'string', 'max:500'],
            'questions.*.options.*.is_correct' => ['sometimes', 'boolean'],
        ];
    }
}
