'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Marca from '../../components/Marca';
import { csvRepasses, planoRepasse } from '../../lib/admin';
import { api } from '../../lib/api-cliente';
import { entrarComGoogle, sair, useSession } from '../../lib/auth';
import { brl } from '../../lib/format';

const ABAS = [
  ['repasses', 'Repasses'],
  ['lojas', 'Lojas'],
  ['entregadores', 'Entregadores'],
  ['historico', 'Histórico'],
];
const dataHora = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const VEICULO = { moto: 'Moto', bicicleta: 'Bicicleta', carro: 'Carro', a_pe: 'A pé' };

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

export default function Admin() {
  const auth = useSession();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [aba, setAba] = useState('repasses');
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setDados(await api('/api/admin/resumo'));
      setErro('');
    } catch (e) {
      setErro(e.message);
    }
  }, []);

  useEffect(() => {
    if (auth.status === 'in') carregar();
  }, [auth.status, carregar]);

  async function acao(corpo, ok) {
    setOcupado(true);
    setAviso('');
    try {
      await api('/api/admin/acao', { metodo: 'POST', corpo });
      await carregar();
      if (ok) setAviso(ok);
      return true;
    } catch (e) {
      setErro(e.message);
      await carregar();
      return false;
    } finally {
      setOcupado(false);
    }
  }

  const contas = useMemo(() => {
    if (!dados) return [];
    return [
      ...dados.lojas.map((l) => ({ conta: 'loja', id: l.id, nome: l.nome, chave_pix: l.chave_pix, saldo: l.saldo })),
      ...dados.entregadores.map((e) => ({ conta: 'entregador', id: e.id, nome: e.nome, chave_pix: e.chave_pix, saldo: e.saldo })),
    ];
  }, [dados]);
  const plano = useMemo(() => planoRepasse(contas), [contas]);
  const pendentes = dados ? dados.lojas.filter((l) => !l.ativa).length + dados.entregadores.filter((e) => !e.loja_id && !e.aprovado).length : 0;

  const cabecalho = (
    <header className="topo">
      <div className="pagina pagina-larga topo-in">
        <Marca />
        {auth.status === 'in' && (
          <button type="button" className="topo-link" style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontWeight: 600 }} onClick={sair}>
            Sair
          </button>
        )}
      </div>
    </header>
  );

  if (auth.status === 'loading' || auth.status === 'off' || auth.status === 'out') {
    return (
      <>
        {cabecalho}
        <main className="pagina" style={{ paddingTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 30 }}>Administração</h1>
          {auth.status === 'loading' && <p className="muted">Carregando…</p>}
          {auth.status === 'off' && <div className="aviso aviso-erro">O login ainda não foi configurado neste site.</div>}
          {auth.status === 'out' && (
            <div>
              <button type="button" className="btn btn-primario" onClick={() => entrarComGoogle('/admin')}>
                Entrar com Google
              </button>
            </div>
          )}
        </main>
      </>
    );
  }

  async function marcar(c, rotulo) {
    const sinal = c.saldo > 0 ? 'repasse de' : 'recebimento de';
    if (!window.confirm(`Confirma que o ${sinal} ${brl(Math.abs(c.saldo))} (${c.nome}) já foi feito por Pix?\n\nIsso zera a conta dessa pessoa.`)) return;
    await acao({ acao: 'acertar', tipo: c.conta, id: c.id, valor: c.saldo }, rotulo || `Conta de ${c.nome} acertada.`);
  }

  async function marcarTodos() {
    const n = plano.pagar.length;
    if (!n || !window.confirm(`Confirma que os ${n} repasses (${brl(plano.totalPagar)}) já foram pagos por Pix?\n\nIsso zera a conta de cada um.`)) return;
    let feitos = 0;
    for (const c of plano.pagar) {
      // eslint-disable-next-line no-await-in-loop
      if (await acao({ acao: 'acertar', tipo: c.conta, id: c.id, valor: c.saldo })) feitos += 1;
      else break;
    }
    setAviso(`${feitos} de ${n} repasses marcados como pagos.`);
  }

  function baixarCsv() {
    const url = URL.createObjectURL(new Blob([csvRepasses(plano.pagar)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `repasses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const semAcesso = erro && !dados;

  return (
    <>
      {cabecalho}
      <main className="pagina pagina-larga" style={{ paddingTop: 24, paddingBottom: 48, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h1 style={{ fontSize: 28 }}>Administração</h1>
        {erro && (
          <div className="aviso aviso-erro" role="alert">
            {erro}
          </div>
        )}
        {aviso && (
          <div className="aviso" role="status">
            {aviso}
          </div>
        )}
        {semAcesso && <p className="muted">Se a conta é a certa, confira a variável ADMIN_EMAILS no Vercel.</p>}

        {dados && (
          <>
            <div className="opcoes" role="tablist" aria-label="Seções">
              {ABAS.map(([id, rotulo]) => (
                <button key={id} type="button" role="tab" className="opcao" aria-pressed={aba === id} aria-selected={aba === id} onClick={() => setAba(id)}>
                  {rotulo}
                  {id === 'lojas' && dados.lojas.some((l) => !l.ativa) ? ` (${dados.lojas.filter((l) => !l.ativa).length} novas)` : ''}
                  {id === 'entregadores' && dados.entregadores.some((e) => !e.loja_id && !e.aprovado) ? ` (${dados.entregadores.filter((e) => !e.loja_id && !e.aprovado).length} novos)` : ''}
                </button>
              ))}
            </div>

            {dados.travadas?.length > 0 && (
              <section className="cartao" role="alert">
                <h2>Entregas travadas pelo código ({dados.travadas.length})</h2>
                <p className="muted" style={{ margin: 0 }}>O entregador errou o código 5 vezes. Fale com o cliente pelo WhatsApp: se ele confirmar que recebeu, conclua a entrega; se não, libere novas tentativas.</p>
                {dados.travadas.map((t) => (
                  <div key={t.id} className="linha-sacola">
                    <div>
                      <strong>Pedido {t.numero}</strong> · {t.loja}
                      <div className="muted" style={{ fontSize: 14 }}>
                        Cliente {t.cliente} · entregador {t.entregador || '—'} ·{' '}
                        <a href={`https://wa.me/${String(t.telefone).replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp do cliente</a>
                      </div>
                    </div>
                    <div className="opcoes">
                      <button type="button" className="btn btn-pequeno" disabled={ocupado} onClick={() => acao({ acao: 'liberar_codigo', pedido_id: t.id }, `Pedido ${t.numero}: novas tentativas liberadas.`)}>Liberar tentativas</button>
                      <button type="button" className="btn btn-pequeno btn-primario" disabled={ocupado} onClick={() => window.confirm(`Confirma que o cliente recebeu o pedido ${t.numero}? Isso conclui a entrega.`) && acao({ acao: 'entrega_manual', pedido_id: t.id }, `Pedido ${t.numero} concluído.`)}>Concluir entrega</button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {aba === 'repasses' && (
              <>
                <section className="cartao">
                  <h2>Resumo da semana</h2>
                  <p style={{ margin: 0 }}>
                    A repassar: <strong style={{ color: 'var(--verde)' }}>{brl(plano.totalPagar)}</strong> para {plano.pagar.length}{' '}
                    {plano.pagar.length === 1 ? 'conta' : 'contas'}. A cobrar: <strong style={{ color: '#b3261e' }}>{brl(plano.totalCobrar)}</strong> de {plano.cobrar.length}.
                  </p>
                  <p className="muted" style={{ margin: 0 }}>
                    Faça os Pix no app do seu banco e depois marque como pago aqui. Saldos abaixo de R$ 1,00 ficam acumulando para a próxima semana.
                    {pendentes > 0 && ` Há ${pendentes} cadastro(s) esperando aprovação.`}
                  </p>
                </section>

                <section className="cartao">
                  <h2>A repassar</h2>
                  {plano.pagar.length === 0 ? (
                    <p className="muted" style={{ margin: 0 }}>Nenhum repasse pendente.</p>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-pequeno" onClick={baixarCsv}>Baixar planilha (CSV)</button>
                        <button type="button" className="btn btn-pequeno" disabled={ocupado} onClick={marcarTodos}>Marcar todos como pagos</button>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table className="tabela-simples">
                          <thead>
                            <tr><th>Quem</th><th>Chave Pix</th><th className="d">Valor</th><th /></tr>
                          </thead>
                          <tbody>
                            {plano.pagar.map((c) => (
                              <tr key={`${c.conta}${c.id}`}>
                                <td>{c.nome}<div className="muted" style={{ fontSize: 13 }}>{c.conta === 'loja' ? 'Loja' : 'Entregador'}</div></td>
                                <td>
                                  {c.chave_pix ? (
                                    <button type="button" className="btn btn-pequeno" onClick={async () => setAviso((await copiar(c.chave_pix)) ? `Chave de ${c.nome} copiada.` : 'Não consegui copiar.')} title="Copiar chave Pix">
                                      {c.chave_pix.length > 24 ? `${c.chave_pix.slice(0, 22)}…` : c.chave_pix}
                                    </button>
                                  ) : (
                                    <span className="muted">Sem chave Pix</span>
                                  )}
                                </td>
                                <td className="d"><strong>{brl(c.saldo)}</strong></td>
                                <td><button type="button" className="btn btn-pequeno" disabled={ocupado} onClick={() => marcar(c)}>Marcar como pago</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </section>

                <section className="cartao">
                  <h2>A cobrar</h2>
                  <p className="muted" style={{ margin: 0 }}>Quem recebeu dinheiro na mão e deve a parte da plataforma. Peça um Pix e marque como recebido.</p>
                  {plano.cobrar.length === 0 ? (
                    <p className="muted" style={{ margin: 0 }}>Ninguém deve nada agora.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="tabela-simples">
                        <thead>
                          <tr><th>Quem</th><th>Telefone</th><th className="d">Deve</th><th /></tr>
                        </thead>
                        <tbody>
                          {plano.cobrar.map((c) => {
                            const fone = c.conta === 'loja' ? dados.lojas.find((l) => l.id === c.id)?.whatsapp : dados.entregadores.find((e) => e.id === c.id)?.telefone;
                            return (
                              <tr key={`${c.conta}${c.id}`}>
                                <td>{c.nome}<div className="muted" style={{ fontSize: 13 }}>{c.conta === 'loja' ? 'Loja' : 'Entregador'}</div></td>
                                <td>{fone ? <a href={`https://wa.me/${String(fone).replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a> : <span className="muted">—</span>}</td>
                                <td className="d"><strong style={{ color: '#b3261e' }}>{brl(-c.saldo)}</strong></td>
                                <td><button type="button" className="btn btn-pequeno" disabled={ocupado} onClick={() => marcar(c)}>Marcar como recebido</button></td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="cartao">
                  <h2>Parte da plataforma na entrega</h2>
                  <ConfigEntrega valor={dados.config.comissao_entrega_pct ?? 0} ocupado={ocupado} salvar={(v) => acao({ acao: 'config_entrega', comissao_entrega_pct: v }, 'Salvo. Vale para as próximas entregas.')} />
                </section>
              </>
            )}

            {aba === 'lojas' && (
              <section className="cartao">
                <h2>Lojas</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table className="tabela-simples">
                    <thead>
                      <tr><th>Loja</th><th>Comissão</th><th className="d">Saldo</th><th>Situação</th></tr>
                    </thead>
                    <tbody>
                      {dados.lojas.map((l) => (
                        <tr key={l.id}>
                          <td>{l.nome}<div className="muted" style={{ fontSize: 13 }}>{l.cidade || ''} {l.whatsapp ? `· ${l.whatsapp}` : ''}</div></td>
                          <td><CampoPct valor={l.comissao_pct} ocupado={ocupado} salvar={(v) => acao({ acao: 'loja_comissao', id: l.id, comissao_pct: v }, `Comissão de ${l.nome} salva.`)} /></td>
                          <td className="d">{brl(l.saldo)}</td>
                          <td>
                            <button type="button" className={l.ativa ? 'btn btn-pequeno' : 'btn btn-pequeno btn-amarelo'} disabled={ocupado} onClick={() => acao({ acao: 'loja_ativa', id: l.id, ativa: !l.ativa }, l.ativa ? `${l.nome} foi desativada.` : `${l.nome} foi aprovada.`)}>
                              {l.ativa ? 'Ativa (desativar)' : 'Aprovar'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {dados.lojas.length === 0 && <p className="muted" style={{ margin: 0 }}>Nenhuma loja cadastrada ainda.</p>}
              </section>
            )}

            {aba === 'entregadores' && (
              <section className="cartao">
                <h2>Entregadores</h2>
                <p className="muted" style={{ margin: 0 }}>Entregadores de uma loja (cadastrados com o código dela) não precisam de aprovação.</p>
                <div style={{ overflowX: 'auto' }}>
                  <table className="tabela-simples">
                    <thead>
                      <tr><th>Nome</th><th>Tipo</th><th className="d">Saldo</th><th>Situação</th></tr>
                    </thead>
                    <tbody>
                      {dados.entregadores.map((e) => {
                        const loja = e.loja_id ? dados.lojas.find((l) => l.id === e.loja_id) : null;
                        return (
                          <tr key={e.id}>
                            <td>{e.nome}<div className="muted" style={{ fontSize: 13 }}>{VEICULO[e.veiculo] || e.veiculo} · {e.telefone}</div></td>
                            <td>{loja ? `Da loja ${loja.nome}` : 'Da plataforma'}</td>
                            <td className="d">{brl(e.saldo)}</td>
                            <td>
                              {loja ? (
                                <span className="muted">Sem aprovação</span>
                              ) : (
                                <button type="button" className={e.aprovado ? 'btn btn-pequeno' : 'btn btn-pequeno btn-amarelo'} disabled={ocupado} onClick={() => acao({ acao: 'entregador_aprovado', id: e.id, aprovado: !e.aprovado }, e.aprovado ? `${e.nome} foi bloqueado.` : `${e.nome} foi aprovado.`)}>
                                  {e.aprovado ? 'Aprovado (bloquear)' : 'Aprovar'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {dados.entregadores.length === 0 && <p className="muted" style={{ margin: 0 }}>Nenhum entregador cadastrado ainda.</p>}
              </section>
            )}

            {aba === 'historico' && (
              <section className="cartao">
                <h2>Acertos feitos</h2>
                {dados.acertos.length === 0 ? (
                  <p className="muted" style={{ margin: 0 }}>Nenhum acerto registrado ainda.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="tabela-simples">
                      <thead>
                        <tr><th>Data</th><th>Quem</th><th>O que foi</th><th className="d">Valor</th></tr>
                      </thead>
                      <tbody>
                        {dados.acertos.map((a) => (
                          <tr key={a.id}>
                            <td>{dataHora(a.criado_em)}</td>
                            <td>{a.nome}</td>
                            <td>{a.descricao}</td>
                            <td className="d">{brl(Math.abs(a.valor))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}

function CampoPct({ valor, salvar, ocupado }) {
  const [v, setV] = useState(String(valor));
  useEffect(() => setV(String(valor)), [valor]);
  const mudou = Number(String(v).replace(',', '.')) !== Number(valor);
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <input className="input" style={{ width: 70, padding: '6px 8px' }} inputMode="decimal" aria-label="Comissão em porcentagem" value={v} onChange={(e) => setV(e.target.value)} />%
      {mudou && (
        <button type="button" className="btn btn-pequeno" disabled={ocupado} onClick={() => salvar(Number(String(v).replace(',', '.')))}>
          Salvar
        </button>
      )}
    </span>
  );
}

function ConfigEntrega({ valor, salvar, ocupado }) {
  return (
    <>
      <p className="muted" style={{ margin: 0 }}>Quanto da taxa de entrega a plataforma retém do entregador do app (0 = a plataforma não retém nada).</p>
      <CampoPct valor={valor} salvar={salvar} ocupado={ocupado} />
    </>
  );
}
