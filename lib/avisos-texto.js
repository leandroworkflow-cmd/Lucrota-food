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
    case 'chegou_loja':
      return { titulo: 'Entregador na loja 🛵', corpo: `${entregadorNome || 'O entregador'} chegou para buscar o pedido ${numero}.` };
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

export function avisoParaLoja(tipo, { numero, entregadorNome, taxa } = {}) {
  if (tipo === 'aceitou') return { titulo: `Pedido ${numero}: entregador a caminho`, corpo: `${entregadorNome || 'Um entregador'} aceitou a corrida.` };
  if (tipo === 'chegou') return { titulo: `🛵 Pedido ${numero}: entregador chegou`, corpo: `${entregadorNome || 'O entregador'} está na loja para retirar o pedido. Entregue a ele.` };
  if (tipo === 'cancelou_cliente') return { titulo: `Pedido ${numero} cancelado pelo cliente`, corpo: taxa > 0 ? `O cliente cancelou. Taxa de cancelamento de R$ ${Number(taxa).toFixed(2).replace('.', ',')} entra na sua conta.` : 'O cliente cancelou antes do prazo de cobrança.' };
  if (tipo === 'desistiu') return { titulo: `Pedido ${numero}: entregador desistiu`, corpo: 'Estamos procurando outro entregador para esta corrida.' };
  if (tipo === 'coletou') return { titulo: `Pedido ${numero} saiu`, corpo: `${entregadorNome || 'O entregador'} pegou o pedido.` };
  if (tipo === 'entregou') return { titulo: `Pedido ${numero} entregue`, corpo: `${entregadorNome || 'O entregador'} confirmou a entrega.` };
  return null;
}

export function avisoCancelamentoEntregador({ numero, taxa }) {
  const extra = Number(taxa) > 0 ? ` Você recebe R$ ${Number(taxa).toFixed(2).replace('.', ',')} pela corrida.` : '';
  return { titulo: `Corrida ${numero} cancelada`, corpo: `O cliente cancelou o pedido.${extra}` };
}
