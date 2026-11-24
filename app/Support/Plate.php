<?php

namespace App\Support;

class Plate
{
    /** "abc-1d23" -> "ABC1D23" */
    public static function normalize(?string $plate): string
    {
        return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) $plate));
    }

    public static function digits(?string $value): ?string
    {
        $d = preg_replace('/\D/', '', (string) $value);

        return $d === '' ? null : $d;
    }
}
