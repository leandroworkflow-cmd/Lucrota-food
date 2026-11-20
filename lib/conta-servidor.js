import { criarClienteMP } from './mp-servidor';
import { mpConfigurado } from './mp-servidor';
import { clienteServico, usuarioDaRequisicao } from './servidor';

const erro = (error, status) => Response.json({ error }, { status });

export async function contaDaRequisicao(request) {
  const r = await usuarioDaRequisicao(request);
  if (r.resposta) return { resposta: r.resposta };
  const admin = clienteServico();
  if (!admin) return { resposta: erro('Serviço indisponível.', 503) };
  return { admin, user: r.user };
}

// Perfil do cliente (cria na primeira vez). Não cria o cliente no Mercado Pago: isso só acontece ao salvar um cartão.
export async function perfilDoCliente(admin, user) {
  const { data } = await admin.from('dl_clientes').select('*').eq('user_id', user.id).maybeSingle();
  if (data) return data;
  const nome = String(user.user_metadata?.full_name || user.user_metadata?.name || '').slice(0, 60) || null;
  const { data: novo } = await admin.from('dl_clientes').upsert({ user_id: user.id, nome }, { onConflict: 'user_id' }).select('*').single();
  return novo;
}

// Garante o cliente no Mercado Pago (necessário para cartões salvos). Devolve o código ou null.
export async function clienteMPDoPerfil(admin, user, perfil) {
  if (perfil?.mp_customer_id) return perfil.mp_customer_id;
  if (!mpConfigurado() || !user.email) return null;
  const id = await criarClienteMP({ email: user.email.toLowerCase(), nome: perfil?.nome });
  if (!id) return null;
  await admin.from('dl_clientes').update({ mp_customer_id: id }).eq('user_id', user.id);
  return id;
}

export { erro };
