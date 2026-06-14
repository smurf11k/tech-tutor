<?php

namespace App\Services;

use App\Jobs\TranscodeLessonVideoJob;
use App\Services\StorageUrlService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class LessonVideoHlsService
{
    public function __construct(private readonly StorageUrlService $storageUrlService)
    {
    }

    /**
     * @return array{manifest_path: string, manifest_url: string}
     */
    public function queueTranscoding(UploadedFile $videoFile, string $remoteDirectory): array
    {
        $remoteDirectory = trim($remoteDirectory, '/');
        $sourceName = Str::uuid()->toString() . '.' . $this->guessExtension($videoFile);
        $sourcePath = 'lesson-videos/pending/' . $sourceName;
        $sourceStream = fopen($videoFile->getRealPath(), 'rb');

        if ($sourceStream === false) {
            throw new RuntimeException('Unable to read the uploaded video file.');
        }

        try {
            $uploaded = Storage::disk('s3')->put($sourcePath, $sourceStream, [
                'visibility' => 'private',
            ]);
        } finally {
            fclose($sourceStream);
        }

        if (!$uploaded) {
            throw new RuntimeException('Unable to upload the source video to object storage.');
        }

        TranscodeLessonVideoJob::dispatch($sourcePath, $remoteDirectory);

        $remoteManifestPath = $remoteDirectory . '/index.m3u8';

        return [
            'manifest_path' => $remoteManifestPath,
            'manifest_url' => $this->buildPublicUrl($remoteManifestPath),
        ];
    }

    private function guessExtension(UploadedFile $videoFile): string
    {
        return strtolower($videoFile->getClientOriginalExtension() ?: $videoFile->extension() ?: 'mp4');
    }

    private function buildPublicUrl(string $path): string
    {
        return $this->storageUrlService->publicUrl($path);
    }
}