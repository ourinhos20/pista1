<?php

// Dados da oficina usados no site, nas fichas impressas e no WhatsApp.
return [
    'name' => env('OFICINA_NOME', 'Pista 1 Mecânica Automotiva'),
    'phone' => env('OFICINA_TELEFONE', '(11) 96029-1342'),
    'whatsapp' => env('OFICINA_WHATSAPP', '5511960291342'), // só dígitos, com 55 + DDD
    'instagram' => env('OFICINA_INSTAGRAM', '@mecanicapista1'),
    'address' => env('OFICINA_ENDERECO', ''),
    'city' => env('OFICINA_CIDADE', 'São Paulo - SP'),
    'hours' => env('OFICINA_HORARIO', 'Segunda a sexta, 8h às 18h · Sábado, 8h às 12h'),
    'document' => env('OFICINA_CNPJ', ''),
    'terms' => env('OFICINA_TERMOS', 'Prazo para retirada: 30 dias (após o prazo, reajuste de 10% a cada 30 dias vencidos). Garantia de 90 dias.'),

    /*
     * Endereço escondido do sistema. O site fica em "/" e o sistema em "/{panel_path}".
     * Em produção, troque por algo difícil de adivinhar (ex.: PAINEL_PATH=p1-gestao-7k2).
     */
    'panel_path' => trim(env('PAINEL_PATH', 'sistema'), '/'),
];
