<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password as PasswordRule;
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
            'nickname' => ['required', 'string', 'lowercase', 'max:255', 'alpha_dash', 'unique:users,nickname'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)->mixedCase()->numbers()->symbols()],
            'role' => ['prohibited'],
            'token_name' => ['sometimes', 'string', 'max:255'],
            'captcha_token' => [Rule::requiredIf(fn(): bool => (bool) config('services.captcha.enabled')), 'nullable', 'string'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeTextFields(['name']);
        $this->normalizeLowercaseFields(['nickname']);
        $this->normalizeLowercaseFields(['email']);
        $this->normalizeTrimmedFields(['token_name']);
    }
}