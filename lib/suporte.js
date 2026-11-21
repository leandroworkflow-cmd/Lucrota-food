// Link da central de ajuda no WhatsApp, já com o número do pedido na mensagem.
import { linkWhatsApp } from './format';
import { SITE } from './site';

const PAPEL = { cliente: 'cliente', lojista: 'lojista', entregador: 'entregador' };

export function mensagemSuporte({ papel, numero, loja } = {}) {
  const quem = PAPEL[papel] ? `Sou ${PAPEL[papel]} do ${SITE.nome}` : `Olá, vim pelo ${SITE.nome}`;
  const onde = loja ? ` (${loja})` : '';
  if (numero) return `Olá! ${quem}${onde} e preciso de ajuda com o pedido nº ${numero}.`;
  return `Olá! ${quem}${onde} e preciso de ajuda.`;
}

export const linkSuporte = (dados) => linkWhatsApp(SITE.suporteWhatsapp, mensagemSuporte(dados));
