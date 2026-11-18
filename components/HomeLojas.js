'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { brl } from '../lib/format';
import { CATEGORIAS_HOME, corDaLoja, emojiDoItem, fotoDaLoja, lojaNaBusca, lojaNaCategoria } from '../lib/visual';
import { SITE } from '../lib/site';
import LogoLoja from './LogoLoja';
import Marca from './Marca';
import NavInferior from './NavInferior';
import Rodape from './Rodape';

function CapaCard({ loja }) {
  const foto = loja.capa_url || fotoDaLoja(loja);
  if (foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt="" className="dest-foto" loading="lazy" />;
  }
  return (
    <div className="dest-foto dest-emoji" style={{ background: corDaLoja(loja.slug) }} aria-hidden="true">
      {emojiDoItem(loja.nome, loja.categoria)}
    </div>
  );
}

export default function HomeLojas({ lojas }) {
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const campoBusca = useRef(null);

  const visiveis = useMemo(
    () =>
      lojas
        .filter((l) => lojaNaCategoria(l, categoria) && lojaNaBusca(l, busca))
        .sort((a, b) => Number(b.aberta) - Number(a.aberta)),
    [lojas, categoria, busca]
  );
  const filtrando = categoria !== 'todas' || busca.trim() !== '';
  const abertas = useMemo(() => lojas.filter((l) => l.aberta).slice(0, 8), [lojas]);

  function irParaBusca() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    campoBusca.current?.focus();
  }

  return (
    <>
      <header className="topo-app">
        <div className="pagina">
          <div className="topo-linha topo-centro">
            <details className="menu">
              <summary aria-label="Abrir menu">
                <span className="hamb" aria-hidden="true" />
              </summary>
              <div className="menu-lista">
                <Link href="/meus-pedidos">Meus pedidos</Link>
                <Link href="/lojistas">Para lojistas</Link>
                <Link href="/entregador">Seja entregador</Link>
                <Link href="/termos">Termos de uso</Link>
                <Link href="/privacidade">Privacidade</Link>
              </div>
            </details>
            <Marca />
            <Link href="/meus-pedidos" className="icone-topo" aria-label="Meus pedidos">
              🧾
            </Link>
          </div>
          <p className="slogan">{SITE.slogan}</p>
          <div className="busca" role="search">
            <span aria-hidden="true">🔍</span>
            <input
              ref={campoBusca}
              type="search"
              placeholder="O que deseja pedir?"
              aria-label="Buscar loja ou comida"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <span className="regiao">
              <span aria-hidden="true">📍</span> {SITE.cidade}
            </span>
          </div>
        </div>
      </header>

      <main className="pagina home-corpo">
        {!filtrando && (
          <section className="hero-app" aria-label="Destaque">
            <div className="hero-app-texto">
              <strong className="script">Comida boa,</strong>
              <strong className="script amarelo">na sua casa!</strong>
              <span>Rápido · Fácil · Delicioso</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/banner-burger.jpg" alt="" className="hero-app-img" />
          </section>
        )}

        <nav className="cats" aria-label="Categorias">
          {CATEGORIAS_HOME.map((c) => (
            <button key={c.id} type="button" className="cat" aria-pressed={categoria === c.id} onClick={() => setCategoria(c.id)}>
              <span className="cat-icone" aria-hidden="true">
                {c.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.img} alt="" />
                ) : (
                  c.emoji
                )}
              </span>
              <span>{c.rotulo}</span>
            </button>
          ))}
        </nav>

        {!filtrando && abertas.length > 0 && (
          <>
            <div className="secao-linha">
              <h2 className="secao-titulo">Lojas abertas agora</h2>
            </div>
            <ul className="destaques">
              {abertas.map((l) => (
                <li key={l.id}>
                  <Link href={`/loja/${l.slug}`} className="dest-card">
                    <CapaCard loja={l} />
                    <div className="dest-corpo">
                      <div className="dest-nome">{l.nome}</div>
                      <div className="dest-info">
                        {l.tempo_estimado && <span>🕒 {l.tempo_estimado}</span>}
                        <span className={Number(l.taxa_entrega) > 0 ? '' : 'gratis'}>
                          🛵 {Number(l.taxa_entrega) > 0 ? brl(l.taxa_entrega) : 'Grátis'}
                        </span>
                      </div>
                      <span className="pedir">Pedir agora ›</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <section className="faixa-entrega" aria-label="Entrega rápida">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/moto.png" alt="" />
              <strong className="script">Entrega rápida para você!</strong>
              <span className="faixa-amarela">Peça agora e aproveite!</span>
            </section>
          </>
        )}

        <h2 className="secao-titulo">
          {filtrando
            ? `${visiveis.length} ${visiveis.length === 1 ? 'loja encontrada' : 'lojas encontradas'}`
            : 'Todas as lojas'}
        </h2>

        {lojas.length === 0 ? (
          <section className="vazio">
            <h2>Ainda não há lojas abertas aqui.</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Estamos começando em {SITE.cidade}. Tem uma loja ou lanchonete? Cadastre e receba pedidos pelo celular.
            </p>
            <Link href="/lojistas" className="btn btn-primario">
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
      <NavInferior ativo="inicio" onBuscar={irParaBusca} />
    </>
  );
}
