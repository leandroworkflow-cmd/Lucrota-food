import { clienteServico, usuarioDaRequisicao } from '../../../../lib/servidor';
import { uuidValido } from '../../../../lib/entrega-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Link (válido por 5 minutos) da foto que o entregador tirou ao coletar o pedido. Só o dono da loja do pedido.
export async function GET(request) {
  const r = await usuarioDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const admin = clienteServico();
  if (!admin) return Response.json({ error: 'Serviço ainda não configurado no servidor.' }, { status: 503 });
  const id = new URL(request.url).searchParams.get('pedido_id');
  if (!uuidValido(id)) return Response.json({ error: 'Pedido inválido.' }, { status: 400 });
  const { data: p } = await admin.from('dl_pedidos').select('foto_coleta,dl_lojas(dono_id)').eq('id', id).maybeSingle();
  if (!p || p.dl_lojas?.dono_id !== r.user.id) return Response.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  if (!p.foto_coleta) return Response.json({ error: 'Esse pedido não tem foto da coleta.' }, { status: 404 });
  const { data } = await admin.storage.from('dl-documentos').createSignedUrl(p.foto_coleta, 300);
  if (!data?.signedUrl) return Response.json({ error: 'Não consegui abrir a foto agora.' }, { status: 502 });
  return Response.json({ url: data.signedUrl }, { headers: { 'Cache-Control': 'no-store' } });
}
