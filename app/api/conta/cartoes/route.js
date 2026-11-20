import { clienteMPDoPerfil, contaDaRequisicao, perfilDoCliente } from '../../../../lib/conta-servidor';
import { listarCartoes, mpConfigurado, removerCartaoMP, salvarCartaoMP } from '../../../../lib/mp-servidor';
import { erro, lerJson } from '../../../../lib/entrega-servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Salva um cartão na conta (o navegador manda só o token do Mercado Pago, nunca o número).
export async function POST(request) {
  const r = await contaDaRequisicao(request);
  if (r.resposta) return r.resposta;
  if (!mpConfigurado()) return erro('Cartões salvos não estão disponíveis agora.', 503);
  const b = await lerJson(request);
  if (!/^[A-Za-z0-9]{16,64}$/.test(String(b?.token || ''))) return erro('Não consegui ler os dados do cartão. Digite de novo.', 400);
  const perfil = await perfilDoCliente(r.admin, r.user);
  const clienteId = await clienteMPDoPerfil(r.admin, r.user, perfil);
  if (!clienteId) return erro('Não consegui preparar sua conta de pagamento. Tente de novo.', 502);
  const cartao = await salvarCartaoMP(clienteId, b.token);
  if (!cartao) return erro('O cartão não foi aceito. Confira os dados ou tente outro.', 400);
  return Response.json({ ok: true, cartao });
}

export async function DELETE(request) {
  const r = await contaDaRequisicao(request);
  if (r.resposta) return r.resposta;
  const b = await lerJson(request);
  const id = String(b?.id ?? '');
  if (!/^\d{1,20}$/.test(id)) return erro('Cartão inválido.', 400);
  const perfil = await perfilDoCliente(r.admin, r.user);
  if (!perfil?.mp_customer_id) return erro('Cartão não encontrado.', 404);
  // Só remove se o cartão é mesmo desta conta.
  const lista = await listarCartoes(perfil.mp_customer_id);
  if (!lista || !lista.some((c) => c.id === id)) return erro('Cartão não encontrado.', 404);
  if (!(await removerCartaoMP(perfil.mp_customer_id, id))) return erro('Não consegui remover agora. Tente de novo.', 502);
  return Response.json({ ok: true });
}
