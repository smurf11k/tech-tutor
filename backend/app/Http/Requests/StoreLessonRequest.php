<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\NormalizesInput;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;
use Illuminate\Http\UploadedFile;

class StoreLessonRequest extends FormRequest
{
    use NormalizesInput;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash'],
            'type' => ['sometimes', 'string', 'in:text,video,file'],
            'content' => ['nullable', 'string'],
            'video_url' => ['nullable', 'string', 'max:2048'],
            'file_path' => ['nullable', 'string', 'max:255'],
            'lesson_file' => [
                'nullable',
                'file',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (! $value instanceof UploadedFile) {
                        return;
                    }

                    $allowedExtensions = ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'png', 'jpg', 'jpeg', 'webp', 'mp4', 'mov', 'm4v', 'mp3', 'wav', 'zip'];
                    $extension = strtolower((string) $value->getClientOriginalExtension());

                    if (! in_array($extension, $allowedExtensions, true)) {
                        $fail('The lesson file must be one of the supported file types.');
                    }
                },
                'max:51200',
            ],
            'position' => ['sometimes', 'integer', 'min:0'],
            'is_preview' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->normalizeTextFields(['title']);
        $this->normalizeLowercaseFields(['slug']);
        $this->normalizeTrimmedFields(['type', 'content', 'video_url', 'file_path']);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $lessonType = (string) $this->input('type', 'text');

            if ($lessonType !== 'file') {
                return;
            }

            if ($this->hasFile('lesson_file')) {
                return;
            }

            $filePath = (string) $this->input('file_path', '');

            if (trim($filePath) !== '') {
                return;
            }

            $validator->errors()->add('lesson_file', 'A lesson file is required when the lesson type is file.');
        });
    }
}