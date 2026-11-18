import Link from 'next/link';

const ITENS = [
  { id: 'inicio', rotulo: 'Início', icone: '🏠', href: '/' },
  { id: 'buscar', rotulo: 'Buscar', icone: '🔍' },
  { id: 'pedidos', rotulo: 'Meus pedidos', icone: '🧾', href: '/meus-pedidos' },
  { id: 'lojistas', rotulo: 'Para lojistas', icone: '🏪', href: '/lojistas' },
];

// Barra fixa no rodapé, como nos apps de delivery. "Buscar" usa onBuscar quando a página tem busca.
export default function NavInferior({ ativo, onBuscar }) {
  return (
    <nav className="nav-inf" aria-label="Navegação principal">
      {ITENS.map((i) => {
        const conteudo = (
          <>
            <span className="nav-icone" aria-hidden="true">
              {i.icone}
            </span>
            <span>{i.rotulo}</span>
          </>
        );
        const props = { className: 'nav-item', 'aria-current': ativo === i.id ? 'page' : undefined };
        if (i.id === 'buscar' && onBuscar) {
          return (
            <button key={i.id} type="button" onClick={onBuscar} {...props}>
              {conteudo}
            </button>
          );
        }
        return (
          <Link key={i.id} href={i.href || '/'} {...props}>
            {conteudo}
          </Link>
        );
      })}
    </nav>
  );
}
