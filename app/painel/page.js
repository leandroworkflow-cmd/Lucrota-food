'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import BotaoAjuda from '../../components/BotaoAjuda';
import NotificacoesLoja from '../../components/NotificacoesLoja';
import { usePainel } from '../../components/PainelShell';
import { api } from '../../lib/api-cliente';
import { brl, formatarTelefone, hora, linkWhatsApp } from '../../lib/format';
import { PCT_PRODUTOS } from '../../lib/cancelamento';
import { VEICULOS } from '../../lib/entrega';
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

// Alarme mais insistente que o do pedido novo: o entregador está na porta esperando.
function alarmeChegada() {
  bipar();
  setTimeout(bipar, 1800);
  setTimeout(bipar, 3600);
}

const mesmoDia = (iso) => new Date(iso).toDateString() === new Date().toDateString();

function CartaoPedido({ p, loja, onStatus, onChamar, onPronto, ocupado }) {
  const [codigo, setCodigo] = useState('');
  // Com entregador aceito, ele conduz as etapas "saiu" e "entregue" pelo app dele.
  const entregadorCuida = Boolean(p.entregador_id) && ['preparo', 'saiu'].includes(p.status);
  const proximo = entregadorCuida ? null : PROXIMO[p.status];
  const podeChamar = ['aceito', 'preparo'].includes(p.status) && !p.entrega;
  const cancelavel = ['novo', 'aceito', 'preparo'].includes(p.status);
  return (
    <li className={p.status === 'novo' ? 'pedido novo' : 'pedido'}>
      {p.entregador_id && p.chegou_loja_em && ['aceito', 'preparo'].includes(p.status) && (
        <div className="alerta-chegada" role="alert">
          <strong>🛵 {p.entregador_nome || 'O entregador'} chegou na loja!</strong>
          <span>Entregue o pedido #{p.numero} a ele. Chegou às {hora(p.chegou_loja_em)}.</span>
        </div>
      )}
      <div className="pedido-topo">
        <strong>#{p.numero}</strong>
        <span className="pedido-meta">
          {hora(p.criado_em)} · {STATUS[p.status]}{p.pronto_em && p.status === 'preparo' ? ` · Pronto às ${hora(p.pronto_em)}` : ''}
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
      {p.status === 'cancelado' && p.cancelado_por === 'cliente' && (
        <div className="aviso">
          Cancelado pelo cliente.{Number(p.taxa_cancelamento) > 0 ? ` Taxa de cancelamento: ${brl(Math.round(Number(p.subtotal) * PCT_PRODUTOS) / 100)} entra na sua conta.` : ' Sem taxa.'}
        </div>
      )}
      {p.observacao && <div className="aviso">Obs.: {p.observacao}</div>}
      <div className="pedido-meta">
        {p.forma_pagamento === 'pix_app' || p.forma_pagamento === 'cartao_app' ? `✅ ${p.forma_pagamento === 'pix_app' ? 'Pix' : 'Cartão'} pago pelo app (não cobrar na entrega)` : FORMAS[p.forma_pagamento]}
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
              <span>
                🛵 {p.entregador_nome || 'Entregador'}
                {p.entregador_veiculo ? ` (${VEICULOS[p.entregador_veiculo] || p.entregador_veiculo})` : ''}{' '}
                {p.status === 'saiu' ? 'está com o pedido' : p.chegou_loja_em ? 'está na loja' : 'aceitou e está a caminho'}
              </span>
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
      {p.foto_coleta_em && (
        <div>
          <button
            type="button"
            className="btn btn-pequeno"
            onClick={async () => {
              const w = window.open('', '_blank');
              try {
                const r = await api(`/api/loja/foto-coleta?pedido_id=${p.id}`);
                if (w) { w.opener = null; w.location.href = r.url; }
              } catch (e) {
                w?.close();
                window.alert(e.message);
              }
            }}
          >
            📷 Ver foto da coleta
          </button>
        </div>
      )}
      <div>
        <BotaoAjuda papel="lojista" numero={p.numero} loja={loja?.nome} />
      </div>
      {(proximo || cancelavel) && (
        <div className="pedido-acoes">
          {proximo === 'entregue' ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input className="input" style={{ width: 120, textAlign: 'center', letterSpacing: '0.2em' }} inputMode="numeric" maxLength={4} placeholder="Código" aria-label="Código de entrega do cliente" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} />
              <button type="button" className="btn btn-primario btn-pequeno" disabled={ocupado || codigo.length !== 4} onClick={() => onStatus(p, 'entregue', codigo)}>
                Confirmar entrega
              </button>
            </div>
          ) : (
            proximo && (
              <button type="button" className="btn btn-primario btn-pequeno" disabled={ocupado} onClick={() => onStatus(p, proximo)}>
                {ACAO[p.status]}
              </button>
            )
          )}
          {p.status === 'preparo' && !p.pronto_em && (
            <button type="button" className="btn btn-primario btn-pequeno" disabled={ocupado} onClick={() => onPronto(p)}>
              Pedido pronto
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
  const chegadas = useRef(null);
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
      .select('id,numero,token,cliente_nome,cliente_telefone,endereco,bairro,complemento,forma_pagamento,troco_para,observacao,itens,subtotal,taxa_entrega,total,status,criado_em,atualizado_em,entregador_id,entrega,pagamento_status,chegou_loja_em,pronto_em,entregador_nome,entregador_veiculo,cancelado_por,taxa_cancelamento,foto_coleta_em')
      .eq('loja_id', loja.id)
      .or('pagamento_status.is.null,pagamento_status.in.(pago,reembolsado,reembolsado_parcial)')
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
    // Entregador que acabou de chegar na loja: toca o alarme (se o som estiver ligado).
    const chegou = new Set(data.filter((p) => p.chegou_loja_em && ['aceito', 'preparo'].includes(p.status)).map((p) => p.id));
    if (chegadas.current && [...chegou].some((id) => !chegadas.current.has(id)) && somRef.current) alarmeChegada();
    chegadas.current = chegou;
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
    const chegaram = andamento.filter((p) => p.chegou_loja_em && p.entregador_id && ['aceito', 'preparo'].includes(p.status)).length;
    if (chegaram) document.title = `🛵 Entregador chegou | Painel`;
    else document.title = novos.length ? `(${novos.length}) Novo pedido | Painel` : 'Painel da loja';
  }, [novos.length, andamento]);

  async function mudarStatus(p, status, codigo) {
    setOcupado(true);
    try {
      await api('/api/loja/status', { metodo: 'POST', corpo: { pedido_id: p.id, status, ...(codigo ? { codigo } : {}) } });
      setErro('');
    } catch (e) {
      setErro(e.message);
    }
    setOcupado(false);
    carregar();
  }

  async function marcarPronto(p) {
    setOcupado(true);
    try {
      await api('/api/loja/pronto', { metodo: 'POST', corpo: { pedido_id: p.id } });
      setErro('');
    } catch (e) {
      setErro(e.message);
    }
    setOcupado(false);
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
                <CartaoPedido key={p.id} p={p} loja={loja} onStatus={mudarStatus} onChamar={chamarEntregador} onPronto={marcarPronto} ocupado={ocupado} />
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
                <CartaoPedido key={p.id} p={p} loja={loja} onStatus={mudarStatus} onChamar={chamarEntregador} onPronto={marcarPronto} ocupado={ocupado} />
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
                <CartaoPedido key={p.id} p={p} loja={loja} onStatus={mudarStatus} onChamar={chamarEntregador} onPronto={marcarPronto} ocupado={ocupado} />
              ))}
            </ul>
            {finalizados.length === 0 && <p className="muted">Ainda não há pedidos finalizados hoje.</p>}
          </section>
        </div>
      )}
    </>
  );
}
