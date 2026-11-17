import Link from 'next/link';
import JsonLd from '../components/JsonLd';
import Marca from '../components/Marca';
import Rodape from '../components/Rodape';
import { brl } from '../lib/format';
import { corDaLoja, lojasAtivas } from '../lib/lojas';
import { SITE } from '../lib/site';

export const dynamic = 'force-dynamic';

export default async function Inicio() {
  const lojas = await lojasAtivas();

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE.nome,
          url: SITE.url,
          description: SITE.descricao,
        }}
      />
      <header className="topo">
        <div className="pagina topo-in">
          <Marca />
          <Link href="/painel" className="topo-link">
            Sou lojista
          </Link>
        </div>
      </header>

      <main className="pagina">
        <section className="hero">
          <h1>Peça das lojas do seu bairro.</h1>
          <p>
            Escolha a loja, monte o pedido e pague na entrega. Sem cadastro e sem taxa escondida:
            o valor que você vê é o valor que paga.
          </p>
        </section>

        <h2 className="sr-only">Lojas em {SITE.cidade}</h2>
        {lojas.length === 0 ? (
          <section className="vazio">
            <h2>Ainda não há lojas abertas aqui.</h2>
            <p className="muted" style={{ marginTop: 0 }}>
              Estamos começando em {SITE.cidade}. Tem uma loja ou lanchonete? Cadastre e receba pedidos
              pelo celular.
            </p>
            <Link href="/painel" className="btn btn-primario">
              Cadastrar minha loja
            </Link>
          </section>
        ) : (
          <ul className="lista-lojas">
            {lojas.map((l) => (
              <li key={l.id}>
                <Link href={`/loja/${l.slug}`} className="fachada" style={{ '--cor': corDaLoja(l.slug) }}>
                  <div className="fachada-nome">{l.nome}</div>
                  <div className="fachada-info">
                    <span className={l.aberta ? 'situacao' : 'situacao fechada'}>
                      {l.aberta ? 'Aberta' : 'Fechada'}
                    </span>
                    {l.categoria && <span>{l.categoria}</span>}
                    {l.bairro && <span>{l.bairro}</span>}
                    {l.tempo_estimado && <span>{l.tempo_estimado}</span>}
                    <span>Entrega {Number(l.taxa_entrega) > 0 ? brl(l.taxa_entrega) : 'grátis'}</span>
                  </div>
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
