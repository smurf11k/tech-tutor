<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;

class StorePaymentRequest extends FormRequest
{
    use NormalizesInput;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'provider' => ['required', 'string', 'max:100'],
            'amount' => ['required', 'numeric', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'transaction_id' => ['nullable', 'string', 'max:255', 'unique:payments,transaction_id'],
            'provider_payload' => ['nullable', 'array'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeTextFields(['provider']);
        $this->normalizeTrimmedFields(['currency', 'transaction_id']);
    }
}
