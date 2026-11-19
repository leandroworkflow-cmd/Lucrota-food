// Regras do pedido (funções puras, sem imports). O servidor SEMPRE recalcula preços e totais
// a partir do banco: o que o navegador manda só diz o que foi escolhido, nunca quanto custa.

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const texto = (v, max) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);

export const FORMAS = {
  pix: 'Pix na entrega',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão na entrega',
  pix_app: 'Pix pelo app',
};

export const STATUS = {
  novo: 'Novo',
  aceito: 'Aceito',
  preparo: 'Em preparo',
  saiu: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const PROXIMO = { novo: 'aceito', aceito: 'preparo', preparo: 'saiu', saiu: 'entregue' };
export const ACAO = { novo: 'Aceitar', aceito: 'Iniciar preparo', preparo: 'Saiu para entrega', saiu: 'Marcar entregue' };

function telefoneBR(t) {
  const d = String(t ?? '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d;
  return '';
}

// loja: { ativa, aberta, pedido_minimo, taxa_entrega, comissao_pct }
// produtos: lista da loja ({ id, nome, preco, ativo })
// entrada: { itens: [{ id, qtd, obs }], cliente: {...}, forma, troco, observacao }
export function validarPedido(loja, produtos, entrada) {
  if (!loja || !loja.ativa) return { erro: 'Esta loja não está disponível.' };
  if (!loja.aberta) return { erro: 'A loja está fechada agora. Tente mais tarde.' };

  const bruto = Array.isArray(entrada?.itens) ? entrada.itens : [];
  if (bruto.length === 0 || bruto.length > 40) return { erro: 'Adicione itens à sacola.' };

  const porId = new Map((produtos || []).map((p) => [p.id, p]));
  const somados = new Map();
  for (const it of bruto) {
    const prod = porId.get(it?.id);
    const qtd = Number(it?.qtd);
    if (!prod || !prod.ativo) return { erro: 'Um item da sacola não está mais disponível. Atualize a página.' };
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > 20) return { erro: 'Quantidade inválida.' };
    const obs = texto(it?.obs, 80);
    const chave = `${prod.id}|${obs}`;
    const atual = somados.get(chave);
    if (atual) atual.qtd += qtd;
    else somados.set(chave, { id: prod.id, nome: prod.nome, preco: Number(prod.preco), qtd, obs });
  }
  const itens = [...somados.values()];
  if (itens.some((i) => i.qtd > 20)) return { erro: 'Quantidade inválida.' };

  const subtotal = r2(itens.reduce((s, i) => s + i.preco * i.qtd, 0));
  if (subtotal < Number(loja.pedido_minimo || 0)) {
    return { erro: `O pedido mínimo desta loja é R$ ${Number(loja.pedido_minimo).toFixed(2).replace('.', ',')}.` };
  }

  const c = entrada?.cliente || {};
  const nome = texto(c.nome, 60);
  const telefone = telefoneBR(c.telefone);
  const endereco = texto(c.endereco, 120);
  if (nome.length < 2) return { erro: 'Informe seu nome.' };
  if (!telefone) return { erro: 'Informe um telefone com DDD.' };
  if (endereco.length < 5) return { erro: 'Informe o endereço de entrega.' };

  const forma = String(entrada?.forma || '');
  if (!Object.keys(FORMAS).includes(forma)) return { erro: 'Escolha a forma de pagamento.' };
  if (forma === 'pix_app' && !loja.aceita_pix_app) return { erro: 'Esta loja ainda não aceita Pix pelo app.' };

  const taxa = r2(loja.taxa_entrega);
  const total = r2(subtotal + taxa);
  let troco = null;
  if (forma === 'dinheiro' && entrada?.troco !== undefined && entrada?.troco !== null && entrada?.troco !== '') {
    troco = r2(entrada.troco);
    if (!(troco >= total)) return { erro: 'O valor para troco precisa ser maior ou igual ao total.' };
  }

  const pct = Number(loja.comissao_pct || 0);
  return {
    pedido: {
      cliente_nome: nome,
      cliente_telefone: telefone,
      endereco,
      bairro: texto(c.bairro, 60) || null,
      complemento: texto(c.complemento, 60) || null,
      forma_pagamento: forma,
      troco_para: troco,
      observacao: texto(entrada?.observacao, 200) || null,
      itens,
      subtotal,
      taxa_entrega: taxa,
      total,
      comissao_pct: pct,
      comissao_valor: r2((subtotal * pct) / 100), // a comissão incide só sobre os produtos
    },
  };
}
