import Link from 'next/link';
import { notFound } from 'next/navigation';
import Cardapio from '../../../components/Cardapio';
import JsonLd from '../../../components/JsonLd';
import LogoLoja from '../../../components/LogoLoja';
import Rodape from '../../../components/Rodape';
import { brl } from '../../../lib/format';
import { corDaLoja, lojaComCardapio } from '../../../lib/lojas';
import { fotoDaLoja } from '../../../lib/visual';
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
      <div className="capa" style={{ '--cor': corDaLoja(loja.slug) }}>
        {loja.capa_url || fotoDaLoja(loja) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={loja.capa_url || fotoDaLoja(loja)} alt="" className="capa-img" />
        ) : (
          <div className="capa-toldo" aria-hidden="true" />
        )}
        <Link href="/" className="voltar" aria-label="Voltar para a lista de lojas">
          ←
        </Link>
      </div>

      <div className="pagina">
        <div className="loja-cab">
          <LogoLoja loja={loja} tamanho={76} className="logo-sobre" />
          <div className="loja-cab-texto">
            <h1>{loja.nome}</h1>
            <div className="muted">{[loja.categoria, loja.bairro].filter(Boolean).join(' · ')}</div>
          </div>
          <span className={loja.aberta ? 'selo aberta' : 'selo'}>{loja.aberta ? 'Aberta' : 'Fechada'}</span>
        </div>

        {loja.descricao && <p className="muted" style={{ margin: '4px 0 0' }}>{loja.descricao}</p>}

        <div className="pilulas">
          <span className={Number(loja.taxa_entrega) > 0 ? 'pilula' : 'pilula gratis'}>
            🛵 {Number(loja.taxa_entrega) > 0 ? `Entrega ${brl(loja.taxa_entrega)}` : 'Entrega grátis'}
          </span>
          {loja.tempo_estimado && <span className="pilula">🕒 {loja.tempo_estimado}</span>}
          {Number(loja.pedido_minimo) > 0 && <span className="pilula">🧾 Mínimo {brl(loja.pedido_minimo)}</span>}
        </div>

        <Cardapio loja={loja} produtos={produtos} />
      </div>
      <Rodape />
    </>
  );
}
