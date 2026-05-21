<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;

class StoreCommentRequest extends FormRequest
{
    use NormalizesInput;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:2000'],
            'parent_comment_id' => ['nullable', 'integer', 'exists:comments,id'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeTextFields(['body']);
    }
}
