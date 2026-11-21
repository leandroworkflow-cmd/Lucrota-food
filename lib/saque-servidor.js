import { clienteServico, usuarioDaRequisicao } from './servidor';

const erroJson = (error, status) => Response.json({ error }, { status });

// Quem está pedindo e de qual conta (loja do dono, ou entregador).
export async function contaDoUsuario(request, tipo) {
  if (!['loja', 'entregador'].includes(tipo)) return { resposta: erroJson('Conta inválida.', 400) };
  const r = await usuarioDaRequisicao(request);
  if (r.resposta) return r;
  const admin = clienteServico();
  if (!admin) return { resposta: erroJson('Servidor sem configuração.', 503) };
  const q =
    tipo === 'loja'
      ? admin.from('dl_lojas').select('id,nome,chave_pix').eq('dono_id', r.user.id)
      : admin.from('dl_entregadores').select('id,nome,chave_pix').eq('user_id', r.user.id);
  const { data } = await q.maybeSingle();
  if (!data) return { resposta: erroJson('Conta não encontrada.', 404) };
  return { admin, tipo, id: data.id, nome: data.nome, chave_pix: data.chave_pix };
}

const soma = (linhas) => (linhas || []).reduce((t, l) => t + Number(l.valor), 0);

export async function saldoDaConta(admin, tipo, id) {
  const col = tipo === 'loja' ? 'loja_id' : 'entregador_id';
  const [lanc, pend] = await Promise.all([
    admin.from('dl_lancamentos').select('valor').eq(col, id).limit(20000),
    admin.from('dl_saques').select('valor').eq(col, id).eq('status', 'pendente'),
  ]);
  return { saldo: Math.round(soma(lanc.data) * 100) / 100, pendente: Math.round(soma(pend.data) * 100) / 100 };
}
