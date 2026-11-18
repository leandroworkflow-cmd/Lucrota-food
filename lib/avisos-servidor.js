import { enviarPush, pushConfigurado } from './push-servidor';

// Todas as funções aqui nunca lançam erro: aviso que falha não pode derrubar o pedido.

async function enviarLote(admin, tabela, linhas, payload) {
  await Promise.allSettled(
    linhas.map(async (sub) => {
      const r = await enviarPush(sub, payload);
      if (r.expirada) await admin.from(tabela).delete().eq('id', sub.id);
    })
  );
}

// Avisa contas (dono de loja ou entregador) pelos aparelhos que ativaram os avisos.
export async function avisarUsuarios(admin, userIds, payload) {
  try {
    if (!pushConfigurado() || !userIds.length) return;
    const { data } = await admin
      .from('dl_push_inscricoes')
      .select('id,endpoint,p256dh,auth')
      .in('user_id', [...new Set(userIds)].slice(0, 50));
    await enviarLote(admin, 'dl_push_inscricoes', data || [], payload);
  } catch (e) {
    console.error('Aviso falhou:', e?.message || e);
  }
}

// Avisa o cliente de um pedido (sem conta: a inscrição fica presa ao pedido).
export async function avisarCliente(admin, pedidoId, payload) {
  try {
    if (!pushConfigurado()) return;
    const { data } = await admin.from('dl_push_clientes').select('id,endpoint,p256dh,auth').eq('pedido_id', pedidoId).limit(5);
    await enviarLote(admin, 'dl_push_clientes', data || [], payload);
  } catch (e) {
    console.error('Aviso ao cliente falhou:', e?.message || e);
  }
}
