<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Closure;

class StoreStripeCheckoutRequest extends FormRequest
{
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
}
