import { avisoParaLoja } from '../../../../lib/avisos-texto';
import { avisarUsuarios } from '../../../../lib/avisos-servidor';
import { entregadorPodeVer, MAX_ENTREGAS_ATIVAS } from '../../../../lib/entrega';
import { entregadorDaRequisicao, erro, lerJson, uuidValido } from '../../../../lib/entrega-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const c = await entregadorDaRequisicao(request);
  if (c.resposta) return c.resposta;
  const { admin, ent } = c;
  const body = await lerJson(request);
  if (!uuidValido(body?.pedido_id)) return erro('Pedido inválido.', 400);

  const { count } = await admin
    .from('dl_pedidos')
    .select('id', { count: 'exact', head: true })
    .eq('entregador_id', ent.id)
    .in('status', ['aceito', 'preparo', 'saiu']);
  if ((count || 0) >= MAX_ENTREGAS_ATIVAS) return erro(`Termine uma entrega antes de aceitar outra (limite: ${MAX_ENTREGAS_ATIVAS}).`, 409);

  const { data: pedido } = await admin
    .from('dl_pedidos')
    .select('id,numero,status,loja_id,entrega,entregador_id,dl_lojas(aceita_plataforma,dono_id)')
    .eq('id', body.pedido_id)
    .maybeSingle();
  if (!pedido || !entregadorPodeVer(ent, pedido, pedido.dl_lojas)) return erro('Essa corrida não está mais disponível.', 409);

  // A condição "entregador_id is null" garante que só um entregador consegue pegar a corrida.
  const { data: pego, error } = await admin
    .from('dl_pedidos')
    .update({ entregador_id: ent.id, entrega: 'aceita', atualizado_em: new Date().toISOString() })
    .eq('id', pedido.id)
    .is('entregador_id', null)
    .eq('entrega', 'procurando')
    .select('id')
    .maybeSingle();
  if (error) return erro('Não consegui aceitar agora. Tente de novo.', 502);
  if (!pego) return erro('Outro entregador pegou essa corrida primeiro.', 409);
  await avisarUsuarios(admin, [pedido.dl_lojas?.dono_id].filter(Boolean), {
    ...avisoParaLoja('aceitou', { numero: pedido.numero, entregadorNome: ent.nome.split(' ')[0] }),
    url: '/painel',
    tag: `entrega-${pedido.numero}`,
  });
  return Response.json({ ok: true });
}
