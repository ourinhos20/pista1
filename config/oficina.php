<?php

// Dados da oficina usados nas fichas impressas e no WhatsApp.
return [
    'name' => env('OFICINA_NOME', 'Pista 1 Mecânica Automotiva'),
    'phone' => env('OFICINA_TELEFONE', '(11) 96029-1342'),
    'instagram' => env('OFICINA_INSTAGRAM', '@mecanicapista1'),
    'address' => env('OFICINA_ENDERECO', ''),
    'document' => env('OFICINA_CNPJ', ''),
    'terms' => env('OFICINA_TERMOS', 'Prazo para retirada: 30 dias (após o prazo, reajuste de 10% a cada 30 dias vencidos). Garantia de 90 dias.'),
];
