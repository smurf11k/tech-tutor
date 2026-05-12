<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
{
    use NormalizesInput;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', 'min:8'],
            'role' => ['sometimes', Rule::in(['student', 'instructor'])],
            'token_name' => ['sometimes', 'string', 'max:255'],
            'captcha_token' => [Rule::requiredIf(fn(): bool => (bool) config('services.captcha.secret')), 'nullable', 'string'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeTextFields(['name']);
        $this->normalizeLowercaseFields(['email']);
        $this->normalizeTrimmedFields(['token_name']);
    }
}