import './globals.css';
import { Kaushan_Script, Poppins } from 'next/font/google';
import { SITE } from '../lib/site';

const display = Poppins({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display' });
const body = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });
const script = Kaushan_Script({ subsets: ['latin'], weight: '400', variable: '--font-script' });

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.nome} | ${SITE.slogan}`, template: `%s | ${SITE.nome}` },
  description: SITE.descricao,
  applicationName: SITE.nome,
  openGraph: { siteName: SITE.nome, locale: 'pt_BR', type: 'website', title: SITE.nome, description: SITE.descricao },
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, title: SITE.nome, statusBarStyle: 'default' },
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#5a1a9a' };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} ${script.variable}`}>
      <body>{children}</body>
    </html>
  );
}
