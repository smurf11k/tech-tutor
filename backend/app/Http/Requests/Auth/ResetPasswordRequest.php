<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    use NormalizesInput;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'lowercase', 'email'],
            'password' => ['required', 'confirmed', 'min:8'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeTrimmedFields(['token']);
        $this->normalizeLowercaseFields(['email']);
    }
}