import { contaDaRequisicao } from '../../../../lib/conta-servidor';
import { erro } from '../../../../lib/entrega-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Histórico da conta: os pedidos feitos logado, em qualquer aparelho.
export async function GET(request) {
  const r = await contaDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const { data, error } = await r.admin
    .from('dl_pedidos')
    .select('token,criado_em,dl_lojas(nome)')
    .eq('cliente_user_id', r.user.id)
    .order('criado_em', { ascending: false })
    .limit(30);
  if (error) return erro('Não consegui carregar seus pedidos agora.', 502);
  return Response.json({ pedidos: data.map((p) => ({ token: p.token, loja: p.dl_lojas?.nome || 'Pedido', em: new Date(p.criado_em).getTime() })) }, { headers: { 'Cache-Control': 'no-store' } });
}
