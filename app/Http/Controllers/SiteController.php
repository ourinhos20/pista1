<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;

/** Site institucional público (não tem nenhum link para o sistema). */
class SiteController extends Controller
{
    public function __invoke(): View
    {
        $shop = config('oficina');
        $wa = 'https://wa.me/'.$shop['whatsapp'].'?text='.rawurlencode('Olá! Vim pelo site e gostaria de agendar um horário na Pista 1.');

        $instagramUrl = 'https://instagram.com/'.ltrim($shop['instagram'], '@');

        // Dados estruturados para o Google (JSON_HEX_TAG impede fechar o <script> por engano)
        $jsonLd = json_encode(array_filter([
            '@context' => 'https://schema.org',
            '@type' => 'AutoRepair',
            'name' => $shop['name'],
            'telephone' => $shop['phone'],
            'image' => url('/images/pista1-banner.jpg'),
            'url' => url('/'),
            'address' => $shop['address'] ? ['@type' => 'PostalAddress', 'streetAddress' => $shop['address'], 'addressLocality' => $shop['city'], 'addressCountry' => 'BR'] : null,
            'openingHours' => $shop['hours'],
            'sameAs' => [$instagramUrl],
        ]), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP);

        return view('site', [
            'shop' => $shop,
            'wa' => $wa,
            'jsonLd' => $jsonLd,
            'instagramUrl' => $instagramUrl,
            'mapsUrl' => $shop['address'] ? 'https://www.google.com/maps/search/?api=1&query='.rawurlencode($shop['address'].' '.$shop['city']) : null,
            'services' => [
                ['Revisão completa', 'Checklist com mais de 40 itens, do óleo à suspensão, seguindo o manual do fabricante.'],
                ['Freios', 'Pastilhas, discos, lonas, fluido e regulagem do freio de mão.'],
                ['Suspensão e direção', 'Amortecedores, bandejas, pivôs, terminais, bieletas e alinhamento.'],
                ['Injeção eletrônica', 'Diagnóstico com scanner, limpeza de bicos, velas e bobinas.'],
                ['Troca de óleo e filtros', 'Óleo certo para o seu motor, com filtros de óleo, ar, combustível e cabine.'],
                ['Motor e arrefecimento', 'Correias, bomba d’água, radiador, vazamentos e superaquecimento.'],
                ['Elétrica', 'Bateria, alternador, motor de partida, faróis e lanternas.'],
                ['Embreagem e câmbio', 'Troca de kit de embreagem e óleo do câmbio.'],
            ],
            'steps' => [
                ['Agende pelo WhatsApp', 'Conte o que está acontecendo com o carro e escolha o melhor horário.'],
                ['Vistoria e diagnóstico', 'Registramos a entrada do carro, as avarias existentes e fazemos o diagnóstico.'],
                ['Você aprova o orçamento', 'Nenhum serviço é feito sem a sua autorização. Orçamento claro, item por item.'],
                ['Carro pronto, com garantia', 'Avisamos pelo WhatsApp quando estiver pronto. Garantia de 90 dias.'],
            ],
            'perks' => [
                ['90 dias', 'de garantia nos serviços'],
                ['Orçamento', 'aprovado por você antes de começar'],
                ['Vistoria', 'de entrada com registro de avarias'],
                ['Histórico', 'de tudo que foi feito no seu carro'],
            ],
        ]);
    }
}
