import { erro, entregadorDaRequisicao, uuidValido } from '../../../../lib/entrega-servidor';
import { ehJpeg, MAX_BYTES_DOC } from '../../../../lib/documentos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Foto do pedido no momento da coleta na loja. Fica no armazenamento privado; só a loja do pedido e a equipe veem.
export async function POST(request) {
  const c = await entregadorDaRequisicao(request);
  if (c.resposta) return c.resposta;
  const { admin, ent } = c;
  let form;
  try { form = await request.formData(); } catch { return erro('Envio inválido.', 400); }
  const pedidoId = String(form.get('pedido_id') || '');
  const arquivo = form.get('arquivo');
  if (!uuidValido(pedidoId)) return erro('Pedido inválido.', 400);
  if (!arquivo || typeof arquivo.arrayBuffer !== 'function') return erro('Tire a foto do pedido.', 400);
  if (arquivo.size > MAX_BYTES_DOC) return erro('A foto ficou grande demais. Tire outra.', 413);

  const { data: pedido } = await admin.from('dl_pedidos').select('id,status,entregador_id').eq('id', pedidoId).maybeSingle();
  if (!pedido || pedido.entregador_id !== ent.id) return erro('Esta entrega não é sua.', 403);
  if (!['aceito', 'preparo'].includes(pedido.status)) return erro('Este pedido não está mais aguardando retirada.', 409);

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  if (!ehJpeg(bytes)) return erro('Envie uma foto (JPEG).', 400);
  const caminho = `coletas/${pedido.id}.jpg`;
  const { error: e1 } = await admin.storage.from('dl-documentos').upload(caminho, bytes, { contentType: 'image/jpeg', upsert: true });
  if (e1) return erro('Não consegui guardar a foto. Tente de novo.', 502);
  const { error: e2 } = await admin
    .from('dl_pedidos')
    .update({ foto_coleta: caminho, foto_coleta_em: new Date().toISOString() })
    .eq('id', pedido.id)
    .eq('entregador_id', ent.id);
  if (e2) return erro('Não consegui registrar a foto. Tente de novo.', 502);
  return Response.json({ ok: true });
}
