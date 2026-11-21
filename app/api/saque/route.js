import { avisarAdmins } from '../../../lib/admin-servidor';
import { brl } from '../../../lib/format';
import { VALOR_MINIMO_SAQUE, disponivel, validarSaque } from '../../../lib/saque';
import { contaDoUsuario, saldoDaConta } from '../../../lib/saque-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const erro = (error, status) => Response.json({ error }, { status });
const COL = { loja: 'loja_id', entregador: 'entregador_id' };

export async function GET(request) {
  const tipo = new URL(request.url).searchParams.get('conta');
  const c = await contaDoUsuario(request, tipo);
  if (c.resposta) return c.resposta;
  const { saldo, pendente } = await saldoDaConta(c.admin, c.tipo, c.id);
  const { data: saques } = await c.admin
    .from('dl_saques')
    .select('id,valor,status,motivo,criado_em,resolvido_em')
    .eq(COL[c.tipo], c.id)
    .order('criado_em', { ascending: false })
    .limit(10);
  return Response.json(
    { saldo, pendente, disponivel: disponivel(saldo, pendente), minimo: VALOR_MINIMO_SAQUE, chave_pix: c.chave_pix || null, saques: saques || [] },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return erro('Requisição inválida.', 400); }
  const c = await contaDoUsuario(request, body?.conta);
  if (c.resposta) return c.resposta;

  // Cancelar um pedido que ainda não foi pago.
  if (body.acao === 'cancelar') {
    if (typeof body.id !== 'string') return erro('Requisição inválida.', 400);
    const { data } = await c.admin
      .from('dl_saques')
      .update({ status: 'cancelado', resolvido_em: new Date().toISOString() })
      .eq('id', body.id)
      .eq(COL[c.tipo], c.id)
      .eq('status', 'pendente')
      .select('id');
    if (!data?.length) return erro('Esse pedido já foi pago ou cancelado.', 409);
    return Response.json({ ok: true });
  }

  const { saldo, pendente } = await saldoDaConta(c.admin, c.tipo, c.id);
  const v = validarSaque({ valor: body.valor, saldo, pendente, chave: c.chave_pix });
  if (v.erro) return erro(v.erro, 400);

  const { data: id, error } = await c.admin.rpc('dl_pedir_saque', { p_tipo: c.tipo, p_id: c.id, p_valor: v.valor, p_chave: c.chave_pix, p_minimo: VALOR_MINIMO_SAQUE });
  if (error) {
    const m = String(error.message);
    if (m.includes('saldo_insuficiente')) return erro('O saldo mudou. Atualize a tela e tente de novo.', 409);
    if (m.includes('abaixo_do_minimo')) return erro(`O valor mínimo para sacar é R$ ${VALOR_MINIMO_SAQUE},00.`, 400);
    console.error('Saque falhou:', m);
    return erro('Não consegui registrar o pedido. Confira se o SQL 18 foi rodado.', 502);
  }
  await avisarAdmins(c.admin, {
    titulo: `Saque de ${brl(v.valor)}`,
    corpo: `${c.nome} (${c.tipo === 'loja' ? 'loja' : 'entregador'}) pediu um saque por Pix.`,
    url: '/admin?aba=saques',
    tag: `saque-${id}`,
    urgente: true,
  });
  return Response.json({ ok: true, id });
}
