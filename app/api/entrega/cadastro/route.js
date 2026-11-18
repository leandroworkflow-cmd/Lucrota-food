import { erro, entregadorDaRequisicao, lerJson } from '../../../../lib/entrega-servidor';
import { validarCadastroEntregador } from '../../../../lib/entrega';
import { normalizarTelefone } from '../../../../lib/format';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const c = await entregadorDaRequisicao(request, { exigir: false });
  if (c.resposta) return c.resposta;
  if (c.ent) return erro('Você já tem cadastro de entregador.', 409);
  const body = await lerJson(request);
  const v = validarCadastroEntregador(body, normalizarTelefone);
  if (v.erro) return erro(v.erro, 400);

  let lojaId = null;
  if (v.codigo) {
    const { data: loja } = await c.admin.from('dl_lojas').select('id').eq('codigo_entregador', v.codigo).maybeSingle();
    if (!loja) return erro('Não encontrei nenhuma loja com esse código. Confira com a loja.', 404);
    lojaId = loja.id;
  }
  const { error } = await c.admin
    .from('dl_entregadores')
    .insert({ user_id: c.user.id, ...v.dados, loja_id: lojaId, aprovado: Boolean(lojaId) });
  if (error) return erro('Não consegui concluir o cadastro. Tente de novo.', 502);
  return Response.json({ ok: true, exclusivo: Boolean(lojaId) });
}
