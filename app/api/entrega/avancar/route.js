import { passoDaEntrega } from '../../../../lib/entrega';
import { entregadorDaRequisicao, erro, lerJson, uuidValido } from '../../../../lib/entrega-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// acao: 'coletei' | 'entreguei' | 'desistir'
export async function POST(request) {
  const c = await entregadorDaRequisicao(request);
  if (c.resposta) return c.resposta;
  const { admin, ent } = c;
  const body = await lerJson(request);
  if (!uuidValido(body?.pedido_id)) return erro('Pedido inválido.', 400);

  const { data: pedido } = await admin
    .from('dl_pedidos')
    .select('id,status,entregador_id,entrega')
    .eq('id', body.pedido_id)
    .maybeSingle();
  if (!pedido) return erro('Pedido não encontrado.', 404);

  const passo = passoDaEntrega(ent, pedido, body.acao);
  if (passo.erro) return erro(passo.erro, 409);

  const { error } = await admin.from('dl_pedidos').update(passo.dados).eq('id', pedido.id).eq('entregador_id', ent.id);
  if (error) return erro('Não consegui atualizar agora. Tente de novo.', 502);
  // Terminou ou desistiu: apaga a posição guardada, para não expor a localização à toa.
  if (body.acao === 'entreguei' || body.acao === 'desistir') {
    const { count } = await admin
      .from('dl_pedidos')
      .select('id', { count: 'exact', head: true })
      .eq('entregador_id', ent.id)
      .eq('status', 'saiu');
    if (!count) await admin.from('dl_localizacoes').delete().eq('entregador_id', ent.id);
  }
  return Response.json({ ok: true });
}
