import { clienteServico, usuarioDaRequisicao } from '../../../../lib/servidor';

export const runtime = 'nodejs';

const erro = (error, status) => Response.json({ error }, { status });

export async function POST(request) {
  const r = await usuarioDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const admin = clienteServico();
  if (!admin) return erro('Avisos ainda não configurados no servidor.', 503);

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
  const { error } = await admin
    .from('dl_push_inscricoes')
    .upsert(
      { user_id: r.user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      { onConflict: 'endpoint' }
    );
  if (error) return erro('Não consegui ativar os avisos agora.', 502);
  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const r = await usuarioDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const admin = clienteServico();
  if (!admin) return erro('Avisos ainda não configurados no servidor.', 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return erro('Requisição inválida.', 400);
  }
  if (typeof body?.endpoint !== 'string') return erro('Inscrição inválida.', 400);
  await admin.from('dl_push_inscricoes').delete().eq('endpoint', body.endpoint).eq('user_id', r.user.id);
  return Response.json({ ok: true });
}
