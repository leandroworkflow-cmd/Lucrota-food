import { avisarUsuarios } from '../../../../lib/avisos-servidor';
import { erro, lerJson, uuidValido } from '../../../../lib/entrega-servidor';
import { clienteServico, usuarioDaRequisicao } from '../../../../lib/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A loja marca o pedido como pronto para retirar. O entregador que aceitou recebe um aviso.
export async function POST(request) {
  const r = await usuarioDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const admin = clienteServico();
  if (!admin) return erro('Serviço ainda não configurado no servidor.', 503);
  const body = await lerJson(request);
  if (!uuidValido(body?.pedido_id)) return erro('Pedido inválido.', 400);

  const { data: pedido } = await admin
    .from('dl_pedidos')
    .select('id,numero,status,entregador_id,pronto_em,pagamento_status,dl_lojas(dono_id,nome)')
    .eq('id', body.pedido_id)
    .maybeSingle();
  if (!pedido || pedido.dl_lojas?.dono_id !== r.user.id) return erro('Pedido não encontrado.', 404);
  if (pedido.status !== 'preparo') return erro('Só dá para marcar como pronto um pedido em preparo.', 409);
  if (pedido.pronto_em) return Response.json({ ok: true });

  const agora = new Date().toISOString();
  const { error } = await admin.from('dl_pedidos').update({ pronto_em: agora, atualizado_em: agora }).eq('id', pedido.id).eq('status', 'preparo');
  if (error) return erro('Não consegui marcar agora. Rode o SQL 21 no Supabase e tente de novo.', 502);

  if (pedido.entregador_id) {
    const { data: ent } = await admin.from('dl_entregadores').select('user_id').eq('id', pedido.entregador_id).maybeSingle();
    if (ent?.user_id) {
      await avisarUsuarios(admin, [ent.user_id], {
        titulo: `Pedido #${pedido.numero} pronto`,
        corpo: `${pedido.dl_lojas?.nome || 'A loja'} terminou o pedido. Pode retirar.`,
        url: '/entregador',
        tag: `pronto-${pedido.numero}`,
      });
    }
  }
  return Response.json({ ok: true });
}
