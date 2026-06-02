<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Process\Process;

class TranscodeLessonVideoJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    private const RENDITIONS = [
        [
            'name' => '1080p',
            'width' => 1920,
            'height' => 1080,
            'bitrate' => '5000k',
            'maxrate' => '5350k',
            'bufsize' => '7500k',
        ],
        [
            'name' => '720p',
            'width' => 1280,
            'height' => 720,
            'bitrate' => '2800k',
            'maxrate' => '2990k',
            'bufsize' => '4200k',
        ],
        [
            'name' => '480p',
            'width' => 854,
            'height' => 480,
            'bitrate' => '1400k',
            'maxrate' => '1495k',
            'bufsize' => '2100k',
        ],
    ];

    public function __construct(
        public readonly string $sourcePath,
        public readonly string $remoteDirectory,
    ) {
    }

    public function handle(): void
    {
        $tempDirectory = storage_path('app/tmp/hls/' . Str::uuid());
        File::ensureDirectoryExists($tempDirectory);

        $sourceFile = $tempDirectory . DIRECTORY_SEPARATOR . basename($this->sourcePath);
        $manifestName = 'index.m3u8';
        $manifestPath = $tempDirectory . DIRECTORY_SEPARATOR . $manifestName;
        $sourceWasProcessed = false;

        try {
            $sourceStream = Storage::disk('s3')->readStream($this->sourcePath);
            $sourceHandle = fopen($sourceFile, 'wb');

            if ($sourceHandle === false) {
                throw new RuntimeException('Unable to create a temporary source video file.');
            }

            try {
                if (is_resource($sourceStream)) {
                    if (stream_copy_to_stream($sourceStream, $sourceHandle) === false) {
                        throw new RuntimeException('Unable to copy the source video to a temporary file.');
                    }

                    fclose($sourceStream);
                } else {
                    $sourceContents = Storage::disk('s3')->get($this->sourcePath);

                    if (!is_string($sourceContents) || $sourceContents === '') {
                        throw new RuntimeException('Unable to read the source video from storage.');
                    }

                    fwrite($sourceHandle, $sourceContents);
                }
            } finally {
                fclose($sourceHandle);
            }

            $renditions = $this->getRenditionsForSource($sourceFile);

            $this->encodeRenditions($sourceFile, $tempDirectory, $manifestPath, $renditions);

            $remoteDirectory = trim($this->remoteDirectory, '/');

            foreach (File::allFiles($tempDirectory) as $file) {
                $relativePath = Str::of($file->getPathname())
                    ->replace($tempDirectory . DIRECTORY_SEPARATOR, '')
                    ->replace(DIRECTORY_SEPARATOR, '/')
                    ->toString();

                $remotePath = $remoteDirectory . '/' . $relativePath;
                $stream = fopen($file->getPathname(), 'rb');

                if ($stream === false) {
                    throw new RuntimeException('Unable to stream HLS output to storage.');
                }

                Storage::disk('s3')->put($remotePath, $stream, ['visibility' => 'public']);
                fclose($stream);
            }

            $sourceWasProcessed = true;
        } finally {
            if ($sourceWasProcessed) {
                Storage::disk('s3')->delete($this->sourcePath);
            }

            File::deleteDirectory($tempDirectory);
        }
    }

    private function getRenditionsForSource(string $sourceFile): array
    {
        $probe = new Process([
            'ffprobe',
            '-v',
            'error',
            '-select_streams',
            'v:0',
            '-show_entries',
            'stream=width,height',
            '-of',
            'json',
            $sourceFile,
        ]);

        try {
            $probe->mustRun();
            $data = json_decode($probe->getOutput(), true, flags: JSON_THROW_ON_ERROR);
            $stream = $data['streams'][0] ?? null;
            $sourceWidth = (int) ($stream['width'] ?? 0);
            $sourceHeight = (int) ($stream['height'] ?? 0);
        } catch (\Throwable) {
            return $this->getFallbackRenditions();
        }

        if ($sourceWidth <= 0 || $sourceHeight <= 0) {
            return $this->getFallbackRenditions();
        }

        $availableRenditions = array_values(array_filter(
            self::RENDITIONS,
            static fn(array $rendition): bool =>
            $rendition['width'] <= $sourceWidth && $rendition['height'] <= $sourceHeight,
        ));

        if ($availableRenditions !== []) {
            return $availableRenditions;
        }

        return [
            [
                'name' => $sourceHeight . 'p',
                'width' => $sourceWidth,
                'height' => $sourceHeight,
                'bitrate' => '1000k',
                'maxrate' => '1060k',
                'bufsize' => '1500k',
            ]
        ];
    }

    private function getFallbackRenditions(): array
    {
        return array_values(array_filter(
            self::RENDITIONS,
            static fn(array $rendition): bool => $rendition['height'] <= 720,
        ));
    }

    private function encodeRenditions(string $sourceFile, string $tempDirectory, string $manifestPath, array $renditions): void
    {
        $variantEntries = [];

        foreach ($renditions as $index => $rendition) {
            $renditionDirectory = $tempDirectory . DIRECTORY_SEPARATOR . $rendition['name'];
            File::ensureDirectoryExists($renditionDirectory);

            $segmentPattern = $renditionDirectory . DIRECTORY_SEPARATOR . 'segment_%03d.ts';
            $variantManifest = $renditionDirectory . DIRECTORY_SEPARATOR . 'index.m3u8';

            $process = new Process([
                'ffmpeg',
                '-y',
                '-i',
                $sourceFile,
                '-map',
                '0:v:0',
                '-map',
                '0:a:0?',
                '-c:v',
                'libx264',
                '-preset',
                'veryfast',
                '-c:a',
                'aac',
                '-b:a',
                '128k',
                '-ac',
                '2',
                '-ar',
                '48000',
                '-pix_fmt',
                'yuv420p',
                '-vf',
                sprintf('scale=w=%d:h=%d:force_original_aspect_ratio=decrease:force_divisible_by=2', $rendition['width'], $rendition['height']),
                '-b:v',
                $rendition['bitrate'],
                '-maxrate',
                $rendition['maxrate'],
                '-bufsize',
                $rendition['bufsize'],
                '-g',
                '48',
                '-sc_threshold',
                '0',
                '-hls_time',
                '6',
                '-hls_playlist_type',
                'vod',
                '-hls_segment_filename',
                $segmentPattern,
                $variantManifest,
            ]);

            $process->setTimeout(null);
            $process->mustRun();

            $variantEntries[] = [
                'name' => $rendition['name'],
                'bandwidth' => (int) preg_replace('/\D+/', '', $rendition['bitrate']) * 1000,
                'resolution' => $rendition['width'] . 'x' . $rendition['height'],
            ];
        }

        $masterLines = ['#EXTM3U', '#EXT-X-VERSION:3'];

        foreach ($variantEntries as $entry) {
            $masterLines[] = sprintf(
                '#EXT-X-STREAM-INF:BANDWIDTH=%d,RESOLUTION=%s',
                $entry['bandwidth'],
                $entry['resolution'],
            );
            $masterLines[] = $entry['name'] . '/index.m3u8';
        }

        File::put($manifestPath, implode(PHP_EOL, $masterLines) . PHP_EOL);
    }
}