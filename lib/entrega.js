// Regras da entrega (puras, testáveis). O servidor aplica estas regras; a tela só mostra.

export const VEICULOS = { moto: 'Moto', bicicleta: 'Bicicleta', carro: 'Carro', a_pe: 'A pé' };
export const MAX_ENTREGAS_ATIVAS = 3;
const ANTES_DE_SAIR = ['aceito', 'preparo'];

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
    return { dados: { entregador_id: null, entrega: 'procurando', atualizado_em: agora } };
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
