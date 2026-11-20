import Link from 'next/link';
import { SITE } from '../lib/site';

// Logo Brokê (branca e amarela, fundo transparente): usada nos cabeçalhos roxos.
export default function Marca({ href = '/', altura = 34 }) {
  return (
    <Link href={href} className="marca" aria-label={`${SITE.nome}, página inicial`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/logo-broke.png" alt={SITE.nome} height={altura} width={Math.round((altura * 914) / 231)} style={{ height: altura, width: 'auto', display: 'block' }} />
    </Link>
  );
}
