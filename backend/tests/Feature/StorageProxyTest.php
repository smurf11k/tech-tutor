<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StorageProxyTest extends TestCase
{
    public function test_storage_proxy_streams_private_file_without_500(): void
    {
        Storage::fake('s3');
        Storage::disk('s3')->put('avatars/avatar.png', 'image-data');

        $response = $this->get('/api/storage/avatars/avatar.png');

        $response
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');

        $this->assertSame('image-data', $response->streamedContent());
    }

    public function test_hls_master_playlist_rewrites_relative_urls(): void
    {
        Storage::fake('s3');
        Storage::disk('s3')->put(
            'lesson-videos/course/index.m3u8',
            "#EXTM3U\n#EXT-X-VERSION:3\n720p/index.m3u8\n",
        );

        $expected = '/api/storage/lesson-videos/course/720p/index.m3u8';

        $this->get('/api/storage/lesson-videos/course/index.m3u8')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/vnd.apple.mpegurl')
            ->assertSee($expected, false);
    }
}
