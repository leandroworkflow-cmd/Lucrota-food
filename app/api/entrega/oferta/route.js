import { entregadorDaRequisicao, erro, lerJson, uuidValido } from '../../../../lib/entrega-servidor';
import { registrarOferta } from '../../../../lib/ofertas-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// O entregador recusou a corrida oferecida ou o tempo dela acabou.
export async function POST(request) {
  const c = await entregadorDaRequisicao(request);
  if (c.resposta) return c.resposta;
  const body = await lerJson(request);
  if (!uuidValido(body?.pedido_id) || !['recusada', 'expirada'].includes(body?.resposta)) return erro('Requisição inválida.', 400);
  const { data: pedido } = await c.admin.from('dl_pedidos').select('id').eq('id', body.pedido_id).maybeSingle();
  if (!pedido) return erro('Pedido não encontrado.', 404);
  // Quem já aceitou ou concluiu essa corrida não volta atrás; recusa explícita vale sobre expiração.
  const { data: atual } = await c.admin.from('dl_ofertas').select('resposta').eq('entregador_id', c.ent.id).eq('pedido_id', pedido.id).maybeSingle();
  if (atual && atual.resposta !== 'expirada') return Response.json({ ok: true });
  await registrarOferta(c.admin, c.ent.id, pedido.id, body.resposta);
  return Response.json({ ok: true });
}
