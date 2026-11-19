'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AvisosPush from '../../components/AvisosPush';
import Mapa from '../../components/Mapa';
import Marca from '../../components/Marca';
import { api } from '../../lib/api-cliente';
import { entrarComGoogle, sair, useSession } from '../../lib/auth';
import { VEICULOS } from '../../lib/entrega';
import { brl } from '../../lib/format';
import { FORMAS } from '../../lib/pedido';
import { linkGoogleMaps, linkWaze } from '../../lib/geo';
import { supabase } from '../../lib/supabase';

function Cabecalho({ onSair }) {
  return (
    <header className="topo-app" style={{ paddingBottom: 14 }}>
      <div className="pagina">
        <div className="topo-linha">
          <Marca href="/entregador" />
          {onSair && (
            <button type="button" className="topo-pill" style={{ background: 'none', cursor: 'pointer', font: 'inherit' }} onClick={onSair}>
              Sair
            </button>
          )}
        </div>
        <h1 className="titulo-topo">Área do entregador</h1>
      </div>
    </header>
  );
}

function Cadastro({ aoConcluir }) {
  const [f, setF] = useState({ nome: '', telefone: '', veiculo: 'moto', codigo: '' });
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
        <label htmlFor="e-cod">Código da loja (opcional)</label>
        <input id="e-cod" className="input" maxLength={6} placeholder="Ex.: A1B2C3" value={f.codigo} onChange={(e) => setF((x) => ({ ...x, codigo: e.target.value.toUpperCase() }))} />
        <small>
          Se uma loja te convidou, digite o código dela: você faz só as entregas dessa loja e já entra liberado. Sem código, você entra na plataforma e
          começa a receber corridas depois que a gente aprovar o seu cadastro.
        </small>
      </div>
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

function CartaoEntrega({ p, posicao, onAcao, ocupado }) {
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

      <div className="opcoes">
        {saiu ? (
          <button type="button" className="btn btn-primario" disabled={ocupado} onClick={() => onAcao(p.id, 'entreguei')}>
            Entreguei
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-primario" disabled={ocupado} onClick={() => onAcao(p.id, 'coletei')}>
              Peguei o pedido
            </button>
            <button type="button" className="btn btn-pequeno" disabled={ocupado} onClick={() => window.confirm('Devolver essa corrida para outros entregadores?') && onAcao(p.id, 'desistir')}>
              Desistir
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function Painel({ dados, recarregar }) {
  const { entregador: ent, ativas, disponiveis, conta } = dados;
  const [chave, setChave] = useState(conta.chave_pix || '');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [posicao, setPosicao] = useState(null);
  const [gpsErro, setGpsErro] = useState('');
  const ultimoEnvio = useRef(0);

  const levando = ativas.some((p) => p.status === 'saiu');

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
  const aceitar = (id) => executar(() => api('/api/entrega/aceitar', { metodo: 'POST', corpo: { pedido_id: id } }));
  const salvarChave = () =>
    executar(async () => {
      const { error } = await supabase.from('dl_entregadores').update({ chave_pix: chave.trim() || null }).eq('id', ent.id);
      if (error) throw new Error('Não consegui salvar a chave Pix. Rode o SQL 07 no Supabase.');
    });
  const alternarOnline = () =>
    executar(async () => {
      const { error } = await supabase.from('dl_entregadores').update({ online: !ent.online }).eq('id', ent.id);
      if (error) throw new Error('Não consegui mudar seu status.');
    });

  // GPS: só compartilha a localização enquanto você está com um pedido na mão.
  useEffect(() => {
    if (!levando) {
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
  }, [levando, ent.id]);

  const semAprovacao = !ent.exclusivo && !ent.aprovado;

  return (
    <>
      <section className="cartao">
        <div className="painel-topo-linha">
          <div>
            <h2 style={{ margin: 0 }}>Olá, {ent.nome.split(' ')[0]}</h2>
            <span className="muted">
              {VEICULOS[ent.veiculo]} · {ent.exclusivo ? `Entregador da loja ${ent.loja_nome || ''}` : 'Entregador da plataforma'}
            </span>
          </div>
          <button type="button" className={ent.online ? 'btn btn-pequeno btn-primario' : 'btn btn-pequeno'} onClick={alternarOnline} disabled={ocupado || semAprovacao} aria-pressed={ent.online}>
            {ent.online ? 'Online' : 'Offline'}
          </button>
        </div>
        {semAprovacao && (
          <div className="aviso" role="status">
            Seu cadastro está em análise. Assim que for aprovado, você começa a receber corridas.
          </div>
        )}
        {levando && (
          <div className="aviso" role="status">
            Sua localização está sendo compartilhada com o cliente e com a loja. Mantenha esta tela aberta até entregar.
          </div>
        )}
        {gpsErro && (
          <div className="aviso aviso-erro" role="alert">
            {gpsErro}
          </div>
        )}
        {erro && (
          <div className="aviso aviso-erro" role="alert">
            {erro}
          </div>
        )}
      </section>

      <section className="cartao" aria-label="Sua conta corrente">
        <h2>Sua conta</h2>
        <div
          className="entrega-info"
          style={{ color: conta.saldo < 0 ? '#b3261e' : undefined }}
        >
          <span>
            {conta.saldo < 0 ? 'Você deve à plataforma: ' : 'A receber da plataforma: '}
            <strong>{conta.saldo < 0 ? `− ${brl(-conta.saldo)}` : brl(conta.saldo)}</strong>
          </span>
        </div>
        <small className="muted">
          Pix pelo app: a taxa de entrega é repassada a você por Pix. Pagamento em dinheiro: o dinheiro fica com você e a parte da plataforma entra aqui como valor a pagar. Os dois se compensam.
        </small>
        {conta.extrato.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4, fontSize: 14 }}>
            {conta.extrato.map((l) => (
              <li key={l.id}>
                {l.descricao || l.tipo}: <strong>{Number(l.valor) < 0 ? `− ${brl(-Number(l.valor))}` : `+ ${brl(l.valor)}`}</strong>
              </li>
            ))}
          </ul>
        )}
        <div className="campo">
          <label htmlFor="chave-pix-e">Sua chave Pix para receber</label>
          <div className="opcoes">
            <input id="chave-pix-e" className="input" maxLength={140} placeholder="CPF, e-mail, telefone ou chave aleatória" value={chave} onChange={(e) => setChave(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
            <button type="button" className="btn btn-pequeno" onClick={salvarChave} disabled={ocupado || chave.trim() === (conta.chave_pix || '')}>
              Salvar
            </button>
          </div>
        </div>
      </section>

      <AvisosPush
        titulo="Avisos de corrida nova"
        descricao="Receba um alerta no celular quando uma loja chamar um entregador, mesmo com o site fechado."
        inscrever={(subscription) => api('/api/push/inscrever', { metodo: 'POST', corpo: { subscription } })}
        desinscrever={(endpoint) => api('/api/push/inscrever', { metodo: 'DELETE', corpo: { endpoint } })}
      />

      {ativas.map((p) => (
        <CartaoEntrega key={p.id} p={p} posicao={posicao} onAcao={acao} ocupado={ocupado} />
      ))}

      {ent.online && !semAprovacao && (
        <section className="cartao" aria-label="Corridas disponíveis">
          <h2>Corridas disponíveis</h2>
          {disponiveis.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              Nenhuma corrida agora. Esta tela atualiza sozinha.
            </p>
          ) : (
            disponiveis.map((p) => (
              <div key={p.id} className="produto-linha">
                <div>
                  <strong>
                    {p.dl_lojas?.nome} · pedido {p.numero}
                  </strong>
                  <div className="muted" style={{ fontSize: 14 }}>
                    Retirar: {[p.dl_lojas?.endereco, p.dl_lojas?.bairro].filter(Boolean).join(', ')}
                    <br />
                    Entregar no bairro: {p.bairro || 'informado após aceitar'}
                  </div>
                </div>
                <strong>{brl(p.taxa_entrega)}</strong>
                <div className="opcoes" style={{ gridColumn: '1 / -1' }}>
                  <button type="button" className="btn btn-pequeno btn-primario" disabled={ocupado} onClick={() => aceitar(p.id)}>
                    Aceitar corrida
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      )}
    </>
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

  return (
    <>
      <Cabecalho onSair={auth.status === 'in' ? sair : null} />
      <main className="pagina" style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 60 }}>
        {auth.status === 'off' && (
          <div className="aviso aviso-erro" role="alert">
            O login ainda não foi configurado neste site.
          </div>
        )}
        {auth.status === 'out' && (
          <section className="cartao">
            <h2>Entre para fazer entregas</h2>
            <p className="muted" style={{ margin: 0 }}>
              Use sua conta Google. Você escolhe quando ficar online e só compartilha a localização enquanto estiver com um pedido na mão.
            </p>
            <button type="button" className="btn btn-primario" onClick={() => entrarComGoogle('/entregador')}>
              Entrar com Google
            </button>
          </section>
        )}
        {auth.status === 'in' && erro && !dados && (
          <div className="aviso aviso-erro" role="alert">
            {erro}
          </div>
        )}
        {auth.status === 'in' && dados === null && <Cadastro aoConcluir={carregar} />}
        {auth.status === 'in' && dados && <Painel dados={dados} recarregar={carregar} />}
      </main>
    </>
  );
}
