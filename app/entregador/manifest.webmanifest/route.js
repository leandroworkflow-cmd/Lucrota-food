// Faz o /entregador poder ser instalado como app (tela cheia, ícone na tela inicial).
export const dynamic = 'force-static';

export function GET() {
  return Response.json(
    {
      name: 'Brokê Entregador',
      short_name: 'Entregador',
      description: 'Receba corridas, conclua entregas e saque seus ganhos.',
      id: '/entregador',
      start_url: '/entregador',
      scope: '/entregador',
      display: 'standalone',
      orientation: 'portrait',
      lang: 'pt-BR',
      background_color: '#0e0c13',
      theme_color: '#0e0c13',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } }
  );
}
