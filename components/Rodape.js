import Link from 'next/link';
import { SITE } from '../lib/site';

export default function Rodape() {
  return (
    <footer className="rodape">
      <div className="pagina rodape-in">
        <span>
          {SITE.nome}, {SITE.cidade} - {SITE.uf}
        </span>
        <Link href="/lojistas">Para lojistas</Link>
        <Link href="/termos">Termos de uso</Link>
        <Link href="/privacidade">Privacidade</Link>
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
      </div>
    </footer>
  );
}
