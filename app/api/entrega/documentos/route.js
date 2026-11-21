import { erro, entregadorDaRequisicao } from '../../../../lib/entrega-servidor';
import { TIPOS_DOC, MAX_BYTES_DOC, ehJpeg, precisaDeDocumentos, tiposExigidos } from '../../../../lib/documentos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Situação dos documentos do próprio entregador (nunca devolve as imagens).
export async function GET(request) {
  const c = await entregadorDaRequisicao(request);
  if (c.resposta) return c.resposta;
  const { admin, ent } = c;
  const { data } = await admin.from('dl_documentos').select('tipo').eq('entregador_id', ent.id);
  return Response.json(
    {
      exigidos: tiposExigidos(ent.veiculo),
      enviados: (data || []).map((d) => d.tipo),
      status: ent.docs_status,
      motivo: ent.docs_status === 'reprovado' ? ent.docs_motivo : null,
      obrigatorio: precisaDeDocumentos(ent),
      dados: { cnh_nome: ent.cnh_nome, cnh_validade: ent.cnh_validade, cnh_categoria: ent.cnh_categoria, placa: ent.placa, endereco: ent.endereco },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

// Recebe UMA foto (cnh, crlv ou selfie) e guarda no bucket privado.
export async function POST(request) {
  const c = await entregadorDaRequisicao(request);
  if (c.resposta) return c.resposta;
  const { admin, ent } = c;
  if (!precisaDeDocumentos(ent)) return erro('Entregadores de loja não precisam enviar documentos.', 400);
  if (ent.docs_status === 'aprovado') return erro('Seus documentos já foram aprovados.', 409);
  if (ent.docs_status === 'em_analise') return erro('Seus documentos estão em análise. Aguarde o resultado.', 409);

  let form;
  try { form = await request.formData(); } catch { return erro('Envio inválido.', 400); }
  const tipo = String(form.get('tipo') || '');
  const arquivo = form.get('arquivo');
  if (!TIPOS_DOC.includes(tipo) || !tiposExigidos(ent.veiculo).includes(tipo)) return erro('Documento não pedido para o seu veículo.', 400);
  if (!arquivo || typeof arquivo.arrayBuffer !== 'function') return erro('Envie a foto.', 400);
  if (arquivo.size > MAX_BYTES_DOC) return erro('A foto ficou grande demais. Tire outra.', 413);
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  if (!ehJpeg(bytes)) return erro('Envie uma foto (JPEG).', 400);

  const caminho = `${ent.id}/${tipo}.jpg`;
  const { error: e1 } = await admin.storage.from('dl-documentos').upload(caminho, bytes, { contentType: 'image/jpeg', upsert: true });
  if (e1) return erro('Não consegui guardar a foto. Tente de novo.', 502);
  const { error: e2 } = await admin.from('dl_documentos').upsert({ entregador_id: ent.id, tipo, caminho, criado_em: new Date().toISOString() }, { onConflict: 'entregador_id,tipo' });
  if (e2) return erro('Não consegui guardar a foto. Tente de novo.', 502);
  return Response.json({ ok: true });
}
