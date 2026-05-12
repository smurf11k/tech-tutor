<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LoginRequest extends FormRequest
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
            'password' => ['required', 'string'],
            'token_name' => ['sometimes', 'string', 'max:255'],
            'captcha_token' => [Rule::requiredIf(fn(): bool => (bool) config('services.captcha.secret')), 'nullable', 'string'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeLowercaseFields(['email']);
        $this->normalizeTrimmedFields(['token_name']);
    }
}