import { clienteServico, usuarioDaRequisicao } from './servidor';

export const erro = (error, status) => Response.json({ error }, { status });

// Identifica o entregador que chama a API. Devolve { admin, user, ent } ou { resposta }.
export async function entregadorDaRequisicao(request, { exigir = true } = {}) {
  const r = await usuarioDaRequisicao(request);
  if (r.resposta) return { resposta: r.resposta };
  const admin = clienteServico();
  if (!admin) return { resposta: erro('Serviço de entregas ainda não configurado.', 503) };
  const { data: ent, error } = await admin.from('dl_entregadores').select('*').eq('user_id', r.user.id).maybeSingle();
  if (error) return { resposta: erro('Não consegui consultar agora.', 502) };
  if (!ent && exigir) return { resposta: Response.json({ error: 'Cadastre-se como entregador.', cadastrar: true }, { status: 404 }) };
  return { admin, user: r.user, ent };
}

export async function lerJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const uuidValido = (v) => typeof v === 'string' && UUID.test(v);
