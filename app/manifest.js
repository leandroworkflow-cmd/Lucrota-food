// App instalável do cliente (abre na tela inicial). Lojista e entregador têm manifestos próprios.
export default function manifest() {
  return {
    name: 'Brokê | Peça. Receba. Aproveite.',
    short_name: 'Brokê',
    description: 'Peça comida e mercadorias das lojas do seu bairro.',
    id: '/',
    start_url: '/',
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
