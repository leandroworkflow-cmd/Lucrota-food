'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api-cliente';
import { brl } from '../lib/format';
import { STATUS_SAQUE, lerValor, validarSaque } from '../lib/saque';

const quando = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// Pedido de saque por Pix: a pessoa escolhe o valor, confirma a chave e a equipe paga. Serve para loja e entregador.
export default function SaqueSaldo({ conta, chave, aoMudar, aviso }) {
  const [d, setD] = useState(null);
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setD(await api(`/api/saque?conta=${conta}`));
    } catch (e) {
      setErro(e.message);
    }
  }, [conta]);
  useEffect(() => { carregar(); }, [carregar, chave]);
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === 'visible' && carregar(), 20000);
    return () => clearInterval(id);
  }, [carregar]);

  if (!d) return erro ? <div className="aviso aviso-erro" role="alert">{erro}</div> : null;
  const chavePix = d.chave_pix;
  const pode = d.disponivel >= d.minimo;

  function abrir() {
    setValor(d.disponivel.toFixed(2).replace('.', ','));
    setErro('');
    setOk('');
    setAberto(true);
  }

  async function pedir(e) {
    e.preventDefault();
    const v = validarSaque({ valor, saldo: d.saldo, pendente: d.pendente, chave: chavePix });
    if (v.erro) return setErro(v.erro);
    setOcupado(true);
    setErro('');
    try {
      await api('/api/saque', { metodo: 'POST', corpo: { conta, valor: v.valor } });
      setAberto(false);
      setOk(`Pedido de ${brl(v.valor)} enviado. Você recebe um aviso quando o Pix for feito.`);
      await carregar();
      await aoMudar?.();
    } catch (e2) {
      setErro(e2.message);
    }
    setOcupado(false);
  }

  async function cancelar(id) {
    if (!window.confirm('Cancelar esse pedido de saque?')) return;
    try {
      await api('/api/saque', { metodo: 'POST', corpo: { conta, acao: 'cancelar', id } });
      setOk('Pedido cancelado.');
      await carregar();
      await aoMudar?.();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <section className="cartao" style={{ display: 'grid', gap: 10 }} aria-label="Sacar saldo">
      <h2 style={{ margin: 0 }}>Sacar saldo por Pix</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span>Disponível para sacar</span>
        <strong style={{ fontSize: 22 }}>{brl(d.disponivel)}</strong>
      </div>
      {d.pendente > 0 && <small className="muted">{brl(d.pendente)} já pedido e aguardando pagamento.</small>}
      {aviso}
      {!chavePix && <div className="aviso" role="status">Cadastre a sua chave Pix para poder sacar.</div>}
      {ok && <div className="aviso" role="status">{ok}</div>}

      {!aberto && (
        <button type="button" className="btn btn-primario" disabled={!pode || !chavePix} onClick={abrir}>Sacar saldo</button>
      )}
      {!aberto && chavePix && !pode && <small className="muted">Saque a partir de {brl(d.minimo)}. Sem limite de pedidos por dia.</small>}

      {aberto && (
        <form onSubmit={pedir} style={{ display: 'grid', gap: 10 }}>
          <div className="campo">
            <label htmlFor={`valor-${conta}`}>Valor do saque (mínimo {brl(d.minimo)})</label>
            <input id={`valor-${conta}`} className="input" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
            <button type="button" className="btn btn-pequeno" onClick={() => setValor(d.disponivel.toFixed(2).replace('.', ','))}>Sacar tudo ({brl(d.disponivel)})</button>
          </div>
          <div className="aviso">
            O Pix será enviado para a chave <strong style={{ wordBreak: 'break-all' }}>{chavePix}</strong>. Confira se está certa; para trocar, altere a chave no seu cadastro antes de pedir.
          </div>
          {erro && <div className="aviso aviso-erro" role="alert">{erro}</div>}
          <div className="opcoes">
            <button type="submit" className="btn btn-primario" disabled={ocupado || lerValor(valor) === null}>
              {ocupado ? 'Enviando…' : `Confirmar saque de ${brl(lerValor(valor) || 0)}`}
            </button>
            <button type="button" className="btn" onClick={() => setAberto(false)}>Voltar</button>
          </div>
        </form>
      )}
      {!aberto && erro && <div className="aviso aviso-erro" role="alert">{erro}</div>}

      {d.saques.length > 0 && (
        <div style={{ display: 'grid', gap: 6 }}>
          <strong style={{ fontSize: 15 }}>Seus pedidos de saque</strong>
          {d.saques.map((s) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 14 }}>
              <span>{quando(s.criado_em)} · {brl(s.valor)}</span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: s.status === 'pago' ? '#2e9e6b' : s.status === 'recusado' ? '#d94a3d' : undefined }}>
                  {STATUS_SAQUE[s.status]}
                </span>
                {s.status === 'pendente' && <button type="button" className="btn btn-pequeno" onClick={() => cancelar(s.id)}>Cancelar</button>}
              </span>
              {s.status === 'recusado' && s.motivo && <small className="muted" style={{ flexBasis: '100%' }}>Motivo: {s.motivo}</small>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
