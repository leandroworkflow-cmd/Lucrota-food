// Números do painel do administrador. Funções puras (sem banco), testáveis.
// O dia vira à meia-noite de Brasília (UTC-3, sem horário de verão).

const OFFSET_MS = -3 * 3600e3;
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export const diaBR = (iso) => new Date(new Date(iso).getTime() + OFFSET_MS).toISOString().slice(0, 10);
export const mesBR = (iso) => diaBR(iso).slice(0, 7);
export const FORMA_GRUPO = { pix: 'Pix', pix_app: 'Pix', cartao: 'Cartão', cartao_app: 'Cartão', dinheiro: 'Dinheiro' };
const ANDAMENTO = ['novo', 'aceito', 'preparo', 'saiu'];

function resumo(lista) {
  const entregues = lista.filter((p) => p.status === 'entregue');
  const cancelados = lista.filter((p) => p.status === 'cancelado');
  const faturamento = r2(entregues.reduce((t, p) => t + Number(p.total), 0));
  return {
    recebidos: lista.length,
    entregues: entregues.length,
    cancelados: cancelados.length,
    faturamento,
    comissao: r2(entregues.reduce((t, p) => t + Number(p.comissao_valor || 0), 0)),
    taxas_cancelamento: r2(cancelados.reduce((t, p) => t + Number(p.taxa_cancelamento || 0), 0)),
    ticket_medio: entregues.length ? r2(faturamento / entregues.length) : 0,
  };
}

// pedidos: linhas de dl_pedidos. agora: Date.now(). nomes: { lojas: Map(id→nome), entregadores: Map(id→nome) }
export function calcularPainel(pedidos, agora, nomes = {}) {
  const hoje = diaBR(new Date(agora).toISOString());
  const mes = hoje.slice(0, 7);
  const lojas = nomes.lojas || new Map();
  const ents = nomes.entregadores || new Map();

  const doDia = pedidos.filter((p) => diaBR(p.criado_em) === hoje);
  const doMes = pedidos.filter((p) => mesBR(p.criado_em) === mes);
  const entreguesMes = doMes.filter((p) => p.status === 'entregue');

  const pagamento = {};
  for (const p of entreguesMes) {
    const g = FORMA_GRUPO[p.forma_pagamento] || 'Outro';
    pagamento[g] = r2((pagamento[g] || 0) + Number(p.total));
  }

  const topo = (mapa, chave, nomesMapa, valor) => {
    const soma = new Map();
    for (const p of entreguesMes) {
      const id = p[chave];
      if (!id) continue;
      soma.set(id, (soma.get(id) || 0) + valor(p));
    }
    return [...soma.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, v]) => ({ id, nome: nomesMapa.get(id) || '(removido)', valor: r2(v) }));
  };

  // Últimos 30 dias, um ponto por dia (inclui dias sem pedido).
  const dias = [];
  for (let i = 29; i >= 0; i--) {
    const d = diaBR(new Date(agora - i * 864e5).toISOString());
    dias.push({ dia: d, entregues: 0, cancelados: 0, faturamento: 0 });
  }
  const idx = new Map(dias.map((d, i) => [d.dia, i]));
  for (const p of pedidos) {
    const i = idx.get(diaBR(p.criado_em));
    if (i === undefined) continue;
    if (p.status === 'entregue') {
      dias[i].entregues++;
      dias[i].faturamento = r2(dias[i].faturamento + Number(p.total));
    } else if (p.status === 'cancelado') dias[i].cancelados++;
  }

  return {
    hoje: resumo(doDia),
    mes: resumo(doMes),
    andamento: ANDAMENTO.reduce((o, s) => ({ ...o, [s]: pedidos.filter((p) => p.status === s).length }), {}),
    pagamento,
    top_lojas: topo(null, 'loja_id', lojas, (p) => Number(p.total)),
    top_entregadores: topo(null, 'entregador_id', ents, () => 1).map((x) => ({ ...x, entregas: x.valor })),
    dias,
  };
}
