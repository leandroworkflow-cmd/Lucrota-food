import { avisarAdmins } from '../../../../lib/admin-servidor';
import { erro, lerJson } from '../../../../lib/entrega-servidor';
import { clienteServico, usuarioDaRequisicao } from '../../../../lib/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Excluir a própria conta. Conta só de cliente: apaga na hora. Lojista e entregador: vira pedido para o admin
// (ele confere saldo a receber/pagar e pedidos em andamento antes de apagar, para não perder registro financeiro).
export async function POST(request) {
  const r = await usuarioDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const admin = clienteServico();
  if (!admin) return erro('Serviço ainda não configurado no servidor.', 503);
  const body = await lerJson(request);
  if (body?.confirmar !== 'EXCLUIR') return erro('Confirmação ausente.', 400);

  const [{ data: loja }, { data: ent }] = await Promise.all([
    admin.from('dl_lojas').select('id').eq('dono_id', r.user.id).maybeSingle(),
    admin.from('dl_entregadores').select('id').eq('user_id', r.user.id).maybeSingle(),
  ]);

  if (loja || ent) {
    const papel = [loja && 'lojista', ent && 'entregador'].filter(Boolean).join(' e ');
    const { error } = await admin.from('dl_exclusoes').upsert({ user_id: r.user.id, email: r.user.email || null, papel, status: 'pendente', criado_em: new Date().toISOString() }, { onConflict: 'user_id' });
    if (error) return erro('Não consegui registrar o pedido. Rode o SQL 23 no Supabase.', 502);
    await avisarAdmins(admin, { titulo: 'Pedido de exclusão de conta', corpo: `${r.user.email || 'Um usuário'} (${papel}) pediu para excluir a conta.` });
    return Response.json({ ok: true, pedido: true });
  }

  const { error } = await admin.auth.admin.deleteUser(r.user.id);
  if (error) return erro('Não consegui excluir agora. Tente de novo.', 502);
  return Response.json({ ok: true, excluida: true });
}
