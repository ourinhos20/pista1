<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Salva fotos reduzidas (máx. 1600 px, JPEG) e uma miniatura (400 px).
 * Recriar a imagem com o GD também remove os dados EXIF (inclusive GPS do celular).
 * Os arquivos ficam em storage/app/private (fora da pasta pública).
 */
class ImageStore
{
    public const MAX = 1600;
    public const THUMB = 400;

    /** @return array{path: string, thumb_path: string, size: int} */
    public static function store(UploadedFile $file, string $folder = 'fotos'): array
    {
        $raw = @file_get_contents($file->getRealPath());
        $img = $raw !== false ? @imagecreatefromstring($raw) : false;
        if (! $img) {
            throw ValidationException::withMessages(['photos' => 'Não consegui ler a foto "'.$file->getClientOriginalName().'". Envie em JPG ou PNG.']);
        }

        $img = self::fixOrientation($img, $file->getRealPath());

        $dir = $folder.'/'.now()->format('Y/m');
        $name = Str::uuid()->toString();
        $path = "{$dir}/{$name}.jpg";
        $thumb = "{$dir}/{$name}_mini.jpg";

        $big = self::resize($img, self::MAX);
        $small = self::resize($img, self::THUMB);

        $disk = Storage::disk('local');
        $disk->put($path, self::jpeg($big, 82));
        $disk->put($thumb, self::jpeg($small, 75));

        imagedestroy($img);
        if ($big !== $img) {
            imagedestroy($big);
        }
        imagedestroy($small);

        return ['path' => $path, 'thumb_path' => $thumb, 'size' => $disk->size($path)];
    }

    private static function resize(\GdImage $img, int $max): \GdImage
    {
        $w = imagesx($img);
        $h = imagesy($img);
        $scale = min(1, $max / max($w, $h));
        if ($scale >= 1) {
            return $img;
        }
        $nw = (int) round($w * $scale);
        $nh = (int) round($h * $scale);
        $out = imagecreatetruecolor($nw, $nh);
        imagefill($out, 0, 0, imagecolorallocate($out, 255, 255, 255));
        imagecopyresampled($out, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);

        return $out;
    }

    private static function jpeg(\GdImage $img, int $quality): string
    {
        ob_start();
        imagejpeg($img, null, $quality);

        return (string) ob_get_clean();
    }

    /** Fotos de celular vêm "deitadas" com a rotação só no EXIF. */
    private static function fixOrientation(\GdImage $img, string $path): \GdImage
    {
        if (! function_exists('exif_read_data')) {
            return $img;
        }
        $exif = @exif_read_data($path);
        $o = $exif['Orientation'] ?? 1;
        $rotated = match ((int) $o) {
            3 => imagerotate($img, 180, 0),
            6 => imagerotate($img, -90, 0),
            8 => imagerotate($img, 90, 0),
            default => null,
        };
        if ($rotated) {
            imagedestroy($img);

            return $rotated;
        }

        return $img;
    }
}
