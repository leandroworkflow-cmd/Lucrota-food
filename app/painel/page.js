'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import NotificacoesLoja from '../../components/NotificacoesLoja';
import { usePainel } from '../../components/PainelShell';
import { api } from '../../lib/api-cliente';
import { brl, formatarTelefone, hora, linkWhatsApp } from '../../lib/format';
import { ACAO, FORMAS, PROXIMO, STATUS } from '../../lib/pedido';
import { supabase } from '../../lib/supabase';

const CHAVE_SOM = 'dl:som:v1';

function bipar() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1175, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.start(t);
      osc.stop(t + 0.22);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // sem áudio: segue sem som
  }
}

const mesmoDia = (iso) => new Date(iso).toDateString() === new Date().toDateString();

function CartaoPedido({ p, onStatus, onChamar, ocupado }) {
  // Com entregador aceito, ele conduz as etapas "saiu" e "entregue" pelo app dele.
  const entregadorCuida = Boolean(p.entregador_id) && ['preparo', 'saiu'].includes(p.status);
  const proximo = entregadorCuida ? null : PROXIMO[p.status];
  const podeChamar = ['aceito', 'preparo'].includes(p.status) && !p.entrega;
  const cancelavel = ['novo', 'aceito', 'preparo'].includes(p.status);
  return (
    <li className={p.status === 'novo' ? 'pedido novo' : 'pedido'}>
      <div className="pedido-topo">
        <strong>#{p.numero}</strong>
        <span className="pedido-meta">
          {hora(p.criado_em)} · {STATUS[p.status]}
        </span>
      </div>
      <div>
        <strong>{p.cliente_nome}</strong>
        <div className="pedido-meta">
          <a href={linkWhatsApp(p.cliente_telefone, `Olá, ${p.cliente_nome}! Aqui é da loja sobre o seu pedido ${p.numero}.`)} target="_blank" rel="noopener noreferrer">
            {formatarTelefone(p.cliente_telefone)}
          </a>
        </div>
        <div className="pedido-meta">
          {p.endereco}
          {p.bairro ? `, ${p.bairro}` : ''}
          {p.complemento ? ` (${p.complemento})` : ''}
        </div>
      </div>
      <ul className="pedido-itens">
        {p.itens.map((i, n) => (
          <li key={`${i.id}-${n}`}>
            {i.qtd}x {i.nome}
            {i.obs ? ` (${i.obs})` : ''}
          </li>
        ))}
      </ul>
      {p.observacao && <div className="aviso">Obs.: {p.observacao}</div>}
      <div className="pedido-meta">
        {FORMAS[p.forma_pagamento]}
        {p.forma_pagamento === 'dinheiro' && p.troco_para ? `, troco para ${brl(p.troco_para)}` : ''}
      </div>
      <div className="pedido-topo">
        <span className="pedido-meta">Entrega {brl(p.taxa_entrega)}</span>
        <strong>{brl(p.total)}</strong>
      </div>
      {(p.entrega || podeChamar) && (
        <div className="entrega-info" style={{ padding: '10px 12px' }}>
          {p.entregador_id ? (
            <>
              <span>🛵 Entregador {p.status === 'saiu' ? 'com o pedido' : 'aceitou a corrida'}</span>
              <a href={`/pedido/${p.token}`} target="_blank" rel="noopener noreferrer">
                Ver no mapa
              </a>
            </>
          ) : p.entrega === 'procurando' ? (
            <>
              <span>🔎 Procurando entregador…</span>
              <button type="button" className="btn btn-pequeno" disabled={ocupado} onClick={() => onChamar(p, true)}>
                Cancelar chamada
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-pequeno btn-primario" disabled={ocupado} onClick={() => onChamar(p, false)}>
              🛵 Chamar entregador
            </button>
          )}
        </div>
      )}
      {(proximo || cancelavel) && (
        <div className="pedido-acoes">
          {proximo && (
            <button type="button" className="btn btn-primario btn-pequeno" disabled={ocupado} onClick={() => onStatus(p, proximo)}>
              {ACAO[p.status]}
            </button>
          )}
          {cancelavel && (
            <button
              type="button"
              className="btn btn-pequeno"
              disabled={ocupado}
              onClick={() => window.confirm(`Cancelar o pedido #${p.numero}? O cliente será avisado no acompanhamento.`) && onStatus(p, 'cancelado')}
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export default function Pedidos() {
  const { loja, recarregarLoja } = usePainel();
  const [pedidos, setPedidos] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState('');
  const [som, setSom] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const vistos = useRef(null);
  const somRef = useRef(false);

  useEffect(() => {
    try {
      const ligado = localStorage.getItem(CHAVE_SOM) === '1';
      setSom(ligado);
      somRef.current = ligado;
    } catch {
      // ignora
    }
  }, []);

  const carregar = useCallback(async () => {
    const desde = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from('dl_pedidos')
      .select('*')
      .eq('loja_id', loja.id)
      .gte('criado_em', desde)
      .order('criado_em', { ascending: false })
      .limit(200);
    if (error) {
      setErro('Não consegui atualizar os pedidos. Confira a internet.');
      return;
    }
    setErro('');
    setPedidos(data);
    setCarregado(true);
    const ids = new Set(data.filter((p) => p.status === 'novo').map((p) => p.id));
    if (vistos.current) {
      const chegou = [...ids].some((id) => !vistos.current.has(id));
      if (chegou && somRef.current) bipar();
    }
    vistos.current = ids;
  }, [loja.id]);

  useEffect(() => {
    carregar();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') carregar();
    }, 8000);
    const voltou = () => document.visibilityState === 'visible' && carregar();
    document.addEventListener('visibilitychange', voltou);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', voltou);
    };
  }, [carregar]);

  const novos = pedidos.filter((p) => p.status === 'novo');
  const andamento = pedidos.filter((p) => ['aceito', 'preparo', 'saiu'].includes(p.status)).reverse();
  const finalizados = pedidos.filter((p) => ['entregue', 'cancelado'].includes(p.status) && mesmoDia(p.atualizado_em));

  useEffect(() => {
    document.title = novos.length ? `(${novos.length}) Novo pedido | Painel` : 'Painel da loja';
  }, [novos.length]);

  async function mudarStatus(p, status) {
    setOcupado(true);
    const { error } = await supabase
      .from('dl_pedidos')
      .update({ status, atualizado_em: new Date().toISOString() })
      .eq('id', p.id);
    setOcupado(false);
    if (error) {
      setErro('Não consegui mudar o status. Tente de novo.');
      return;
    }
    carregar();
  }

  async function chamarEntregador(p, cancelar) {
    setOcupado(true);
    try {
      await api('/api/entrega/chamar', { metodo: 'POST', corpo: { pedido_id: p.id, cancelar } });
      setErro('');
    } catch (e) {
      setErro(e.message);
    }
    setOcupado(false);
    carregar();
  }

  async function alternarAberta() {
    const { error } = await supabase.from('dl_lojas').update({ aberta: !loja.aberta }).eq('id', loja.id);
    if (error) setErro('Não consegui mudar o horário da loja.');
    else recarregarLoja();
  }

  function alternarSom() {
    const novo = !som;
    setSom(novo);
    somRef.current = novo;
    try {
      localStorage.setItem(CHAVE_SOM, novo ? '1' : '0');
    } catch {
      // ignora
    }
    if (novo) bipar(); // o toque também libera o áudio no navegador
  }

  return (
    <>
      <div className="painel-topo-linha">
        <h1>Pedidos</h1>
        <div className="opcoes">
          <button type="button" className="chave" aria-pressed={Boolean(loja.aberta)} onClick={alternarAberta}>
            <i aria-hidden="true" />
            {loja.aberta ? 'Loja aberta' : 'Loja fechada'}
          </button>
          <button type="button" className="chave" aria-pressed={som} onClick={alternarSom}>
            <i aria-hidden="true" />
            {som ? 'Som ligado' : 'Som desligado'}
          </button>
        </div>
      </div>

      {!loja.aberta && (
        <div className="aviso" role="status">
          Sua loja está fechada: os clientes veem o cardápio, mas não conseguem pedir. Toque em &quot;Loja fechada&quot; para abrir.
        </div>
      )}
      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}
      <NotificacoesLoja />

      {!carregado ? (
        <p className="muted">Carregando pedidos…</p>
      ) : (
        <div className="colunas">
          <section className="coluna" aria-label="Pedidos novos">
            <h2>
              Novos <span>{novos.length}</span>
            </h2>
            <ul>
              {novos.map((p) => (
                <CartaoPedido key={p.id} p={p} onStatus={mudarStatus} onChamar={chamarEntregador} ocupado={ocupado} />
              ))}
            </ul>
            {novos.length === 0 && <p className="muted">Nenhum pedido novo. Esta tela atualiza sozinha.</p>}
          </section>
          <section className="coluna" aria-label="Pedidos em andamento">
            <h2>
              Em andamento <span>{andamento.length}</span>
            </h2>
            <ul>
              {andamento.map((p) => (
                <CartaoPedido key={p.id} p={p} onStatus={mudarStatus} onChamar={chamarEntregador} ocupado={ocupado} />
              ))}
            </ul>
            {andamento.length === 0 && <p className="muted">Nada em andamento.</p>}
          </section>
          <section className="coluna" aria-label="Pedidos de hoje já finalizados">
            <h2>
              Finalizados hoje <span>{finalizados.length}</span>
            </h2>
            <ul>
              {finalizados.map((p) => (
                <CartaoPedido key={p.id} p={p} onStatus={mudarStatus} onChamar={chamarEntregador} ocupado={ocupado} />
              ))}
            </ul>
            {finalizados.length === 0 && <p className="muted">Ainda não há pedidos finalizados hoje.</p>}
          </section>
        </div>
      )}
    </>
  );
}
