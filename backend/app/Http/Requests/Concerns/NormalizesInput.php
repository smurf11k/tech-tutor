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