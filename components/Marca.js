import Link from 'next/link';
import { SITE } from '../lib/site';

export function Icone({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="22" fill="#ffc933" />
      <path d="M26 40h48l-4 38a6 6 0 0 1-6 5H36a6 6 0 0 1-6-5z" fill="#1b3a9e" />
      <path d="M38 40v-6a12 12 0 0 1 24 0v6" fill="none" stroke="#1b3a9e" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export default function Marca({ href = '/' }) {
  return (
    <Link href={href} className="marca" aria-label={`${SITE.nome}, página inicial`}>
      <Icone />
      {SITE.nome}
    </Link>
  );
}
