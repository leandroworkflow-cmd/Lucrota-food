import { SITE } from '../lib/site';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/painel', '/pedido/', '/conta', '/admin'] }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
