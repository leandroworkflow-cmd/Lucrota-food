// Regras do cancelamento pelo cliente (puras, usadas no servidor e na tela).
// Linha do tempo, contada a partir de "em preparo":
//   0 a 3 min  -> grátis
//   3 a 20 min -> taxa de 15% dos produtos (+ taxa de entrega se um entregador já aceitou), só em pedido pago pelo app
//   após 20 min -> grátis de novo (o pedido está atrasado)
import { formaOnline } from './cartao';

export const JANELA_GRATIS_MIN = 3; // minutos grátis depois que a loja começa o preparo
export const FIM_TAXA_MIN = 20; // depois disso o pedido é considerado atrasado e cancela sem taxa
export const PCT_PRODUTOS = 15; // % dos produtos cobrada entre os dois prazos
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// p: { status, forma_pagamento, pagamento_status, subtotal, taxa_entrega, total, entregador_id, preparo_em }
// Devolve { pode, motivo?, taxa, taxa_loja, taxa_entregador, reembolso, gratis_ate, sem_taxa_apos }
export function calcularCancelamento(p, agora = Date.now()) {
  const nao = (motivo) => ({ pode: false, motivo, taxa: 0, taxa_loja: 0, taxa_entregador: 0, reembolso: 0, gratis_ate: null, sem_taxa_apos: null });
  if (p.status === 'cancelado') return nao('Este pedido já foi cancelado.');
  if (p.status === 'entregue') return nao('Este pedido já foi entregue.');
  if (p.status === 'saiu') return nao('O pedido já saiu para entrega. Fale com a loja pelo WhatsApp.');

  const pagoNoApp = formaOnline(p.forma_pagamento) && p.pagamento_status === 'pago';
  const inicio = p.status === 'preparo' && p.preparo_em ? new Date(p.preparo_em).getTime() : null;
  const fimGratis = inicio ? inicio + JANELA_GRATIS_MIN * 60000 : null;
  const fimTaxa = inicio ? inicio + FIM_TAXA_MIN * 60000 : null;
  const livre = { pode: true, taxa: 0, taxa_loja: 0, taxa_entregador: 0, reembolso: pagoNoApp ? r2(p.total) : 0 };
  const iso = (t) => (t ? new Date(t).toISOString() : null);

  // Antes do preparo: sem custo.
  if (p.status !== 'preparo') return { ...livre, gratis_ate: null, sem_taxa_apos: null };
  // Em preparo, mas sem horário registrado: trata como dentro da fase de taxa (não dá para provar o prazo grátis).
  const naJanelaGratis = inicio && agora <= fimGratis;
  const atrasado = inicio && agora > fimTaxa;
  if (naJanelaGratis || atrasado) return { ...livre, gratis_ate: naJanelaGratis ? iso(fimGratis) : null, sem_taxa_apos: naJanelaGratis ? iso(fimTaxa) : null };

  // Fase da taxa: só dá para cobrar de quem pagou pelo app, porque o dinheiro já está com a plataforma.
  if (!pagoNoApp) return nao('A loja já está preparando o pedido. Fale com ela pelo WhatsApp para cancelar.');
  const taxaLoja = r2((Number(p.subtotal) * PCT_PRODUTOS) / 100);
  const taxaEntregador = p.entregador_id ? r2(p.taxa_entrega) : 0;
  const taxa = r2(taxaLoja + taxaEntregador);
  return { pode: true, taxa, taxa_loja: taxaLoja, taxa_entregador: taxaEntregador, reembolso: r2(Number(p.total) - taxa), gratis_ate: null, sem_taxa_apos: iso(fimTaxa) };
}
