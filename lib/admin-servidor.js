import { ehAdmin } from './admin';
import { clienteServico, usuarioDaRequisicao } from './servidor';

const erro = (error, status) => Response.json({ error }, { status });

// Só passa quem está logado e tem o e-mail na lista ADMIN_EMAILS (Vercel). Devolve { admin, user } ou { resposta }.
export async function adminDaRequisicao(request) {
  if (!process.env.ADMIN_EMAILS) return { resposta: erro('Defina ADMIN_EMAILS no Vercel com o seu e-mail e faça Redeploy.', 503) };
  const r = await usuarioDaRequisicao(request);
  if (r.resposta) return { resposta: r.resposta };
  if (!ehAdmin(r.user, process.env.ADMIN_EMAILS)) return { resposta: erro('Esta conta não é de administrador.', 403) };
  const admin = clienteServico();
  if (!admin) return { resposta: erro('O servidor ainda não tem a chave SUPABASE_SERVICE_ROLE_KEY.', 503) };
  return { admin, user: r.user };
}
