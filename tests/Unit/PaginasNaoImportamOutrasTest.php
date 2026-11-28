<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Uma tela (resources/js/pages) importando outra tela faz o empacotador deixar a tela
 * importada de fora do pacote, e ela dá erro 500 ao abrir (aconteceu com a ficha do cliente).
 * O que é compartilhado fica em resources/js/components.
 */
class PaginasNaoImportamOutrasTest extends TestCase
{
    public function test_paginas_nao_importam_outras_paginas(): void
    {
        $dir = dirname(__DIR__, 2).'/resources/js/pages';
        $bad = [];
        $it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($dir));
        foreach ($it as $file) {
            if (! str_ends_with($file->getFilename(), '.tsx')) {
                continue;
            }
            $src = file_get_contents($file->getPathname());
            if (preg_match("/from '(\.{1,2}\/|@\/pages\/)/", $src)) {
                $bad[] = str_replace($dir, 'pages', $file->getPathname());
            }
        }
        $this->assertSame([], $bad, 'Estas telas importam outra tela: '.implode(', ', $bad));
    }
}
