export const metadata = {
  title: 'Brokê Entregador',
  description: 'Receba corridas, compartilhe sua localização e conclua entregas.',
  robots: { index: false, follow: false },
  manifest: '/entregador/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Entregador', statusBarStyle: 'black-translucent' },
};

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0e0c13' };

export default function Layout({ children }) {
  return children;
}
