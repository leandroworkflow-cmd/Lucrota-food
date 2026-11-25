'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AvisosPush from '../../components/AvisosPush';
import Mapa from '../../components/Mapa';
import BotaoAjuda from '../../components/BotaoAjuda';
import Marca from '../../components/Marca';
import Documentos from './Documentos';
import SelfieDia from './SelfieDia';
import { Icone } from '../../components/Icones';
import SaqueSaldo from '../../components/SaqueSaldo';
import ExcluirConta from '../../components/ExcluirConta';
import BotaoApple from '../../components/BotaoApple';
import { api, apiEnviar } from '../../lib/api-cliente';
import { prepararDocumento } from '../../lib/imagem';
import { entrarComGoogle, sair, useSession } from '../../lib/auth';
import { corridasPorDistancia, VEICULOS } from '../../lib/entrega';
import { SEGUNDOS_OFERTA } from '../../lib/ofertas';
import { brl } from '../../lib/format';
import { FORMAS } from '../../lib/pedido';
import { linkSuporte } from '../../lib/suporte';
import { coordValida, distanciaM, linkGoogleMaps, linkWaze, textoDistancia, textoTempo } from '../../lib/geo';
import { desbloquearAudio, tocarAlarme, vibrar } from '../../lib/alarme';
import { supabase } from '../../lib/supabase';

