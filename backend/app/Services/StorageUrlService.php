<?php

namespace App\Services;

class StorageUrlService
{
    public function publicUrl(string $path): string
    {
        $baseUrl = rtrim(config('app.url', ''), '/');

        if ($baseUrl === '') {
            $baseUrl = rtrim(url(''), '/');
        }

        return $baseUrl . '/api/storage/' . ltrim($path, '/');
    }
}
