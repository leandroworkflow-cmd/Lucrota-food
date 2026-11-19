// Contas do Pix pelo app e da conta corrente (funções puras). O servidor SEMPRE recalcula; nada vem do navegador.
//
// Modelo: o Pix pelo app cai INTEIRO na conta da plataforma, que repassa depois.
//  - Pix: loja ganha (+) os produtos e paga (−) a comissão; o entregador ganha (+) a taxa de entrega e paga (−) a parte da plataforma.
//  - Dinheiro (ou Pix/cartão na entrega): quem recebeu o dinheiro fica DEVENDO a parte da plataforma (−):
//    a loja deve a comissão; o entregador deve a parte da plataforma sobre a taxa de entrega.
//  - O saldo de cada conta é a soma dos lançamentos. Positivo: a plataforma repassa. Negativo: a pessoa deve à plataforma.
//    Os Pix do app e os pedidos em dinheiro se compensam na mesma conta.

export const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const pagamentoValido = (total) => Number(total) >= 1;

// E-mail do pagador (o Mercado Pago exige um): usa o do cliente se for válido, senão um gerado.
export function emailDoPagador(email, numero) {
  const e = String(email || '').trim().toLowerCase();
  if (/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(e) && e.length <= 120) return e;
  return `pedido${numero}@meudelivery.app`;
}

// Data de expiração do Pix no formato que o Mercado Pago pede (horário de Brasília, -03:00).
export function expiracaoMP(minutos = 30, agora = Date.now()) {
  const alvo = new Date(agora + minutos * 60000);
  const br = new Date(alvo.getTime() - 3 * 3600000);
  return `${br.toISOString().slice(0, 23)}-03:00`;
}

// Lançamentos de um pedido ENTREGUE. Cada item: { conta_tipo, loja_id|entregador_id, tipo, valor, descricao }.
// comissaoEntregaPct: % da taxa de entrega que a plataforma retém do entregador do app (padrão 0).
export function lancamentosDoPedido(p, { comissaoEntregaPct = 0 } = {}) {
  const pix = p.forma_pagamento === 'pix_app';
  if (pix && p.pagamento_status !== 'pago') return [];

  const produtos = r2(p.subtotal);
  const entrega = r2(p.taxa_entrega);
  const comissao = r2(p.comissao_valor);
  const doEntregador = p.entregador_id ? r2((entrega * Number(comissaoEntregaPct || 0)) / 100) : 0;
  const nome = `Pedido ${p.numero}`;

  const loja = (tipo, valor, descricao) => ({ conta_tipo: 'loja', loja_id: p.loja_id, entregador_id: null, tipo, valor, descricao });
  const ent = (tipo, valor, descricao) => ({ conta_tipo: 'entregador', loja_id: null, entregador_id: p.entregador_id, tipo, valor, descricao });

  const linhas = [];
  if (pix) {
    linhas.push(loja('venda_pix', produtos, `${nome}: produtos pagos por Pix`));
    linhas.push(loja('comissao', -comissao, `${nome}: comissão da plataforma`));
    if (p.entregador_id) {
      linhas.push(ent('entrega_pix', entrega, `${nome}: taxa de entrega paga por Pix`));
      linhas.push(ent('comissao_entrega', -doEntregador, `${nome}: parte da plataforma na entrega`));
    } else {
      linhas.push(loja('entrega_pix', entrega, `${nome}: taxa de entrega paga por Pix`));
    }
  } else {
    linhas.push(loja('comissao', -comissao, `${nome}: comissão (recebido em dinheiro ou na entrega)`));
    if (p.entregador_id) linhas.push(ent('comissao_entrega', -doEntregador, `${nome}: parte da plataforma na entrega (recebido em dinheiro)`));
  }
  return linhas.filter((l) => l.valor !== 0);
}

export const somaSaldo = (linhas) => r2(linhas.reduce((s, l) => s + Number(l.valor || 0), 0));
