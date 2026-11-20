// Textos dos avisos e regras de quem pode mudar o quê (puro, testável).

// O que a loja pode fazer a partir de cada status.
export const LOJA_PODE = {
  novo: ['aceito', 'cancelado'],
  aceito: ['preparo', 'cancelado'],
  preparo: ['saiu', 'cancelado'],
  saiu: ['entregue'],
};

export function transicaoDaLoja(de, para, temEntregador = false) {
  if (!(LOJA_PODE[de] || []).includes(para)) return { erro: 'Essa mudança de status não é possível.' };
  if (temEntregador && (para === 'saiu' || para === 'entregue')) return { erro: 'O entregador conduz essa etapa pelo app dele.' };
  return { ok: true };
}

export function avisoDoCliente(status, { numero, lojaNome, entregadorNome } = {}) {
  switch (status) {
    case 'aceito':
      return { titulo: `Pedido ${numero} aceito`, corpo: `${lojaNome || 'A loja'} aceitou o seu pedido.` };
    case 'preparo':
      return { titulo: `Pedido ${numero} em preparo`, corpo: 'Já estão preparando o seu pedido.' };
    case 'saiu':
      return {
        titulo: 'Seu pedido saiu para entrega 🛵',
        corpo: entregadorNome ? `${entregadorNome} está a caminho. Acompanhe no mapa.` : 'Está a caminho. Acompanhe pelo link.',
      };
    case 'entregue':
      return { titulo: 'Pedido entregue', corpo: 'Bom apetite! Obrigado por pedir pelo Brokê.' };
    case 'cancelado':
      return { titulo: `Pedido ${numero} cancelado`, corpo: 'A loja cancelou o pedido. Fale com ela pelo WhatsApp.' };
    default:
      return null;
  }
}

export function avisoCorridaNova({ lojaNome, bairro, taxa }) {
  const valor = Number(taxa) > 0 ? ` · R$ ${Number(taxa).toFixed(2).replace('.', ',')}` : '';
  return { titulo: 'Corrida nova 🛵', corpo: `${lojaNome}${bairro ? ` → ${bairro}` : ''}${valor}` };
}

export function avisoParaLoja(tipo, { numero, entregadorNome } = {}) {
  if (tipo === 'aceitou') return { titulo: `Pedido ${numero}: entregador a caminho`, corpo: `${entregadorNome || 'Um entregador'} aceitou a corrida.` };
  if (tipo === 'coletou') return { titulo: `Pedido ${numero} saiu`, corpo: `${entregadorNome || 'O entregador'} pegou o pedido.` };
  if (tipo === 'entregou') return { titulo: `Pedido ${numero} entregue`, corpo: `${entregadorNome || 'O entregador'} confirmou a entrega.` };
  return null;
}
