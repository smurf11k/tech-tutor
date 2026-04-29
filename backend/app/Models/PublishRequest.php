<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PublishRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id',
        'requester_id',
        'status',
        'declined_reason',
        'handled_by',
        'handled_at',
    ];

    protected function casts(): array
    {
        return [
            'handled_at' => 'datetime',
        ];
    }

    public function course()
    {
        return $this->belongsTo(Course::class);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requester_id');
    }
}
