<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;

class StoreStripeCheckoutRequest extends FormRequest
{
    use NormalizesInput;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'success_url' => ['nullable', 'string', 'max:2048'],
            'cancel_url' => ['nullable', 'string', 'max:2048'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeTrimmedFields(['success_url', 'cancel_url']);
    }
}
