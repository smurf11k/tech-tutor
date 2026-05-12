<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;

class StoreQuizRequest extends FormRequest
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

    protected function prepareForValidation(): void
    {
        $this->normalizeTextFields(['title', 'description']);

        $questions = $this->input('questions');

        if (!is_array($questions)) {
            return;
        }

        $this->merge([
            'questions' => array_map(function (array $question): array {
                if (isset($question['prompt']) && is_string($question['prompt'])) {
                    $question['prompt'] = $this->sanitizeTextValue($question['prompt']);
                }

                if (isset($question['options']) && is_array($question['options'])) {
                    $question['options'] = array_map(function (array $option): array {
                        if (isset($option['key']) && is_string($option['key'])) {
                            $option['key'] = trim($option['key']);
                        }

                        if (isset($option['text']) && is_string($option['text'])) {
                            $option['text'] = $this->sanitizeTextValue($option['text']);
                        }

                        return $option;
                    }, $question['options']);
                }

                return $question;
            }, $questions),
        ]);
    }

    private function sanitizeTextValue(string $value): string
    {
        return preg_replace('/\s+/u', ' ', trim(strip_tags($value))) ?? trim(strip_tags($value));
    }
}
