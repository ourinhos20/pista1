<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Attachment extends Model
{
    protected $fillable = ['service_order_id', 'pre_service_id', 'path', 'thumb_path', 'size', 'caption', 'show_to_client', 'uploaded_by'];

    protected function casts(): array
    {
        return ['show_to_client' => 'boolean', 'size' => 'integer'];
    }

    protected static function booted(): void
    {
        // apaga os arquivos junto com o registro
        static::deleted(function (self $a) {
            Storage::disk('local')->delete([$a->path, $a->thumb_path]);
        });
    }

    public function serviceOrder(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class);
    }

    public function preService(): BelongsTo
    {
        return $this->belongsTo(PreService::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function toRow(): array
    {
        return [
            'id' => $this->id,
            'url' => route('anexos.show', $this->id),
            'thumb' => route('anexos.show', [$this->id, 'mini' => 1]),
            'caption' => $this->caption,
            'show_to_client' => $this->show_to_client,
            'uploaded_by' => $this->uploader?->name,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
