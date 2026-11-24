// Regras da entrega (puras, testáveis). O servidor aplica estas regras; a tela só mostra.

import { coordValida, distanciaM, estimativaSemRota } from './geo';

export const VEICULOS = { moto: 'Moto', bicicleta: 'Bicicleta', carro: 'Carro', a_pe: 'A pé' };
// Uma corrida de cada vez: a tela mostra só a corrida atual. Corridas paradas há mais de 12 h (esquecidas, de teste)
// não contam como "atual" e não bloqueiam novas corridas.
export const MAX_ENTREGAS_ATIVAS = 1;
export const JANELA_CORRIDA_ATUAL_H = 12;
export const desdeCorridaAtual = () => new Date(Date.now() - JANELA_CORRIDA_ATUAL_H * 3600 * 1000).toISOString();
const ANTES_DE_SAIR = ['aceito', 'preparo'];
export const RAIO_CHEGADA_M = 300; // distância máxima da loja para avisar "cheguei" (o GPS do celular erra algumas dezenas de metros)

// Confere pelo GPS que o entregador está perto da loja. Sem GPS de um dos lados, não bloqueia.
export function chegadaValida(posicao, loja, raio = RAIO_CHEGADA_M, onde = 'da loja') {
  if (!posicao || !coordValida(posicao.lat, posicao.lng) || !coordValida(loja?.lat, loja?.lng)) return { ok: true, medido: false };
  const m = Math.round(distanciaM(posicao, { lat: loja.lat, lng: loja.lng }));
  if (m > raio) return { erro: `Você ainda está a ${m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`} ${onde}. Avise quando chegar.` };
  return { ok: true, medido: true, metros: m };
}

// O entregador só vê a corrida se ela é da loja dele (convite) ou, sendo da plataforma, se foi aprovado
// e a loja aceita entregadores da plataforma.
export function entregadorPodeVer(ent, pedido, loja) {
  if (!ent?.online) return false;
  if (pedido.entrega !== 'procurando' || pedido.entregador_id) return false;
  if (!ANTES_DE_SAIR.includes(pedido.status)) return false;
  if (ent.loja_id) return ent.loja_id === pedido.loja_id;
  return Boolean(ent.aprovado) && loja?.aceita_plataforma !== false;
}

// Passos da entrega feitos pelo entregador. Devolve o que gravar, ou { erro }.
export function passoDaEntrega(ent, pedido, acao, agora = new Date().toISOString()) {
  if (pedido.entregador_id !== ent.id) return { erro: 'Esta entrega não é sua.' };
  if (acao === 'cheguei') {
    if (!ANTES_DE_SAIR.includes(pedido.status)) return { erro: 'Este pedido não está mais aguardando retirada.' };
    if (pedido.chegou_loja_em) return { erro: 'A loja já foi avisada que você chegou.' };
    return { dados: { chegou_loja_em: agora, atualizado_em: agora } };
  }
  if (acao === 'cheguei_cliente') {
    if (pedido.status !== 'saiu') return { erro: 'Confirme primeiro que pegou o pedido.' };
    if (pedido.chegou_cliente_em) return { erro: 'O cliente já foi avisado que você chegou.' };
    return { dados: { chegou_cliente_em: agora, atualizado_em: agora } };
  }
  if (acao === 'coletei') {
    if (!ANTES_DE_SAIR.includes(pedido.status)) return { erro: 'Este pedido não está mais aguardando retirada.' };
    return { dados: { status: 'saiu', coletado_em: agora, atualizado_em: agora } };
  }
  if (acao === 'entreguei') {
    if (pedido.status !== 'saiu') return { erro: 'Confirme primeiro que pegou o pedido.' };
    return { dados: { status: 'entregue', entregue_em: agora, atualizado_em: agora } };
  }
  if (acao === 'desistir') {
    if (pedido.status === 'saiu') return { erro: 'Com o pedido na mão, fale com a loja para cancelar a entrega.' };
    return { dados: { entregador_id: null, entrega: 'procurando', chegou_loja_em: null, entregador_nome: null, entregador_veiculo: null, atualizado_em: agora } };
  }
  return { erro: 'Ação inválida.' };
}

// A loja chama (ou cancela a chamada de) um entregador.
export function chamadaDaLoja(pedido, cancelar = false, agora = new Date().toISOString()) {
  if (cancelar) {
    if (pedido.entregador_id) return { erro: 'Um entregador já aceitou. Fale com ele antes de cancelar.' };
    return { dados: { entrega: null, atualizado_em: agora } };
  }
  if (!ANTES_DE_SAIR.includes(pedido.status)) return { erro: 'Aceite o pedido antes de chamar o entregador.' };
  if (pedido.entrega) return { erro: 'O entregador já foi chamado.' };
  return { dados: { entrega: 'procurando', atualizado_em: agora } };
}

export function validarCadastroEntregador(b, normalizarTelefone) {
  const nome = String(b?.nome || '').trim();
  const telefone = normalizarTelefone(String(b?.telefone || ''));
  const veiculo = String(b?.veiculo || 'moto');
  const codigo = String(b?.codigo || '').trim().toUpperCase();
  if (nome.length < 2 || nome.length > 60) return { erro: 'Informe seu nome.' };
  if (!telefone) return { erro: 'Informe um WhatsApp com DDD.' };
  if (!VEICULOS[veiculo]) return { erro: 'Escolha o seu veículo.' };
  if (codigo && !/^[A-Z0-9]{6}$/.test(codigo)) return { erro: 'O código da loja tem 6 letras ou números.' };
  return { dados: { nome, telefone, veiculo }, codigo: codigo || null };
}

// Corridas disponíveis com a distância (em linha reta, ~30% a mais de trajeto) do entregador até a loja, da mais perto para a mais longe.
// Sem posição do entregador (ou sem localização da loja) mantém a ordem original, sem distância.
export function corridasPorDistancia(corridas, pos) {
  const lista = (corridas || []).map((c) => {
    const loja = c.dl_lojas;
    if (!pos || !coordValida(pos.lat, pos.lng) || !coordValida(loja?.lat, loja?.lng)) return { ...c, distancia_m: null, tempo_s: null };
    const e = estimativaSemRota(pos, { lat: loja.lat, lng: loja.lng });
    return { ...c, distancia_m: e.metros, tempo_s: e.segundos };
  });
  if (!pos) return lista;
  return lista
    .map((c, i) => ({ c, i }))
    .sort((a, b) => (a.c.distancia_m ?? Infinity) - (b.c.distancia_m ?? Infinity) || a.i - b.i)
    .map((x) => x.c);
}
