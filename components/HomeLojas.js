'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { brl } from '../lib/format';
import { CATEGORIAS_HOME, lojaNaBusca, lojaNaCategoria } from '../lib/visual';
import { SITE } from '../lib/site';
import LogoLoja from './LogoLoja';
import Marca from './Marca';
import Rodape from './Rodape';

export default function HomeLojas({ lojas }) {
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('todas');

  const visiveis = useMemo(
    () =>
      lojas
        .filter((l) => lojaNaCategoria(l, categoria) && lojaNaBusca(l, busca))
        .sort((a, b) => Number(b.aberta) - Number(a.aberta)),
    [lojas, categoria, busca]
  );
  const filtrando = categoria !== 'todas' || busca.trim() !== '';

  return (
    <>
      <header className="topo-app">
        <div className="pagina">
          <div className="topo-linha">
            <Marca />
            <Link href="/lojistas" className="topo-pill">
              Para lojistas
            </Link>
          </div>
          <p className="slogan">{SITE.slogan}</p>
          <p className="local">
            <span aria-hidden="true">📍</span> Entregando em <strong>{SITE.cidade}, {SITE.uf}</strong>
          </p>
          <div className="busca" role="search">
            <span aria-hidden="true">🔍</span>
            <input
              type="search"
              placeholder="Buscar loja ou comida"
              aria-label="Buscar loja ou comida"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="pagina home-corpo">
        <nav className="cats" aria-label="Categorias">
          {CATEGORIAS_HOME.map((c) => (
            <button key={c.id} type="button" className="cat" aria-pressed={categoria === c.id} onClick={() => setCategoria(c.id)}>
              <span className="cat-icone" aria-hidden="true">
                {c.emoji}
              </span>
              <span>{c.rotulo}</span>
            </button>
          ))}
        </nav>

        {!filtrando && (
          <section className="promo" aria-label="Destaque">
            <div>
              <strong>Pague só quando receber</strong>
              <span>Pix, dinheiro ou cartão na entrega. Sem cadastro e sem taxa escondida.</span>
            </div>
            <span className="promo-emoji" aria-hidden="true">
              🛵
            </span>
          </section>
        )}

        <h2 className="secao-titulo">{filtrando ? `${visiveis.length} ${visiveis.length === 1 ? 'loja encontrada' : 'lojas encontradas'}` : 'Lojas perto de você'}</h2>

        {lojas.length === 0 ? (
          <section className="vazio">
            <h2>Ainda não há lojas abertas aqui.</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Estamos começando em {SITE.cidade}. Tem uma loja ou lanchonete? Cadastre e receba pedidos pelo celular.
            </p>
            <Link href="/painel" className="btn btn-primario">
              Cadastrar minha loja
            </Link>
          </section>
        ) : visiveis.length === 0 ? (
          <section className="vazio">
            <h2>Nada por aqui.</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Nenhuma loja combina com a sua busca. Tente outra palavra ou veja todas as categorias.
            </p>
            <button type="button" className="btn btn-pequeno" onClick={() => { setBusca(''); setCategoria('todas'); }}>
              Limpar filtros
            </button>
          </section>
        ) : (
          <ul className="lista-lojas">
            {visiveis.map((l) => (
              <li key={l.id}>
                <Link href={`/loja/${l.slug}`} className={l.aberta ? 'loja-card' : 'loja-card fechada'}>
                  <LogoLoja loja={l} tamanho={68} />
                  <div className="loja-card-corpo">
                    <div className="loja-card-nome">{l.nome}</div>
                    <div className="loja-card-sub">{[l.categoria, l.bairro].filter(Boolean).join(' · ')}</div>
                    <div className="loja-card-info">
                      {l.tempo_estimado && <span>🕒 {l.tempo_estimado}</span>}
                      <span className={Number(l.taxa_entrega) > 0 ? '' : 'gratis'}>
                        🛵 {Number(l.taxa_entrega) > 0 ? brl(l.taxa_entrega) : 'Entrega grátis'}
                      </span>
                      {Number(l.pedido_minimo) > 0 && <span>Mín. {brl(l.pedido_minimo)}</span>}
                    </div>
                  </div>
                  <span className={l.aberta ? 'selo aberta' : 'selo'}>{l.aberta ? 'Aberta' : 'Fechada'}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Rodape />
    </>
  );
}
