import { erro, entregadorDaRequisicao, lerJson } from '../../../../lib/entrega-servidor';
import { validarCadastroEntregador } from '../../../../lib/entrega';
import { avisarAdmins } from '../../../../lib/admin-servidor';
import { normalizarTelefone } from '../../../../lib/format';
import { validarDadosDocs, validarEndereco } from '../../../../lib/documentos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Todo entregador se cadastra com nome, CPF, endereço e (moto/carro) dados da CNH e da placa.
// Depois envia as fotos/PDFs em Documentos e só recebe corridas quando a equipe aprovar.
export async function POST(request) {
  const c = await entregadorDaRequisicao(request, { exigir: false });
  if (c.resposta) return c.resposta;
  if (c.ent) return erro('Você já tem cadastro de entregador.', 409);
  const body = await lerJson(request);
  const v = validarCadastroEntregador(body, normalizarTelefone);
  if (v.erro) return erro(v.erro, 400);
  const end = validarEndereco(body.endereco);
  if (end.erro) return erro(end.erro, 400);
  const d = validarDadosDocs(body, v.dados.veiculo, Date.now(), false);
  if (d.erro) return erro(d.erro, 400);

  const { error } = await c.admin
    .from('dl_entregadores')
    .insert({ user_id: c.user.id, ...v.dados, endereco: end.endereco, ...d.dados, loja_id: null, aprovado: false });
  if (error) return erro('Não consegui concluir o cadastro. Tente de novo.', 502);
  await avisarAdmins(c.admin, { titulo: 'Entregador novo', corpo: `${v.dados.nome} se cadastrou e vai enviar os documentos.` });
  return Response.json({ ok: true });
}
