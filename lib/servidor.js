import { createClient } from '@supabase/supabase-js';

// Cliente com a chave service_role (ignora a segurança por linha). SÓ no servidor.
export function clienteServico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) return null;
  return createClient(url, service, { auth: { persistSession: false } });
}

const resposta = (error, status) => Response.json({ error }, { status });

// Descobre quem chama a API (token do Supabase no cabeçalho Authorization).
export async function usuarioDaRequisicao(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { resposta: resposta('Login ainda não configurado no servidor.', 503) };
  const auth = request.headers.get('authorization') || '';
  const jwt = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!jwt) return { resposta: resposta('Entre na sua conta para continuar.', 401) };
  const sb = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(jwt);
  if (error || !data?.user) return { resposta: resposta('Sessão inválida. Entre de novo.', 401) };
  return { user: data.user };
}
