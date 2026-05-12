<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;

class ForgotPasswordRequest extends FormRequest
{
    use NormalizesInput;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'lowercase', 'email'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeLowercaseFields(['email']);
    }
}