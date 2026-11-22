export default function manifest() {
  return {
    name: 'Brokê | Painel da loja',
    short_name: 'Painel',
    description: 'Receba e gerencie os pedidos da sua loja.',
    id: '/painel',
    start_url: '/painel',
    scope: '/',
    display: 'standalone',
    lang: 'pt-BR',
    background_color: '#5c0297',
    theme_color: '#5c0297',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
