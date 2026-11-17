import Link from 'next/link';
import { SITE } from '../lib/site';

// Cloche (a tampa de prato) amarela com riscos de velocidade.
export function Icone({ size = 34, fundo = false }) {
  return (
    <svg width={size * 1.3} height={size} viewBox="0 0 130 100" aria-hidden="true">
      {fundo && <rect width="130" height="100" rx="26" fill="#5a1a9a" />}
      <g fill="#ffc400">
        <path d="M22 74a42 42 0 0 1 84 0z" />
        <rect x="14" y="76" width="100" height="9" rx="4.5" />
        <circle cx="64" cy="27" r="7" />
      </g>
      <g stroke="#ffc400" strokeWidth="5" strokeLinecap="round">
        <path d="M2 52h20M6 64h14M0 76h12" />
      </g>
    </svg>
  );
}

export default function Marca({ href = '/' }) {
  const meu = SITE.nome.slice(0, 3);
  const delivery = SITE.nome.slice(3);
  return (
    <Link href={href} className="marca" aria-label={`${SITE.nome}, página inicial`}>
      <Icone />
      <span>
        {meu}
        <span className="marca-amarela">{delivery}</span>
      </span>
    </Link>
  );
}
