import HomeLojas from '../components/HomeLojas';
import ConvitesParceiros from '../components/ConvitesParceiros';
import JsonLd from '../components/JsonLd';
import { lojasAtivas } from '../lib/lojas';
import { SITE } from '../lib/site';

export const dynamic = 'force-dynamic';

export default async function Inicio() {
  const lojas = await lojasAtivas();
  return (
    <>
      <JsonLd
        data={{ '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.nome, url: SITE.url, description: SITE.descricao }}
      />
      <HomeLojas lojas={lojas} />
      <ConvitesParceiros />
    </>
  );
}
