import { avisarAdmins } from '../../../../lib/admin-servidor';
import { clienteServico, usuarioDaRequisicao } from '../../../../lib/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Chamada pela própria loja logo depois de se cadastrar: avisa o administrador (uma vez por loja).
export async function POST(request) {
  const r = await usuarioDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const admin = clienteServico();
  if (!admin) return Response.json({ ok: true });
  const { data: loja } = await admin.from('dl_lojas').select('id,nome,ativa,criado_em').eq('dono_id', r.user.id).maybeSingle();
  // Só vale para loja nova e ainda não aprovada.
  if (!loja || loja.ativa || Date.now() - new Date(loja.criado_em).getTime() > 30 * 60e3) return Response.json({ ok: true });
  // Marca que já avisou (dl_config.chave é única): a segunda chamada não avisa de novo.
  const { error } = await admin.from('dl_config').insert({ chave: `aviso_loja_${loja.id}`, valor: 1 });
  if (error) return Response.json({ ok: true });
  await avisarAdmins(admin, { titulo: 'Loja nova para aprovar', corpo: `${loja.nome} se cadastrou. Confira o CNPJ no /admin.` });
  return Response.json({ ok: true });
}
