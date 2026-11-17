import Link from 'next/link';
import { notFound } from 'next/navigation';
import Cardapio from '../../../components/Cardapio';
import JsonLd from '../../../components/JsonLd';
import Marca from '../../../components/Marca';
import Rodape from '../../../components/Rodape';
import { brl } from '../../../lib/format';
import { corDaLoja, lojaComCardapio } from '../../../lib/lojas';
import { SITE } from '../../../lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const dados = await lojaComCardapio(slug);
  if (!dados) return { title: 'Loja não encontrada', robots: { index: false } };
  const { loja } = dados;
  const descricao =
    loja.descricao || `Peça de ${loja.nome}${loja.bairro ? ` no ${loja.bairro}` : ''}, ${loja.cidade || SITE.cidade}. Cardápio e entrega.`;
  return {
    title: `${loja.nome} | Cardápio e entrega`,
    description: descricao,
    alternates: { canonical: `/loja/${loja.slug}` },
    openGraph: { title: loja.nome, description: descricao, url: `/loja/${loja.slug}`, type: 'website' },
  };
}

export default async function PaginaLoja({ params }) {
  const { slug } = await params;
  const dados = await lojaComCardapio(slug);
  if (!dados) notFound();
  const { loja, produtos } = dados;

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Restaurant',
          name: loja.nome,
          url: `${SITE.url}/loja/${loja.slug}`,
          description: loja.descricao || undefined,
          servesCuisine: loja.categoria || undefined,
          address: {
            '@type': 'PostalAddress',
            streetAddress: loja.endereco || undefined,
            addressLocality: loja.cidade || SITE.cidade,
            addressRegion: SITE.uf,
            addressCountry: 'BR',
          },
        }}
      />
      <header className="topo">
        <div className="pagina topo-in">
          <Marca />
          <Link href="/" className="topo-link">
            Outras lojas
          </Link>
        </div>
      </header>

      <div className="pagina">
        <div className="fachada" style={{ '--cor': corDaLoja(loja.slug), marginBottom: 0 }}>
          <h1 className="fachada-nome">{loja.nome}</h1>
          <div className="fachada-info">
            <span className={loja.aberta ? 'situacao' : 'situacao fechada'}>
              {loja.aberta ? 'Aberta' : 'Fechada agora'}
            </span>
            {loja.categoria && <span>{loja.categoria}</span>}
            {loja.bairro && <span>{loja.bairro}</span>}
          </div>
        </div>

        {loja.descricao && (
          <p className="muted" style={{ margin: '14px 0 0' }}>
            {loja.descricao}
          </p>
        )}

        <dl className="infos">
          <div>
            <dt>Entrega</dt>
            <dd>{Number(loja.taxa_entrega) > 0 ? brl(loja.taxa_entrega) : 'Grátis'}</dd>
          </div>
          <div>
            <dt>Tempo</dt>
            <dd>{loja.tempo_estimado || 'Consulte'}</dd>
          </div>
          <div>
            <dt>Pedido mínimo</dt>
            <dd>{Number(loja.pedido_minimo) > 0 ? brl(loja.pedido_minimo) : 'Sem mínimo'}</dd>
          </div>
        </dl>

        <Cardapio loja={loja} produtos={produtos} />
      </div>
      <Rodape />
    </>
  );
}