function Cadastro({ aoConcluir }) {
  const [f, setF] = useState({ nome: '', telefone: '', veiculo: 'moto', cpf: '', endereco: '', cnh_nome: '', cnh_validade: '', cnh_categoria: 'A', placa: '' });
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const campo = (n) => (e) => setF((x) => ({ ...x, [n]: e.target.value }));

  async function enviar(ev) {
    ev.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await api('/api/entrega/cadastro', { metodo: 'POST', corpo: f });
      await aoConcluir();
    } catch (e) {
      setErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <form className="cartao" onSubmit={enviar}>
      <h2>Cadastro de entregador</h2>
      <div className="campo">
        <label htmlFor="e-nome">Seu nome</label>
        <input id="e-nome" className="input" required maxLength={60} value={f.nome} onChange={campo('nome')} />
      </div>
      <div className="linha-campos">
        <div className="campo">
          <label htmlFor="e-tel">WhatsApp</label>
          <input id="e-tel" className="input" required type="tel" inputMode="tel" placeholder="(31) 99999-9999" value={f.telefone} onChange={campo('telefone')} />
        </div>
        <div className="campo">
          <label htmlFor="e-vei">Veículo</label>
          <select id="e-vei" className="input" value={f.veiculo} onChange={campo('veiculo')}>
            {Object.entries(VEICULOS).map(([id, rotulo]) => (
              <option key={id} value={id}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="campo">
        <label htmlFor="e-cpf">CPF</label>
        <input id="e-cpf" className="input" required inputMode="numeric" maxLength={14} placeholder="000.000.000-00" value={f.cpf} onChange={campo('cpf')} />
      </div>
      <div className="campo">
        <label htmlFor="e-end">Endereço onde você mora</label>
        <input id="e-end" className="input" required maxLength={200} placeholder="Rua, número, bairro e cidade" value={f.endereco} onChange={campo('endereco')} />
      </div>
      {(f.veiculo === 'moto' || f.veiculo === 'carro') && (
        <>
          <div className="campo">
            <label htmlFor="e-cnhn">Nome completo, como está na CNH</label>
            <input id="e-cnhn" className="input" required maxLength={80} value={f.cnh_nome} onChange={campo('cnh_nome')} />
          </div>
          <div className="linha-campos">
            <div className="campo">
              <label htmlFor="e-cnhv">Validade da CNH</label>
              <input id="e-cnhv" className="input" required type="date" value={f.cnh_validade} onChange={campo('cnh_validade')} />
            </div>
            <div className="campo">
              <label htmlFor="e-cnhc">Categoria da CNH</label>
              <select id="e-cnhc" className="input" value={f.cnh_categoria} onChange={campo('cnh_categoria')}>
                {['A', 'AB', 'B', 'AC', 'AD', 'AE', 'C', 'D', 'E'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="campo">
            <label htmlFor="e-placa">Placa do veículo</label>
            <input id="e-placa" className="input" required maxLength={8} placeholder="ABC1D23" value={f.placa} onChange={(e) => setF((x) => ({ ...x, placa: e.target.value.toUpperCase() }))} />
          </div>
        </>
      )}
      <small>
        Depois do cadastro você envia a foto (ou PDF) da CNH e do documento do veículo, o comprovante de residência e uma selfie para reconhecimento facial.
        Você só começa a receber corridas depois que a nossa equipe aprovar.
      </small>
      {erro && (
        <div className="aviso aviso-erro" role="alert">
          {erro}
        </div>
      )}
      <button type="submit" className="btn btn-primario" disabled={enviando}>
        {enviando ? 'Enviando…' : 'Concluir cadastro'}
      </button>
    </form>
  );
}

function CartaoEntrega({ p, posicao, onAcao, onChegada, onChegadaCliente, onEntregar, onFoto, ocupado }) {
  const [codigo, setCodigo] = useState('');
  const [msgCodigo, setMsgCodigo] = useState('');
  const loja = p.dl_lojas || {};
  const saiu = p.status === 'saiu';
  const alvo = saiu
    ? { lat: p.destino_lat, lng: p.destino_lng, endereco: `${p.endereco}${p.bairro ? `, ${p.bairro}` : ''}, ${loja.cidade || ''}` }
    : { lat: loja.lat, lng: loja.lng, endereco: `${loja.endereco || ''}${loja.bairro ? `, ${loja.bairro}` : ''}, ${loja.cidade || ''}` };

  const pontos = [];
  if (Number.isFinite(loja.lat)) pontos.push({ id: 'loja', tipo: 'loja', lat: loja.lat, lng: loja.lng, rotulo: loja.nome });
  if (Number.isFinite(p.destino_lat)) pontos.push({ id: 'cliente', tipo: 'cliente', lat: p.destino_lat, lng: p.destino_lng, rotulo: 'Cliente' });
  if (posicao) pontos.push({ id: 'voce', tipo: 'moto', lat: posicao.lat, lng: posicao.lng, rotulo: 'Você' });

  return (
    <section className="cartao" aria-label={`Entrega do pedido ${p.numero}`}>
      <h2>
        Pedido {p.numero} · {saiu ? 'Leve ao cliente' : `Retire na loja ${loja.nome || ''}`}
      </h2>

      {pontos.length > 0 && <Mapa pontos={pontos} altura={220} />}

      <div>
        <strong>{saiu ? 'Entregar em' : 'Retirar em'}</strong>
        <div>{alvo.endereco}</div>
        {saiu && p.complemento && <div className="muted">{p.complemento}</div>}
      </div>

      <div className="opcoes">
        <a className="btn btn-pequeno btn-primario" href={linkWaze(alvo)} target="_blank" rel="noopener noreferrer">
          Abrir no Waze
        </a>
        <a className="btn btn-pequeno" href={linkGoogleMaps(alvo)} target="_blank" rel="noopener noreferrer">
          Google Maps
        </a>
      </div>

      {!saiu && p.pronto_em && (
        <div className="aviso" role="status"><Icone nome="ok" tam={18} style={{ verticalAlign: '-3px' }} /> <strong>Pedido pronto.</strong> Pode retirar na loja.</div>
      )}
      {!saiu && (
        <div className={p.chegou_loja_em ? 'aviso' : 'entrega-info'} role="status">
          {p.chegou_loja_em ? 'A loja foi avisada que você chegou. Pegue o pedido, tire a foto dele e siga para o cliente.' : 'Ao chegar na loja, toque em "Cheguei na loja". Ela recebe um alerta para entregar o pedido a você.'}
        </div>
      )}

      {saiu ? (
        <div className="entrega-info">
          <span>
            Cliente: <strong style={{ fontSize: 16 }}>{p.cliente_nome}</strong>
          </span>
          <a href={`https://wa.me/${p.cliente_telefone}`} target="_blank" rel="noopener noreferrer">
            Chamar no WhatsApp
          </a>
          <span>
            Receber: <strong style={{ fontSize: 16 }}>{p.forma_pagamento === 'pix_app' || p.forma_pagamento === 'cartao_app' ? 'Já pago pelo app. Não cobre nada' : p.forma_pagamento === 'dinheiro' ? `${brl(p.total)} em dinheiro${p.troco_para ? `, troco para ${brl(p.troco_para)}` : ''}` : `${FORMAS[p.forma_pagamento]} (${brl(p.total)})`}</strong>
          </span>
          {p.observacao && <span className="muted">Obs.: {p.observacao}</span>}
        </div>
      ) : (
        loja.whatsapp && (
          <a href={`https://wa.me/${loja.whatsapp}`} target="_blank" rel="noopener noreferrer">
            Falar com a loja no WhatsApp
          </a>
        )
      )}

      <BotaoAjuda papel="entregador" numero={p.numero} loja={loja.nome} />

      <div className="opcoes">
        {saiu ? (
          <>
          {p.chegou_cliente_em ? (
            <div className="aviso" role="status" style={{ width: '100%' }}><Icone nome="ok" tam={18} style={{ verticalAlign: '-3px' }} /> O cliente foi avisado (com alerta sonoro) que você chegou. Peça o código de 4 números.</div>
          ) : (
            <button type="button" className="btn btn-primario" style={{ width: '100%' }} disabled={ocupado} onClick={() => onChegadaCliente(p.id)}>
              Cheguei no cliente
            </button>
          )}
          <form
            style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}
            onSubmit={async (e) => {
              e.preventDefault();
              setMsgCodigo('');
              const m = await onEntregar(p.id, codigo);
              if (m) setMsgCodigo(m);
            }}
          >
            <label htmlFor={`cod-${p.id}`} style={{ fontWeight: 600 }}>
              Código de entrega: peça os 4 números ao cliente
            </label>
            <input id={`cod-${p.id}`} className="input" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="0000" style={{ fontSize: 28, letterSpacing: '0.3em', textAlign: 'center' }} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))} />
            {msgCodigo && (
              <div className="aviso aviso-erro" role="alert">
                {msgCodigo}
              </div>
            )}
            <button type="submit" className="btn btn-primario" disabled={ocupado || codigo.length !== 4}>
              Confirmar entrega
            </button>
          </form>
          </>
        ) : (
          <>
            {!p.chegou_loja_em ? (
              <button type="button" className="btn btn-primario" disabled={ocupado} onClick={() => onChegada(p.id)}>
                Cheguei na loja
              </button>
            ) : !p.foto_coleta_em ? (
              <label className="btn btn-primario" style={{ cursor: ocupado ? 'default' : 'pointer', opacity: ocupado ? 0.6 : 1 }}>
                {ocupado ? 'Enviando foto…' : 'Tirar foto e seguir para o cliente'}
                <input type="file" accept="image/*" capture="environment" hidden disabled={ocupado} onChange={(e) => { const a = e.target.files?.[0]; e.target.value = ''; if (a) onFoto(p.id, a); }} />
              </label>
            ) : (
              <>
                <div className="aviso" role="status"><Icone nome="ok" tam={18} style={{ verticalAlign: '-3px' }} /> Foto do pedido enviada.</div>
                <button type="button" className="btn btn-primario" disabled={ocupado} onClick={() => onAcao(p.id, 'coletei')}>
                  Peguei o pedido
                </button>
              </>
            )}
            <button type="button" className="btn btn-pequeno" disabled={ocupado} onClick={() => window.confirm('Devolver essa corrida para outros entregadores?') && onAcao(p.id, 'desistir')}>
              Desistir
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function Painel({ dados, recarregar, aoSair }) {
  const [tela, setTela] = useState('mapa');
  const [menu, setMenu] = useState(false);
  const [selfie, setSelfie] = useState(false);
  const [altMapa] = useState(() => Math.round(window.innerHeight));
  const [aberto, setAberto] = useState(false);
  const [tratadas, setTratadas] = useState(() => new Set());
  const [oferta, setOferta] = useState(null);
  const [restante, setRestante] = useState(SEGUNDOS_OFERTA);
  const audio = useRef(null);
  const { entregador: ent, ativas, disponiveis, conta } = dados;
  const [chave, setChave] = useState(conta.chave_pix || '');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [posicao, setPosicao] = useState(null);
  const [gpsErro, setGpsErro] = useState('');
  const ultimoEnvio = useRef(0);
  const [minhaPos, setMinhaPos] = useState(null); // só no aparelho: serve para mostrar a distância até a loja, não é enviada ao servidor
  const [semGps, setSemGps] = useState(false);

  const levando = ativas.some((p) => p.status === 'saiu');
  const rastrear = ativas.length > 0; // GPS ligado em toda a corrida (para detectar a chegada); só é enviado ao cliente/loja com o pedido na mão
  const levandoRef = useRef(false);
  levandoRef.current = levando;

  async function executar(fn) {
    setOcupado(true);
    setErro('');
    try {
      await fn();
      await recarregar();
    } catch (e) {
      setErro(e.message);
      await recarregar().catch(() => {});
    }
    setOcupado(false);
  }

  const acao = (id, a) => executar(() => api('/api/entrega/avancar', { metodo: 'POST', corpo: { pedido_id: id, acao: a } }));
  // Conclui a entrega com o código do cliente. Devolve a mensagem de erro (ou null se deu certo).
  const entregar = async (id, codigo) => {
    setOcupado(true);
    try {
      await api('/api/entrega/avancar', { metodo: 'POST', corpo: { pedido_id: id, acao: 'entreguei', codigo } });
      await recarregar();
      return null;
    } catch (e) {
      await recarregar().catch(() => {});
      return e.message;
    } finally {
      setOcupado(false);
    }
  };
  // Foto do pedido na coleta: reduz no aparelho e envia. Sem ela, "Peguei o pedido" não libera.
  const foto = (id, arquivo) =>
    executar(async () => {
      const blob = await prepararDocumento(arquivo);
      const f = new FormData();
      f.append('pedido_id', id);
      f.append('arquivo', blob, 'coleta.jpg');
      await apiEnviar('/api/entrega/coleta', f);
      // A foto confirma a retirada: o pedido já sai para entrega e a tela passa para o endereço do cliente.
      await api('/api/entrega/avancar', { metodo: 'POST', corpo: { pedido_id: id, acao: 'coletei' } });
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  const aceitar = (id) => executar(() => api('/api/entrega/aceitar', { metodo: 'POST', corpo: { pedido_id: id } }));
  // "Cheguei na loja": manda a posição para o servidor conferir que você está perto (se o GPS permitir).
  const chegada = (id) =>
    executar(async () => {
      const pos = await new Promise((ok) => {
        if (!('geolocation' in navigator)) return ok(null);
        navigator.geolocation.getCurrentPosition((r) => ok({ lat: r.coords.latitude, lng: r.coords.longitude }), () => ok(null), { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 });
      });
      await api('/api/entrega/avancar', { metodo: 'POST', corpo: { pedido_id: id, acao: 'cheguei', ...(pos || {}) } });
    });
  // "Cheguei no cliente": manda a posição para o servidor e o cliente recebe aviso com alerta sonoro.
  const chegadaCliente = (id) =>
    executar(async () => {
      const pos = await new Promise((ok) => {
        if (!('geolocation' in navigator)) return ok(null);
        navigator.geolocation.getCurrentPosition((r) => ok({ lat: r.coords.latitude, lng: r.coords.longitude }), () => ok(null), { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 });
      });
      await api('/api/entrega/avancar', { metodo: 'POST', corpo: { pedido_id: id, acao: 'cheguei_cliente', ...(pos || {}) } });
    });
  const salvarChave = () =>
    executar(async () => {
      const { error } = await supabase.from('dl_entregadores').update({ chave_pix: chave.trim() || null }).eq('id', ent.id);
      if (error) throw new Error('Não consegui salvar a chave Pix. Rode o SQL 07 no Supabase.');
    });
  const alternarOnline = () =>
    executar(async () => {
      const { error } = await supabase.from('dl_entregadores').update({ online: !ent.online }).eq('id', ent.id);
      if (error) {
        if (String(error.message).includes('selfie_do_dia')) { setSelfie(true); throw new Error('Tire a selfie do dia para ficar online.'); }
        throw new Error('Não consegui mudar seu status.');
      }
    });

  // Distância até a loja das corridas disponíveis: usa o GPS só para calcular aqui na tela.
  const temCorridas = ent.online;
  useEffect(() => {
    if (!temCorridas || !('geolocation' in navigator)) return undefined;
    let vivo = true;
    const ler = () =>
      navigator.geolocation.getCurrentPosition(
        (r) => {
          if (!vivo) return;
          setMinhaPos({ lat: r.coords.latitude, lng: r.coords.longitude });
          setSemGps(false);
        },
        () => vivo && setSemGps(true),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
      );
    ler();
    const id = setInterval(ler, 30000);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [temCorridas]);
  const corridas = corridasPorDistancia(disponiveis, minhaPos);

  // GPS: só compartilha a localização enquanto você está com um pedido na mão.
  useEffect(() => {
    if (!rastrear) {
      setPosicao(null);
      return undefined;
    }
    if (!('geolocation' in navigator)) {
      setGpsErro('Este aparelho não tem GPS no navegador.');
      return undefined;
    }
    let travado = null;
    if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then((l) => (travado = l)).catch(() => {});
    const religar = () => {
      if (document.visibilityState === 'visible' && 'wakeLock' in navigator && (!travado || travado.released)) {
        navigator.wakeLock.request('screen').then((l) => (travado = l)).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', religar);

    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        setGpsErro('');
        const ponto = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosicao(ponto);
        if (!levandoRef.current) return;
        const agora = Date.now();
        if (agora - ultimoEnvio.current < 5000) return;
        ultimoEnvio.current = agora;
        await supabase.from('dl_localizacoes').upsert({
          entregador_id: ent.id,
          ...ponto,
          precisao: pos.coords.accuracy,
          atualizado_em: new Date().toISOString(),
        });
      },
      (e) => setGpsErro(e.code === 1 ? 'Ative a localização do aparelho e permita para este site. Sem ela o cliente não vê você no mapa.' : 'Não consegui pegar o GPS agora.'),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 }
    );
    return () => {
      navigator.geolocation.clearWatch(id);
      document.removeEventListener('visibilitychange', religar);
      travado?.release?.().catch(() => {});
    };
  }, [rastrear, ent.id]);

  // ---- Chegada ao local (como nos apps de corrida): perto da loja/cliente aparece o botão "Cheguei" com som e vibração ----
  const atual = ativas[0] || null;
  const fase = atual ? (atual.status === 'saiu' ? 'cliente' : 'loja') : null;
  const alvoAtual = atual ? (fase === 'cliente' ? { lat: atual.destino_lat, lng: atual.destino_lng } : { lat: atual.dl_lojas?.lat, lng: atual.dl_lojas?.lng }) : null;
  const jaAvisou = atual ? (fase === 'cliente' ? Boolean(atual.chegou_cliente_em) : Boolean(atual.chegou_loja_em)) : true;
  const pontoAtual = posicao || minhaPos;
  const distAlvo = pontoAtual && alvoAtual && coordValida(alvoAtual.lat, alvoAtual.lng) ? distanciaM(pontoAtual, alvoAtual) : null;
  const perto = Boolean(atual) && !jaAvisou && distAlvo != null && distAlvo <= 200;
  const avisouPerto = useRef('');
  useEffect(() => {
    if (!perto) return;
    const chave = `${atual.id}:${fase}`;
    if (avisouPerto.current === chave) return;
    avisouPerto.current = chave;
    vibrar();
    tocarAlarme(1);
  }, [perto, atual?.id, fase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const liberar = () => desbloquearAudio();
    window.addEventListener('pointerdown', liberar, { once: true });
    return () => window.removeEventListener('pointerdown', liberar);
  }, []);
  // Ao voltar do Waze/Maps: atualiza a corrida e a posição na hora, para o botão "Cheguei" já aparecer.
  useEffect(() => {
    if (!atual) return undefined;
    const volta = () => {
      if (document.visibilityState !== 'visible') return;
      recarregar().catch(() => {});
      navigator.geolocation?.getCurrentPosition((r) => setMinhaPos({ lat: r.coords.latitude, lng: r.coords.longitude }), () => {}, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
    };
    document.addEventListener('visibilitychange', volta);
    return () => document.removeEventListener('visibilitychange', volta);
  }, [atual?.id, recarregar]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Som e vibração da oferta de corrida (o navegador só libera o som depois de um toque) ----
  const liberarSom = useCallback(() => {
    try {
      if (!audio.current) audio.current = new (window.AudioContext || window.webkitAudioContext)();
      audio.current.resume?.();
    } catch {}
  }, []);
  useEffect(() => {
    document.addEventListener('pointerdown', liberarSom, { once: true });
    return () => document.removeEventListener('pointerdown', liberarSom);
  }, [liberarSom]);
  function tocarOferta() {
    try {
      const ctx = audio.current;
      if (ctx) {
        [0, 0.35, 0.7].forEach((t) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = 880;
          g.gain.value = 0.25;
          o.connect(g);
          g.connect(ctx.destination);
          o.start(ctx.currentTime + t);
          o.stop(ctx.currentTime + t + 0.22);
        });
      }
      navigator.vibrate?.([300, 150, 300]);
    } catch {}
  }

  // ---- Oferta de corrida em cartão grande, com contagem regressiva ----
  const candidata = ent.online && !(!ent.exclusivo && !ent.aprovado) ? corridas.find((p) => !tratadas.has(p.id)) : null;
  useEffect(() => {
    if (candidata && (!oferta || oferta.id !== candidata.id)) {
      setOferta({ id: candidata.id, ate: Date.now() + SEGUNDOS_OFERTA * 1000 });
      setRestante(SEGUNDOS_OFERTA);
      tocarOferta();
    } else if (!candidata && oferta) setOferta(null);
  }, [candidata?.id]);

  const responder = useCallback((id, resposta) => {
    setTratadas((prev) => new Set(prev).add(id));
    setOferta(null);
    api('/api/entrega/oferta', { metodo: 'POST', corpo: { pedido_id: id, resposta } }).then(() => resposta === 'recusada' && recarregar()).catch(() => {});
  }, [recarregar]);

  useEffect(() => {
    if (!oferta) return undefined;
    const id = setInterval(() => {
      const r = Math.ceil((oferta.ate - Date.now()) / 1000);
      setRestante(Math.max(0, r));
      if (r <= 0) responder(oferta.id, 'expirada');
    }, 250);
    return () => clearInterval(id);
  }, [oferta, responder]);

  // Quando uma entrega começa, abre o painel para mostrar o que fazer.
  const qtdAtivas = ativas.length;
  useEffect(() => {
    if (qtdAtivas > 0) setAberto(true);
  }, [qtdAtivas]);

  const ind = dados.indicadores || {};
  const pendencias = dados.pendencias || [];
  // Entregador da plataforma tira uma selfie ao vivo uma vez por dia antes de ficar online.
  const ligar = async () => {
    liberarSom();
    if (!ent.exclusivo) {
      try {
        const r = await api('/api/entrega/selfie-dia');
        if (r.necessaria && !r.feita) return setSelfie(true);
      } catch {}
    }
    alternarOnline();
  };

  const semAprovacao = !ent.exclusivo && !ent.aprovado;
  const docs = ent.docs_status;
  const precisaDocs = !ent.exclusivo && docs !== 'aprovado';
  const primeiro = ent.nome.split(' ')[0];
  const irPara = (t) => { setTela(t); setMenu(false); };
  const saldoTxt = conta.saldo < 0 ? `− ${brl(-conta.saldo)}` : brl(conta.saldo);

  const pontosMapa = [];
  if (minhaPos) pontosMapa.push({ id: 'voce', tipo: 'moto', lat: minhaPos.lat, lng: minhaPos.lng, rotulo: 'Você' });
  if (ent.online) {
    corridas.forEach((p) => {
      const l = p.dl_lojas;
      if (l && Number.isFinite(l.lat)) pontosMapa.push({ id: `l-${p.id}`, tipo: 'loja', lat: l.lat, lng: l.lng, rotulo: `${l.nome} · ${brl(p.frete_entregador ?? p.taxa_entrega)}` });
    });
  }


  const pOf = oferta ? corridas.find((p) => p.id === oferta.id) : null;
  const ofertaUI = pOf && (
    <div className="ent-oferta-fundo" role="alertdialog" aria-label="Nova corrida" aria-live="assertive">
      <div className="ent-oferta">
        <div className="ent-linha">
          <strong style={{ fontSize: 18 }}>Nova corrida</strong>
          <span className="ent-contagem">{restante}s</span>
        </div>
        <div className="ent-oferta-valor">{brl(pOf.frete_entregador ?? pOf.taxa_entrega)}</div>
        <div className="ent-oferta-barra"><div style={{ width: `${(restante / SEGUNDOS_OFERTA) * 100}%` }} /></div>
        <div style={{ display: 'grid', gap: 4 }}>
          <strong style={{ fontSize: 18 }}>{pOf.dl_lojas?.nome}</strong>
          <span className="muted">Retirar: {[pOf.dl_lojas?.endereco, pOf.dl_lojas?.bairro].filter(Boolean).join(', ')}</span>
          {pOf.distancia_m != null && <span><Icone nome="loja" tam={17} style={{ verticalAlign: '-3px' }} /> A {textoDistancia(pOf.distancia_m)} da loja · cerca de {textoTempo(pOf.tempo_s)} até lá</span>}
          <span className="muted">Entregar no bairro: {pOf.bairro || 'informado após aceitar'}</span>
        </div>
        <button type="button" className="btn btn-primario ent-grande" disabled={ocupado} onClick={() => { setTratadas((x) => new Set(x).add(pOf.id)); setOferta(null); setAberto(true); aceitar(pOf.id); }}>
          Aceitar corrida
        </button>
        <button type="button" className="btn" style={{ width: '100%', padding: 14 }} onClick={() => responder(pOf.id, 'recusada')}>
          Recusar
        </button>
      </div>
    </div>
  );

  const livreSaque = conta.saldo >= 10;
  const Linha = ({ icone, texto, direita, onClick, href, alerta }) => {
    const conteudo = (
      <>
        <span className="ent-menu-ico"><Icone nome={icone} tam={22} /></span>
        <span className="ent-menu-txt">{texto}</span>
        {direita}
        {alerta && <span className="ent-ponto-fixo" aria-label="Requer atenção" />}
        <Icone nome="direita" tam={18} className="ent-menu-seta" />
      </>
    );
    return href ? (
      <a className="ent-menu-linha" href={href} target="_blank" rel="noopener noreferrer">{conteudo}</a>
    ) : (
      <button type="button" className="ent-menu-linha" onClick={onClick}>{conteudo}</button>
    );
  };
  const gaveta = menu && (
    <nav className="ent-menu" aria-label="Menu do entregador">
      <div className="ent-menu-topo">
        <button type="button" className="ent-redondo" aria-label="Fechar menu" onClick={() => setMenu(false)}><Icone nome="voltar" /></button>
        <Marca href="/entregador" />
        <span style={{ width: 46 }} />
      </div>
      <div className="ent-menu-corpo">
        <div className="ent-perfil">
          <span className="ent-avatar" aria-hidden="true">{ent.nome.trim().charAt(0).toUpperCase()}</span>
          <div style={{ minWidth: 0 }}>
            <strong style={{ fontSize: 19, display: 'block' }}>{ent.nome}</strong>
            <span className="muted" style={{ fontSize: 14 }}>{VEICULOS[ent.veiculo]} · {ent.exclusivo ? `Loja ${ent.loja_nome || ''}` : 'Plataforma'}</span>
          </div>
        </div>
        <div className="ent-indic">
          <div><span className="muted">Taxa de aceitação</span><strong>{ind.aceitacao != null ? `${ind.aceitacao}%` : '—'}</strong></div>
          <div><span className="muted">Taxa de finalização</span><strong>{ind.finalizacao != null ? `${ind.finalizacao}%` : '—'}</strong></div>
        </div>
        <div className="ent-menu-lista">
          <Linha icone="ganhos" texto="Ganhos" direita={<span className="muted">{saldoTxt}</span>} onClick={() => irPara('ganhos')} />
          <Linha icone="carteira" texto="Sacar saldo" direita={livreSaque ? <span className="ent-etiqueta">{brl(conta.saldo)}</span> : null} onClick={() => irPara('ganhos')} />
          {!ent.exclusivo && (
            <Linha icone="docs" texto="Documentos" alerta={docs !== 'aprovado' && docs !== 'em_analise'} direita={docs !== 'aprovado' ? <span className="ent-etiqueta">{docs === 'em_analise' ? 'Em análise' : docs === 'reprovado' ? 'Corrigir' : 'Enviar'}</span> : <Icone nome="ok" tam={18} className="ent-verde" />} onClick={() => irPara('documentos')} />
          )}
          <Linha icone="perfil" texto="Perfil" onClick={() => irPara('perfil')} />
          <Linha icone="suporte" texto="Suporte e ajuda" href={linkSuporte({ papel: 'entregador' })} />
          <Linha icone="ajustes" texto="Configurações" onClick={() => irPara('config')} />
          <Linha icone="sair" texto="Sair" onClick={aoSair} />
        </div>
      </div>
    </nav>
  );

  if (tela !== 'mapa') {
    const titulos = { ganhos: 'Ganhos', documentos: 'Documentos', perfil: 'Perfil', config: 'Configurações' };
    return (
      <>
        {gaveta}
        {ofertaUI}
        <div className="ent-tela-topo">
          <button type="button" className="ent-redondo" aria-label="Voltar" onClick={() => setTela('mapa')}><Icone nome="voltar" /></button>
          <h1>{titulos[tela]}</h1>
        </div>
        <div className="ent-tela">
          {tela === 'ganhos' && (
            <>
              <div className="ent-bloco">
                <span className="muted">{conta.saldo < 0 ? 'Você deve à plataforma' : 'A receber da plataforma'}</span>
                <strong style={{ fontSize: 34, color: conta.saldo < 0 ? '#ff8f86' : undefined }}>{saldoTxt}</strong>
                <small>
                  Pix e cartão pelo app: o ganho da entrega (já descontada a taxa da plataforma) entra aqui e você pode sacar por Pix quando quiser, a partir de R$ 10,00. Pagamento em dinheiro: o dinheiro fica com você e a taxa da plataforma (R$ 0,60 por entrega) entra aqui como valor a pagar. Os dois se compensam.
                </small>
              </div>
              <SaqueSaldo conta="entregador" chave={conta.chave_pix} aoMudar={recarregar} />
              <div className="ent-bloco">
                <strong>Últimos lançamentos</strong>
                {conta.extrato.length === 0 && <span className="muted">Nada por aqui ainda. Suas entregas aparecem nesta lista.</span>}
                {conta.extrato.map((l) => (
                  <div key={l.id} className="ent-linha">
                    <span>{l.descricao || l.tipo}</span>
                    <strong>{Number(l.valor) < 0 ? `− ${brl(-Number(l.valor))}` : `+ ${brl(l.valor)}`}</strong>
                  </div>
                ))}
              </div>
              <div className="ent-bloco">
                <label htmlFor="chave-pix-e"><strong>Sua chave Pix para receber</strong></label>
                <input id="chave-pix-e" className="input" maxLength={140} placeholder="CPF, e-mail, telefone ou chave aleatória" value={chave} onChange={(e) => setChave(e.target.value)} />
                <button type="button" className="btn btn-primario" onClick={salvarChave} disabled={ocupado || chave.trim() === (conta.chave_pix || '')}>Salvar chave</button>
                {erro && <div className="aviso aviso-erro" role="alert">{erro}</div>}
              </div>
            </>
          )}
          {tela === 'documentos' && (
            <Documentos veiculo={ent.veiculo} aoMudar={recarregar} />
          )}
          {tela === 'perfil' && (
            <div className="ent-bloco">
              <div className="ent-linha"><span className="muted">Nome</span><strong>{ent.nome}</strong></div>
              <div className="ent-linha"><span className="muted">Veículo</span><strong>{VEICULOS[ent.veiculo]}</strong></div>
              <div className="ent-linha"><span className="muted">Tipo</span><strong>{ent.exclusivo ? `Da loja ${ent.loja_nome || ''}` : 'Da plataforma'}</strong></div>
              {!ent.exclusivo && <div className="ent-linha"><span className="muted">Documentos</span><strong>{docs === 'aprovado' ? 'Aprovados' : docs === 'em_analise' ? 'Em análise' : docs === 'reprovado' ? 'Recusados' : 'Não enviados'}</strong></div>}
              <small>Para mudar nome, telefone ou veículo, fale com o suporte.</small>
              <a className="btn" href={linkSuporte({ papel: 'entregador' })} target="_blank" rel="noopener noreferrer"><Icone nome="suporte" tam={18} /> Falar com o suporte</a>
              <button type="button" className="btn" onClick={aoSair}><Icone nome="sair" tam={18} /> Sair da conta</button>
            </div>
          )}
          {tela === 'config' && (
            <>
              <AvisosPush
                titulo="Avisos de corrida nova"
                descricao="Receba um alerta no celular quando uma loja chamar um entregador, mesmo com o site fechado."
                inscrever={(subscription) => api('/api/push/inscrever', { metodo: 'POST', corpo: { subscription } })}
                desinscrever={(endpoint) => api('/api/push/inscrever', { metodo: 'DELETE', corpo: { endpoint } })}
              />
              <div className="ent-bloco">
                <strong>Privacidade</strong>
                <small>Sua localização só é enviada ao cliente e à loja enquanto você está com um pedido na mão. Fora disso ela fica só no seu aparelho.</small>
                <a href="/privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a>
              </div>
              <button type="button" className="btn" onClick={aoSair}><Icone nome="sair" tam={18} /> Sair da conta</button>
              <ExcluirConta />
            </>
          )}
        </div>
      </>
    );
  }

  const textoStatus = precisaDocs
    ? docs === 'em_analise'
      ? 'Documentos em análise'
      : docs === 'reprovado'
      ? 'Documentos recusados'
      : 'Envie seus documentos'
    : ativas.length > 0
    ? `${ativas.length} entrega${ativas.length > 1 ? 's' : ''} em andamento`
    : ent.online
    ? 'Online · procurando corridas…'
    : `Olá, ${primeiro}. Você está offline`;
  const pendenciasAbertas = pendencias.filter((x) => !(x.id === 'docs' && docs === 'em_analise'));

  return (
    <div className="ent-cheia">
      {gaveta}
      {selfie && <SelfieDia aoCancelar={() => setSelfie(false)} aoConcluir={async () => { setSelfie(false); await alternarOnline(); }} />}
      {ofertaUI}
      <Mapa pontos={pontosMapa} altura={altMapa} rotuloMapa="Mapa com a sua posição e as lojas com corrida" />
      <div className="ent-topo">
        <button type="button" className="ent-redondo" aria-label="Abrir menu" onClick={() => setMenu(true)}>
          <Icone nome="menu" />
          {pendenciasAbertas.length > 0 && <span className="ent-ponto" />}
        </button>
        <div className="ent-centro">
          <button type="button" className={conta.saldo < 0 ? 'ent-saldo neg' : 'ent-saldo'} onClick={() => setTela('ganhos')} aria-label={`Saldo ${saldoTxt}. Abrir ganhos`}>
            {saldoTxt}
            <Icone nome="baixo" tam={18} />
          </button>
          {livreSaque && (
            <button type="button" className="ent-chip ent-chip-roxo" onClick={() => setTela('ganhos')}>
              <Icone nome="carteira" tam={16} /> Sacar saldo <Icone nome="direita" tam={14} />
            </button>
          )}
          {!precisaDocs && (
            <span className={ent.online ? 'ent-chip ent-chip-on' : 'ent-chip'}>
              <span className="ent-bolinha" /> {ent.online ? 'Online' : 'Offline'}
            </span>
          )}
        </div>
        <a className="ent-redondo" aria-label="Suporte e ajuda" href={linkSuporte({ papel: 'entregador' })} target="_blank" rel="noopener noreferrer"><Icone nome="suporte" /></a>
      </div>

      <div className={aberto ? 'ent-gav ent-gav-aberta' : 'ent-gav'}>
        <button type="button" className="ent-alca" aria-expanded={aberto} aria-label={aberto ? 'Recolher painel' : 'Expandir painel'} onClick={() => setAberto((x) => !x)}>
          <span className="ent-alca-barra" />
        </button>
        {!aberto && pendenciasAbertas[0] && (
          <div className="ent-cartao-pend">
            <Icone nome="alerta" tam={22} className="ent-amarelo" />
            <span style={{ flex: 1 }}>{pendenciasAbertas[0].texto}</span>
            <button type="button" className="btn btn-pequeno" onClick={() => setTela(pendenciasAbertas[0].tela)}>{pendenciasAbertas[0].acao}</button>
          </div>
        )}
        {!aberto && !pendenciasAbertas[0] && <div className="ent-status-linha">{textoStatus}</div>}

        {aberto && (
          <div className="ent-gav-corpo">
            <div className="ent-indic">
              <div>
                <span className="muted">Taxa de aceitação</span>
                <strong>{ind.aceitacao != null ? `${ind.aceitacao}%` : '—'}</strong>
              </div>
              <div>
                <span className="muted">Taxa de finalização</span>
                <strong>{ind.finalizacao != null ? `${ind.finalizacao}%` : '—'}</strong>
              </div>
            </div>
            {(ind.aceitacao == null || ind.finalizacao == null) && <small>Os indicadores aparecem depois de algumas corridas.</small>}

            {pendenciasAbertas.map((x) => (
              <div key={x.id} className="ent-aviso ent-linha">
                <span style={{ flex: 1 }}>{x.texto}</span>
                <button type="button" className="btn btn-pequeno" onClick={() => setTela(x.tela)}>{x.acao}</button>
              </div>
            ))}

            {levando && <div className="aviso" role="status">Sua localização está sendo compartilhada com o cliente e com a loja. Mantenha esta tela aberta até entregar.</div>}
            {gpsErro && <div className="aviso aviso-erro" role="alert">{gpsErro}</div>}
            {erro && <div className="aviso aviso-erro" role="alert">{erro}</div>}

            {ativas.map((p) => (
              <CartaoEntrega key={p.id} p={p} posicao={posicao} onAcao={acao} onChegada={chegada} onChegadaCliente={chegadaCliente} onEntregar={entregar} onFoto={foto} ocupado={ocupado} />
            ))}

            {ent.online && !semAprovacao && (
              <section aria-label="Corridas disponíveis" style={{ display: 'grid', gap: 10 }}>
                <strong>Corridas disponíveis</strong>
                {semGps && disponiveis.length > 0 && (
                  <small>Libere o GPS do navegador para ver a distância até a loja. Sua localização não é enviada: ela só é usada nesta tela.</small>
                )}
                {disponiveis.length === 0 ? (
                  <span className="muted">Nenhuma corrida agora. Quando chegar uma, ela aparece em tela cheia com som.</span>
                ) : (
                  corridas.map((p) => (
                    <div key={p.id} className="ent-bloco">
                      <div className="ent-linha">
                        <strong>{p.dl_lojas?.nome} · pedido {p.numero}</strong>
                        <strong style={{ color: 'var(--amarelo)', fontSize: 18 }}>{brl(p.frete_entregador ?? p.taxa_entrega)}</strong>
                      </div>
                      <small>
                        Retirar: {[p.dl_lojas?.endereco, p.dl_lojas?.bairro].filter(Boolean).join(', ')}
                        <br />
                        Entregar no bairro: {p.bairro || 'informado após aceitar'}
                      </small>
                      {p.distancia_m != null && <div style={{ fontSize: 14, fontWeight: 600 }}><Icone nome="loja" tam={17} style={{ verticalAlign: '-3px' }} /> A {textoDistancia(p.distancia_m)} da loja · cerca de {textoTempo(p.tempo_s)} até lá</div>}
                      <button type="button" className="btn btn-primario" disabled={ocupado} onClick={() => aceitar(p.id)}>Aceitar corrida</button>
                    </div>
                  ))
                )}
              </section>
            )}
          </div>
        )}

        {perto && (
          <div className="ent-chegou" role="alert">
            <strong>📍 {fase === 'cliente' ? 'Você chegou no cliente' : `Você chegou na loja ${atual.dl_lojas?.nome || ''}`}</strong>
            <button type="button" className="ent-pilula" disabled={ocupado} onClick={() => (fase === 'cliente' ? chegadaCliente(atual.id) : chegada(atual.id))}>
              {fase === 'cliente' ? 'Cheguei no cliente' : 'Cheguei na loja'}
            </button>
          </div>
        )}
        <div className="ent-barra">
          <button type="button" className="ent-redondo ent-redondo-g" aria-label="Configurações" onClick={() => setTela('config')}><Icone nome="ajustes" /></button>
          {precisaDocs ? (
            <button type="button" className={docs === 'em_analise' ? 'ent-pilula ent-pilula-sec' : 'ent-pilula'} onClick={() => setTela('documentos')}>
              {docs === 'em_analise' ? 'Ver meus documentos' : docs === 'reprovado' ? 'Corrigir documentos' : 'Enviar documentos'}
            </button>
          ) : (
            <button
              type="button"
              className={ent.online ? 'ent-pilula ent-pilula-sec' : 'ent-pilula'}
              onClick={ent.online ? () => (ativas.length === 0 || window.confirm('Ao se desconectar você deixa de receber novas corridas. As que já aceitou continuam.')) && alternarOnline() : ligar}
              disabled={ocupado}
              aria-pressed={ent.online}
            >
              {ent.online ? 'Desconectar' : 'Conectar'}
            </button>
          )}
          <button type="button" className="ent-redondo ent-redondo-g" aria-label="Ganhos e extrato" onClick={() => setTela('ganhos')}><Icone nome="lista" /></button>
        </div>
      </div>
    </div>
  );
}

export default function AreaEntregador() {
  const auth = useSession();
  const [dados, setDados] = useState(undefined); // undefined carregando | null precisa cadastrar | objeto
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      setDados(await api('/api/entrega/painel'));
      setErro('');
    } catch (e) {
      if (e.status === 404 && e.dados?.cadastrar) setDados(null);
      else setErro(e.message);
    }
  }, []);

  useEffect(() => {
    if (auth.status === 'in') carregar();
  }, [auth.status, carregar]);

  useEffect(() => {
    if (auth.status !== 'in' || !dados) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') carregar();
    }, 7000);
    return () => clearInterval(id);
  }, [auth.status, dados, carregar]);

  const painel = auth.status === 'in' && dados;
  return (
    <div className="ent">
      {painel ? (
        <Painel dados={dados} recarregar={carregar} aoSair={sair} />
      ) : (
        <main className="ent-pagina">
          <Marca href="/entregador" />
          <h1 style={{ margin: 0, color: 'var(--e-texto)', fontSize: 26 }}>Área do entregador</h1>
          {auth.status === 'off' && <div className="aviso aviso-erro" role="alert">O login ainda não foi configurado neste site.</div>}
          {auth.status === 'out' && (
            <section className="cartao">
              <h2>Entre para fazer entregas</h2>
              <p className="muted" style={{ margin: 0 }}>
                Use sua conta Google. Você escolhe quando ficar online e só compartilha a localização enquanto estiver com um pedido na mão.
              </p>
              <button type="button" className="btn btn-primario" onClick={() => entrarComGoogle('/entregador')}>Entrar com Google</button>
              <BotaoApple destino="/entregador" />
            </section>
          )}
          {auth.status === 'in' && erro && !dados && <div className="aviso aviso-erro" role="alert">{erro}</div>}
          {auth.status === 'in' && dados === null && (
            <>
              <Cadastro aoConcluir={carregar} />
              <button type="button" className="btn" onClick={sair}>Sair</button>
            </>
          )}
        </main>
      )}
    </div>
  );
}
