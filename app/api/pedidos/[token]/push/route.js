import { clienteServico } from '../../../../../lib/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const erro = (error, status) => Response.json({ error }, { status });

// O cliente (sem conta) ativa avisos de UM pedido. O token do pedido, impossível de adivinhar, é a credencial.
export async function POST(request, { params }) {
  const { token } = await params;
  if (!UUID.test(token)) return erro('Pedido não encontrado.', 404);
  const admin = clienteServico();
  if (!admin) return erro('Avisos ainda não configurados.', 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return erro('Requisição inválida.', 400);
  }
  const sub = body?.subscription;
  if (
    typeof sub?.endpoint !== 'string' ||
    !sub.endpoint.startsWith('https://') ||
    sub.endpoint.length > 1000 ||
    typeof sub?.keys?.p256dh !== 'string' ||
    typeof sub?.keys?.auth !== 'string'
  ) {
    return erro('Inscrição inválida.', 400);
  }

  const { data: pedido } = await admin.from('dl_pedidos').select('id,status').eq('token', token).maybeSingle();
  if (!pedido) return erro('Pedido não encontrado.', 404);
  if (['entregue', 'cancelado'].includes(pedido.status)) return erro('Este pedido já foi finalizado.', 409);

  const { count } = await admin.from('dl_push_clientes').select('id', { count: 'exact', head: true }).eq('pedido_id', pedido.id);
  if ((count || 0) >= 5) return erro('Já há aparelhos demais com avisos neste pedido.', 429);

  const { error } = await admin
    .from('dl_push_clientes')
    .upsert({ pedido_id: pedido.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, { onConflict: 'endpoint' });
  if (error) return erro('Não consegui ativar os avisos agora.', 502);
  return Response.json({ ok: true });
}
