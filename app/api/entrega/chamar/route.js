import { avisarCorridaDisponivel } from '../../../../lib/corrida-servidor';
import { chamadaDaLoja } from '../../../../lib/entrega';
import { erro, lerJson, uuidValido } from '../../../../lib/entrega-servidor';
import { clienteServico, usuarioDaRequisicao } from '../../../../lib/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A loja chama (ou cancela a chamada de) um entregador para um pedido dela.
export async function POST(request) {
  const r = await usuarioDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const admin = clienteServico();
  if (!admin) return erro('Serviço de entregas ainda não configurado.', 503);
  const body = await lerJson(request);
  if (!uuidValido(body?.pedido_id)) return erro('Pedido inválido.', 400);

  const { data: pedido } = await admin
    .from('dl_pedidos')
    .select('id,status,entrega,entregador_id,loja_id,bairro,taxa_entrega,dl_lojas(dono_id,nome,aceita_plataforma)')
    .eq('id', body.pedido_id)
    .maybeSingle();
  if (!pedido || pedido.dl_lojas?.dono_id !== r.user.id) return erro('Pedido não encontrado.', 404);

  const passo = chamadaDaLoja(pedido, Boolean(body.cancelar));
  if (passo.erro) return erro(passo.erro, 409);
  const { error } = await admin.from('dl_pedidos').update(passo.dados).eq('id', pedido.id);
  if (error) return erro('Não consegui atualizar agora. Tente de novo.', 502);

  if (!body.cancelar) await avisarCorridaDisponivel(admin, pedido.id);
  return Response.json({ ok: true });
}
