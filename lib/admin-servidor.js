import { ehAdmin, listaAdmins } from './admin';
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

// Ids das contas de administrador (para mandar avisos no celular). Nunca lança erro.
export async function idsDosAdmins(admin) {
  try {
    const lista = listaAdmins(process.env.ADMIN_EMAILS);
    if (!lista.size) return [];
    const ids = [];
    for (let pagina = 1; pagina <= 5; pagina++) {
      const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });
      if (error) break;
      for (const u of data.users) if (u.email && lista.has(u.email.toLowerCase())) ids.push(u.id);
      if (data.users.length < 200) break;
    }
    return ids;
  } catch {
    return [];
  }
}

// Avisa os administradores no celular. Nunca lança erro: aviso que falha não pode derrubar o cadastro.
export async function avisarAdmins(admin, payload) {
  try {
    const { avisarUsuarios } = await import('./avisos-servidor');
    await avisarUsuarios(admin, await idsDosAdmins(admin), { url: '/admin', ...payload });
  } catch (e) {
    console.error('Aviso ao admin falhou:', e?.message || e);
  }
}
