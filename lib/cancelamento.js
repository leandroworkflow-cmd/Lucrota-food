// Regras do cancelamento pelo cliente (puras, usadas no servidor e na tela).
//
// LOJA (contado a partir de "em preparo"):
//   0 a 3 min  -> grátis
//   3 a 20 min -> taxa de 15% dos produtos
//   após 20 min -> grátis de novo (o pedido está atrasado)
// ENTREGADOR (contado a partir de "cheguei na loja"):
//   até 10 min esperando -> não recebe nada
//   depois de 10 min     -> recebe R$ 3,00
//   (se o pedido está atrasado, o cliente não paga nada: a demora é da loja)
// COMO O CLIENTE PAGA A TAXA:
//   Pix/cartão pelo app -> sai do valor pago; o resto é devolvido.
//   Dinheiro            -> fica como saldo devedor (cobrado no próximo pedido pelo app).
import { formaOnline } from './cartao';

export const JANELA_GRATIS_MIN = 3; // minutos grátis depois que a loja começa o preparo
export const FIM_TAXA_MIN = 20; // depois disso o pedido é considerado atrasado e cancela sem taxa
export const PCT_PRODUTOS = 15; // % dos produtos cobrada entre os dois prazos
export const ESPERA_ENTREGADOR_MIN = 10; // minutos de espera do entregador na loja antes de ele ter direito à taxa
export const TAXA_ENTREGADOR = 3; // R$ pagos ao entregador que esperou mais que isso
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Valor que o cliente realmente pagou pelo app (o pedido mais o saldo devedor antigo que foi somado a ele).
export const valorPago = (p) => r2(Number(p.total) + Number(p.divida_cliente || 0));

// p: { status, forma_pagamento, pagamento_status, subtotal, total, divida_cliente, entregador_id, preparo_em, chegou_loja_em }
// Devolve { pode, motivo?, taxa, taxa_loja, taxa_entregador, reembolso, devedor, gratis_ate, sem_taxa_apos, entregador_apos }
export function calcularCancelamento(p, agora = Date.now()) {
  const nao = (motivo) => ({ pode: false, motivo, taxa: 0, taxa_loja: 0, taxa_entregador: 0, reembolso: 0, devedor: false, gratis_ate: null, sem_taxa_apos: null, entregador_apos: null });
  if (p.status === 'cancelado') return nao('Este pedido já foi cancelado.');
  if (p.status === 'entregue') return nao('Este pedido já foi entregue.');
  if (p.status === 'saiu') return nao('O pedido já saiu para entrega. Fale com a loja pelo WhatsApp.');

  const online = formaOnline(p.forma_pagamento);
  const pagoNoApp = online && p.pagamento_status === 'pago';
  const iso = (t) => (t ? new Date(t).toISOString() : null);

  // Loja: janela contada do início do preparo.
  const inicio = p.status === 'preparo' && p.preparo_em ? new Date(p.preparo_em).getTime() : null;
  const fimGratis = inicio ? inicio + JANELA_GRATIS_MIN * 60000 : null;
  const fimTaxa = inicio ? inicio + FIM_TAXA_MIN * 60000 : null;
  const naJanelaGratis = Boolean(inicio) && agora <= fimGratis;
  const atrasado = Boolean(inicio) && agora > fimTaxa;
  // Em preparo, mas sem horário registrado: trata como fase de taxa (não dá para provar o prazo grátis).
  const faseLoja = p.status === 'preparo' && !naJanelaGratis && !atrasado;

  // Entregador: espera contada de quando ele chegou na loja.
  const chegou = p.entregador_id && p.chegou_loja_em ? new Date(p.chegou_loja_em).getTime() : null;
  const direitoEm = chegou ? chegou + ESPERA_ENTREGADOR_MIN * 60000 : null;
  const entregadorGanha = Boolean(direitoEm) && agora > direitoEm && !atrasado;

  const taxaLoja = faseLoja ? r2((Number(p.subtotal) * PCT_PRODUTOS) / 100) : 0;
  const taxaEntregador = entregadorGanha ? TAXA_ENTREGADOR : 0;
  const taxa = r2(taxaLoja + taxaEntregador);

  const info = {
    gratis_ate: naJanelaGratis ? iso(fimGratis) : null,
    sem_taxa_apos: inicio && !atrasado ? iso(fimTaxa) : null,
    entregador_apos: direitoEm && !entregadorGanha && !atrasado ? iso(direitoEm) : null,
  };

  // Sem taxa a pagar, ou pedido online que ainda nem foi pago (só cancela a cobrança): cancela de graça.
  if (taxa === 0 || (online && !pagoNoApp)) {
    return { pode: true, taxa: 0, taxa_loja: 0, taxa_entregador: 0, reembolso: pagoNoApp ? valorPago(p) : 0, devedor: false, ...info };
  }
  // Pago pelo app: a taxa sai do valor pago e o resto volta para o cliente.
  if (pagoNoApp) {
    return { pode: true, taxa, taxa_loja: taxaLoja, taxa_entregador: taxaEntregador, reembolso: r2(valorPago(p) - taxa), devedor: false, ...info };
  }
  // Dinheiro: nada foi pago ainda, então a taxa vira saldo devedor do cliente.
  return { pode: true, taxa, taxa_loja: taxaLoja, taxa_entregador: taxaEntregador, reembolso: 0, devedor: true, ...info };
}
