<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\NormalizesInput;
use Illuminate\Foundation\Http\FormRequest;

class StoreCourseRequest extends FormRequest
{
    use NormalizesInput;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash', 'unique:courses,slug'],
            'description' => ['nullable', 'string'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'level' => ['nullable', 'string', 'max:50'],
            'language' => ['nullable', 'string', 'max:50'],
            'what_you_will_learn' => ['nullable', 'array', 'min:1'],
            'what_you_will_learn.*' => ['string', 'max:500'],
            'price_benefits' => ['nullable', 'array', 'min:1'],
            'price_benefits.*' => ['string', 'max:500'],
            'tags' => ['nullable', 'array', 'min:3', 'max:5'],
            'tags.*' => ['string', 'max:40', 'distinct'],
            'thumbnail_path' => ['nullable', 'string', 'max:255'],
            'duration_minutes' => ['nullable', 'integer', 'min:0'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'is_published' => ['sometimes', 'boolean'],
            'published_at' => ['nullable', 'date'],
            'request_publish' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeTextFields(['title', 'description', 'subtitle', 'category', 'level', 'language']);
        $this->normalizeLowercaseFields(['slug']);
        $this->normalizeTrimmedFields(['thumbnail_path']);
        $this->normalizeStringArrayFields(['what_you_will_learn', 'price_benefits', 'tags']);
    }
}
