import { lojasAtivas } from '../lib/lojas';
import { SITE } from '../lib/site';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const lojas = await lojasAtivas();
  const agora = new Date();
  return [
    { url: SITE.url, lastModified: agora, changeFrequency: 'daily', priority: 1 },
    ...lojas.map((l) => ({
      url: `${SITE.url}/loja/${l.slug}`,
      lastModified: agora,
      changeFrequency: 'daily',
      priority: 0.8,
    })),
    { url: `${SITE.url}/lojistas`, lastModified: agora, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE.url}/termos`, lastModified: agora, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${SITE.url}/privacidade`, lastModified: agora, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
