'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api-cliente';
import { brl } from '../lib/format';

const dia = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);

function Numero({ rotulo, valor, detalhe, destaque }) {
  return (
    <div className="ent-bloco" style={{ background: destaque ? 'var(--azul)' : '#fff', color: destaque ? '#fff' : 'var(--tinta)', border: '1px solid var(--linha)', borderRadius: 14, padding: 14, display: 'grid', gap: 2 }}>
      <span style={{ fontSize: 13, opacity: 0.8 }}>{rotulo}</span>
      <strong style={{ fontSize: 26, lineHeight: 1.1 }}>{valor}</strong>
      {detalhe && <span style={{ fontSize: 13, opacity: 0.8 }}>{detalhe}</span>}
    </div>
  );
}

function Grade({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>{children}</div>;
}

// Barras dos últimos 30 dias: altura = faturamento do dia.
function Grafico({ dias }) {
  const max = Math.max(1, ...dias.map((d) => d.faturamento));
  return (
    <div role="img" aria-label="Faturamento por dia nos últimos 30 dias" style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140 }}>
      {dias.map((d) => (
        <div key={d.dia} title={`${dia(d.dia)}: ${brl(d.faturamento)} · ${d.entregues} entregues · ${d.cancelados} cancelados`} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
          <div style={{ height: `${Math.max(d.faturamento ? 4 : 1, (d.faturamento / max) * 100)}%`, background: d.faturamento ? 'var(--azul)' : 'var(--linha)', borderRadius: '3px 3px 0 0' }} />
        </div>
      ))}
    </div>
  );
}

export default function PainelNumeros({ aoAbrir }) {
  const [d, setD] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let vivo = true;
    const ler = () => api('/api/admin/painel').then((r) => vivo && (setD(r), setErro(''))).catch((e) => vivo && setErro(e.message));
    ler();
    const id = setInterval(() => document.visibilityState === 'visible' && ler(), 30000);
    return () => { vivo = false; clearInterval(id); };
  }, []);

  if (erro) return <div className="aviso aviso-erro">{erro}</div>;
  if (!d) return <p className="muted">Carregando os números…</p>;
  const { hoje, mes, rede, andamento } = d;
  const pendencias = rede.lojas_pendentes + rede.entregadores_analise;
  const agora = Object.values(andamento).reduce((t, n) => t + n, 0);
  const taxaCancel = mes.recebidos ? Math.round((mes.cancelados / mes.recebidos) * 100) : 0;
  const totalPag = Object.values(d.pagamento).reduce((t, n) => t + n, 0);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {pendencias > 0 && (
        <div className="aviso" role="status" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <span>
            <b>{pendencias} cadastro{pendencias > 1 ? 's' : ''} esperando você</b>
            {rede.lojas_pendentes > 0 && ` · ${rede.lojas_pendentes} loja${rede.lojas_pendentes > 1 ? 's' : ''}`}
            {rede.entregadores_analise > 0 && ` · ${rede.entregadores_analise} entregador${rede.entregadores_analise > 1 ? 'es' : ''} com documentos`}
          </span>
          <span style={{ display: 'flex', gap: 6 }}>
            {rede.lojas_pendentes > 0 && <button type="button" className="btn btn-pequeno btn-amarelo" onClick={() => aoAbrir('lojas')}>Ver lojas</button>}
            {rede.entregadores_analise > 0 && <button type="button" className="btn btn-pequeno btn-amarelo" onClick={() => aoAbrir('entregadores')}>Ver entregadores</button>}
          </span>
        </div>
      )}

      <section style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Hoje</h2>
        <Grade>
          <Numero rotulo="Pedidos entregues" valor={hoje.entregues} detalhe={`${hoje.recebidos} recebidos · ${hoje.cancelados} cancelados`} destaque />
          <Numero rotulo="Vendas" valor={brl(hoje.faturamento)} detalhe={`ticket médio ${brl(hoje.ticket_medio)}`} />
          <Numero rotulo="Comissão da plataforma" valor={brl(hoje.comissao)} detalhe={hoje.taxas_cancelamento ? `+ ${brl(hoje.taxas_cancelamento)} em taxas de cancelamento (vão às lojas e entregadores)` : 'sobre os produtos'} />
          <Numero rotulo="Em andamento agora" valor={agora} detalhe={`${andamento.novo} novos · ${andamento.preparo + andamento.aceito} no preparo · ${andamento.saiu} na rua`} />
        </Grade>
      </section>

      <section style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Este mês</h2>
        <Grade>
          <Numero rotulo="Pedidos entregues" valor={mes.entregues} detalhe={`${mes.recebidos} recebidos`} />
          <Numero rotulo="Vendas" valor={brl(mes.faturamento)} detalhe={`ticket médio ${brl(mes.ticket_medio)}`} />
          <Numero rotulo="Comissão da plataforma" valor={brl(mes.comissao)} />
          <Numero rotulo="Cancelamentos" valor={`${taxaCancel}%`} detalhe={`${mes.cancelados} de ${mes.recebidos} pedidos`} />
        </Grade>
      </section>

      <section style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Vendas nos últimos 30 dias</h2>
        <div className="cartao"><Grafico dias={d.dias} /><small className="muted">Passe o dedo ou o mouse sobre uma barra para ver o dia. Conta pedidos entregues.</small></div>
      </section>

      <section style={{ display: 'grid', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Rede</h2>
        <Grade>
          <Numero rotulo="Lojas ativas" valor={`${rede.lojas_ativas} de ${rede.lojas_total}`} />
          <Numero rotulo="Entregadores online" valor={`${rede.entregadores_online} de ${rede.entregadores_total}`} />
          <Numero rotulo="Entregadores sem documentos" valor={rede.entregadores_sem_docs} detalhe="da plataforma, ainda não enviaram ou foram recusados" />
        </Grade>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
        <section className="cartao">
          <h2 style={{ margin: 0, fontSize: 18 }}>Como pagam (mês)</h2>
          {totalPag === 0 ? <span className="muted">Sem vendas no mês ainda.</span> : Object.entries(d.pagamento).map(([k, v]) => (
            <div key={k} style={{ display: 'grid', gap: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{k}</span><b>{brl(v)} · {Math.round((v / totalPag) * 100)}%</b></div>
              <div style={{ height: 8, borderRadius: 4, background: 'var(--linha)' }}><div style={{ width: `${(v / totalPag) * 100}%`, height: '100%', borderRadius: 4, background: 'var(--azul)' }} /></div>
            </div>
          ))}
        </section>
        <section className="cartao">
          <h2 style={{ margin: 0, fontSize: 18 }}>Lojas que mais vendem (mês)</h2>
          {d.top_lojas.length === 0 ? <span className="muted">Sem vendas no mês ainda.</span> : d.top_lojas.map((l, i) => (
            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>{i + 1}. {l.nome}</span><b>{brl(l.valor)}</b></div>
          ))}
        </section>
        <section className="cartao">
          <h2 style={{ margin: 0, fontSize: 18 }}>Entregadores que mais entregam (mês)</h2>
          {d.top_entregadores.length === 0 ? <span className="muted">Sem entregas no mês ainda.</span> : d.top_entregadores.map((e, i) => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><span>{i + 1}. {e.nome}</span><b>{e.entregas} entregas</b></div>
          ))}
        </section>
      </div>
      <small className="muted">Atualiza sozinho a cada 30 segundos. Dias contados no horário de Brasília. Comissão = a parte da plataforma sobre os produtos dos pedidos entregues.</small>
    </div>
  );
}
