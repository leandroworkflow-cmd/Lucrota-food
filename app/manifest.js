export default function manifest() {
  return {
    name: 'Entrega Local | Painel da loja',
    short_name: 'Painel',
    description: 'Receba e gerencie os pedidos da sua loja.',
    id: '/painel',
    start_url: '/painel',
    scope: '/',
    display: 'standalone',
    lang: 'pt-BR',
    background_color: '#f4f7fb',
    theme_color: '#1b3a9e',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
