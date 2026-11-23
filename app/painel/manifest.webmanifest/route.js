// App instalável do lojista (abre direto no painel da loja).
export const dynamic = 'force-static';

export function GET() {
  return Response.json(
    {
      name: 'Brokê Lojista',
      short_name: 'Lojista',
      description: 'Receba e gerencie os pedidos da sua loja.',
      id: '/painel',
      start_url: '/painel',
      scope: '/painel',
      display: 'standalone',
      lang: 'pt-BR',
      background_color: '#5c0297',
      theme_color: '#5c0297',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } }
  );
}
