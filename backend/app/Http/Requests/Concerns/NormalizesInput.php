<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Support\Str;

trait NormalizesInput
{
    protected function normalizeTextFields(array $fields, bool $stripTags = true, bool $squish = true): void
    {
        $this->merge($this->normalizeFields($fields, function (string $value) use ($stripTags, $squish): string {
            $normalized = $stripTags ? strip_tags($value) : $value;
            $normalized = trim($normalized);

            if ($squish) {
                $normalized = Str::squish($normalized);
            }

            return $normalized;
        }));
    }

    protected function normalizeLowercaseFields(array $fields): void
    {
        $this->merge($this->normalizeFields($fields, function (string $value): string {
            return Str::lower(trim($value));
        }));
    }

    protected function normalizeTrimmedFields(array $fields): void
    {
        $this->merge($this->normalizeFields($fields, function (string $value): string {
            return trim($value);
        }));
    }

    protected function normalizeStringArrayFields(array $fields): void
    {
        $normalized = [];

        foreach ($fields as $field) {
            if (!$this->has($field)) {
                continue;
            }

            $value = $this->input($field);
            if (!is_array($value)) {
                continue;
            }

            $normalized[$field] = array_values(array_filter(array_map(function ($item): string {
                return trim(strip_tags((string) $item));
            }, $value), fn(string $item): bool => $item !== ''));
        }

        if (!empty($normalized)) {
            $this->merge($normalized);
        }
    }

    protected function normalizeBooleanFields(array $fields): void
    {
        $normalized = [];

        foreach ($fields as $field) {
            if (!$this->has($field)) {
                continue;
            }

            $normalized[$field] = filter_var($this->input($field), FILTER_VALIDATE_BOOLEAN);
        }

        if (!empty($normalized)) {
            $this->merge($normalized);
        }
    }

    /**
     * @param array<int, string> $fields
     * @return array<string, mixed>
     */
    private function normalizeFields(array $fields, callable $transform): array
    {
        $normalized = [];

        foreach ($fields as $field) {
            if (!$this->has($field)) {
                continue;
            }

            $value = $this->input($field);

            if (!is_string($value)) {
                continue;
            }

            $normalized[$field] = $transform($value);
        }

        return $normalized;
    }
}