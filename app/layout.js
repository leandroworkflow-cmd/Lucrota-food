import './globals.css';
import { Bricolage_Grotesque, Hanken_Grotesk } from 'next/font/google';
import { SITE } from '../lib/site';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display' });
const body = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-body' });

export const metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.nome} | ${SITE.slogan}`, template: `%s | ${SITE.nome}` },
  description: SITE.descricao,
  applicationName: SITE.nome,
  openGraph: { siteName: SITE.nome, locale: 'pt_BR', type: 'website', title: SITE.nome, description: SITE.descricao },
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, title: SITE.nome, statusBarStyle: 'default' },
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#1b3a9e' };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
