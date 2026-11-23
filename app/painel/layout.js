import PainelShell from '../../components/PainelShell';

export const metadata = {
  title: 'Painel da loja',
  description: 'Receba e gerencie os pedidos da sua loja.',
  robots: { index: false, follow: false },
  manifest: '/painel/manifest.webmanifest',
};

export default function PainelLayout({ children }) {
  return <PainelShell>{children}</PainelShell>;
}
