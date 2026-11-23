import { avisoCorridaNova } from './avisos-texto';
import { avisarUsuarios } from './avisos-servidor';
import { entregadorPodeVer } from './entrega';

// Avisa no celular quem pode pegar a corrida: entregadores online da loja e, se ela aceita, os aprovados da plataforma.
// reaberta: o entregador anterior desistiu. exceto: entregador que não deve ser avisado (o que acabou de desistir).
export async function avisarCorridaDisponivel(admin, pedidoId, { reaberta = false, exceto = null } = {}) {
  try {
    const { data: pedido } = await admin
      .from('dl_pedidos')
      .select('id,status,entrega,entregador_id,loja_id,bairro,taxa_entrega,frete_entregador,dl_lojas(nome,aceita_plataforma)')
      .eq('id', pedidoId)
      .maybeSingle();
    if (!pedido || pedido.entrega !== 'procurando' || pedido.entregador_id) return;
    const { data: lista } = await admin
      .from('dl_entregadores')
      .select('id,user_id,online,loja_id,aprovado')
      .eq('online', true)
      .or(`loja_id.eq.${pedido.loja_id},and(loja_id.is.null,aprovado.eq.true)`)
      .limit(50);
    const ids = (lista || []).filter((e) => e.id !== exceto && entregadorPodeVer(e, pedido, pedido.dl_lojas)).map((e) => e.user_id);
    await avisarUsuarios(admin, ids, {
      ...avisoCorridaNova({ lojaNome: pedido.dl_lojas?.nome, bairro: pedido.bairro, taxa: pedido.frete_entregador ?? pedido.taxa_entrega, reaberta }),
      url: '/entregador',
      tag: 'corrida',
    });
  } catch (e) {
    console.error('Aviso de corrida falhou:', e?.message || e);
  }
}
