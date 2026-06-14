<?php

namespace App\Http\Controllers;

use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Storage;
use Throwable;

class StorageController extends Controller
{
    public function show(string $path): Response
    {
        $path = trim($path, '/');

        abort_unless($this->isAllowedPath($path), 404);

        if (str_ends_with(strtolower($path), '.m3u8')) {
            return $this->playlistResponse($path);
        }

        return $this->storageResponse($path);
    }

    private function playlistResponse(string $path): Response
    {
        $contents = Storage::disk('s3')->get($path);

        abort_unless(is_string($contents) && $contents !== '', 404);

        return response($this->rewritePlaylistUrls($path, $contents), 200, [
            'Content-Type' => 'application/vnd.apple.mpegurl',
            'Cache-Control' => 'public, max-age=60',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function storageResponse(string $path): Response
    {
        $stream = Storage::disk('s3')->readStream($path);

        abort_unless(is_resource($stream), 404);

        return response()->stream(function () use ($stream): void {
            fpassthru($stream);
            fclose($stream);
        }, 200, [
            'Content-Type' => $this->contentTypeFor($path),
            'Cache-Control' => 'public, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    private function contentTypeFor(string $path): string
    {
        try {
            return Storage::disk('s3')->mimeType($path) ?: 'application/octet-stream';
        } catch (Throwable) {
            return match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
                'm3u8' => 'application/vnd.apple.mpegurl',
                'ts' => 'video/mp2t',
                'mp4' => 'video/mp4',
                'jpg', 'jpeg' => 'image/jpeg',
                'png' => 'image/png',
                'webp' => 'image/webp',
                'svg' => 'image/svg+xml',
                'pdf' => 'application/pdf',
                default => 'application/octet-stream',
            };
        }
    }

    private function rewritePlaylistUrls(string $path, string $contents): string
    {
        $directory = dirname($path);
        $directory = $directory === '.' ? '' : $directory;

        $contents = preg_replace_callback(
            '/(URI=")([^"]+)(")/',
            fn(array $matches) => $matches[1] . $this->resolveRelativeUrl($directory, $matches[2]) . $matches[3],
            $contents,
        ) ?? $contents;

        return preg_replace_callback(
            '/(^|\r\n|\r|\n)([^#\r\n][^\r\n]*)/',
            fn(array $matches) => $matches[1] . $this->resolveRelativeUrl($directory, trim($matches[2], "\r\n")),
            $contents,
        ) ?? $contents;
    }

    private function resolveRelativeUrl(string $directory, string $url): string
    {
        if ($url === '' || $this->isAbsoluteUrl($url) || str_starts_with($url, '/') || str_starts_with($url, 'blob:') || str_starts_with($url, 'data:')) {
            return $url;
        }

        $prefix = $directory === '' ? '' : rtrim($directory, '/') . '/';

        return '/api/storage/' . ltrim($prefix . $url, '/');
    }

    private function isAbsoluteUrl(string $url): bool
    {
        return (bool) preg_match('/^[a-z][a-z0-9+.-]*:\/\//i', $url);
    }

    private function isAllowedPath(string $path): bool
    {
        if ($path === '' || str_starts_with($path, '/') || str_contains($path, '..')) {
            return false;
        }

        return str_starts_with($path, 'avatars/')
            || str_starts_with($path, 'lesson-videos/')
            || str_starts_with($path, 'course-assets/')
            || str_starts_with($path, 'courses/');
    }
}
