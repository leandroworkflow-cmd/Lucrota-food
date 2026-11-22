'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, apiEnviar } from '../../lib/api-cliente';
import { ROTULO_DOC } from '../../lib/documentos';
import { prepararDocumento } from '../../lib/imagem';
import { Icone } from '../../components/Icones';

const CATEGORIAS = ['A', 'AB', 'B', 'AC', 'AD', 'AE', 'C', 'D', 'E'];
const AJUDA = {
  cnh: 'Foto da frente da CNH aberta, sem reflexo, com todo o texto legível. Pode ser a CNH Digital impressa ou a tela do app, desde que apareça inteira.',
  crlv: 'Foto do documento do veículo (CRLV) com a placa e o nome do proprietário legíveis.',
  selfie: 'Tire agora uma selfie de frente, com o rosto inteiro, sem óculos escuros nem boné e com boa luz. Ela não pode ser uma foto da galeria.',
};

// Selfie ao vivo: abre a câmera frontal e só aceita foto tirada na hora (nada de galeria).
function SelfieAoVivo({ aoCapturar, aoCancelar }) {
  const video = useRef(null);
  const stream = useRef(null);
  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } }, audio: false });
        if (!vivo) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        video.current.srcObject = s;
        await video.current.play();
        setPronto(true);
      } catch {
        setErro('Não consegui abrir a câmera. Permita o uso da câmera para este site e tente de novo.');
      }
    })();
    return () => {
      vivo = false;
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function tirar() {
    const v = video.current;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob((b) => b && aoCapturar(b), 'image/jpeg', 0.9);
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {erro ? (
        <div className="aviso aviso-erro" role="alert">{erro}</div>
      ) : (
        <video ref={video} playsInline muted style={{ width: '100%', borderRadius: 14, background: '#000', transform: 'scaleX(-1)' }} />
      )}
      <div className="opcoes">
        <button type="button" className="btn btn-primario" disabled={!pronto} onClick={tirar}>Tirar selfie</button>
        <button type="button" className="btn" onClick={aoCancelar}>Cancelar</button>
      </div>
    </div>
  );
}

function EtapaFoto({ tipo, enviado, bloqueado, aoEnviar }) {
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [camera, setCamera] = useState(false);

  async function enviar(blobOuArquivo) {
    setOcupado(true);
    setMsg('');
    try {
      const blob = blobOuArquivo.type === 'image/jpeg' && tipo === 'selfie' ? blobOuArquivo : await prepararDocumento(blobOuArquivo);
      const f = new FormData();
      f.append('tipo', tipo);
      f.append('arquivo', blob, `${tipo}.jpg`);
      await apiEnviar('/api/entrega/documentos', f);
      setCamera(false);
      await aoEnviar();
    } catch (e) {
      setMsg(e.message);
    }
    setOcupado(false);
  }

  return (
    <div className="ent-bloco">
      <div className="ent-linha">
        <strong>{ROTULO_DOC[tipo]}</strong>
        <span className={enviado ? 'ent-ok' : 'ent-pend'}>{enviado ? <><Icone nome="ok" tam={16} style={{ verticalAlign: '-3px' }} /> Enviado</> : 'Falta enviar'}</span>
      </div>
      <small>{AJUDA[tipo]}</small>
      {camera ? (
        <SelfieAoVivo aoCapturar={enviar} aoCancelar={() => setCamera(false)} />
      ) : (
        !bloqueado && (
          <div className="opcoes">
            {tipo === 'selfie' ? (
              <button type="button" className="btn btn-pequeno" disabled={ocupado} onClick={() => setCamera(true)}>
                {enviado ? 'Tirar outra' : 'Abrir câmera'}
              </button>
            ) : (
              <label className="btn btn-pequeno" style={{ cursor: 'pointer' }}>
                {ocupado ? 'Enviando…' : enviado ? 'Trocar foto' : 'Tirar ou escolher foto'}
                <input type="file" accept="image/*" capture="environment" hidden disabled={ocupado} onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])} />
              </label>
            )}
          </div>
        )
      )}
      {msg && <div className="aviso aviso-erro" role="alert">{msg}</div>}
    </div>
  );
}

export default function Documentos({ veiculo, aoMudar }) {
  const [s, setS] = useState(null);
  const [erro, setErro] = useState('');
  const [f, setF] = useState({ cnh_nome: '', cnh_validade: '', cnh_categoria: veiculo === 'carro' ? 'B' : 'A', placa: '' });
  const [aceite, setAceite] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await api('/api/entrega/documentos');
      setS(r);
      if (r.dados?.cnh_nome) setF((x) => ({ ...x, ...Object.fromEntries(Object.entries(r.dados).filter(([, v]) => v)) }));
    } catch (e) {
      setErro(e.message);
    }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  if (erro) return <div className="aviso aviso-erro">{erro}</div>;
  if (!s) return <p>Carregando…</p>;
  if (!s.obrigatorio) return <div className="ent-bloco">Você é entregador de uma loja e não precisa enviar documentos.</div>;

  const motorizado = s.exigidos.includes('cnh');
  const completo = s.exigidos.every((t) => s.enviados.includes(t));
  const travado = s.status === 'em_analise' || s.status === 'aprovado';
  const campo = (n) => (e) => setF((x) => ({ ...x, [n]: e.target.value }));

  async function concluir(ev) {
    ev.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      await api('/api/entrega/documentos/enviar', { metodo: 'POST', corpo: { ...f, consentimento: aceite } });
      await carregar();
      await aoMudar?.();
    } catch (e) {
      setErro(e.message);
    }
    setEnviando(false);
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {s.status === 'aprovado' && <div className="ent-aviso ent-aviso-ok"><Icone nome="ok" tam={18} style={{ verticalAlign: '-3px' }} /> Documentos aprovados. Você já pode receber corridas.</div>}
      {s.status === 'em_analise' && <div className="ent-aviso"><Icone nome="relogio" tam={18} style={{ verticalAlign: '-3px' }} /> Documentos em análise. Avisamos por notificação assim que houver resposta.</div>}
      {s.status === 'reprovado' && (
        <div className="ent-aviso ent-aviso-erro">
          Documentos recusados{s.motivo ? `: ${s.motivo}` : '.'} Corrija e envie de novo.
        </div>
      )}
      {s.status === 'sem_documentos' && <p style={{ margin: 0 }}>Para receber corridas pela plataforma, enviamos seus documentos para conferência. Só a nossa equipe vê essas fotos.</p>}

      {s.exigidos.map((t) => (
        <EtapaFoto key={t} tipo={t} enviado={s.enviados.includes(t)} bloqueado={travado} aoEnviar={carregar} />
      ))}

      {!travado && (
        <form onSubmit={concluir} style={{ display: 'grid', gap: 10 }}>
          {motorizado && (
            <>
              <div className="campo">
                <label htmlFor="d-nome">Nome completo, como está na CNH</label>
                <input id="d-nome" className="input" required maxLength={80} value={f.cnh_nome} onChange={campo('cnh_nome')} />
              </div>
              <div className="linha-campos">
                <div className="campo">
                  <label htmlFor="d-val">Validade da CNH</label>
                  <input id="d-val" className="input" required type="date" value={f.cnh_validade || ''} onChange={campo('cnh_validade')} />
                </div>
                <div className="campo">
                  <label htmlFor="d-cat">Categoria</label>
                  <select id="d-cat" className="input" value={f.cnh_categoria} onChange={campo('cnh_categoria')}>
                    {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="campo">
                <label htmlFor="d-placa">Placa do veículo</label>
                <input id="d-placa" className="input" required maxLength={8} placeholder="ABC1D23" value={f.placa || ''} onChange={(e) => setF((x) => ({ ...x, placa: e.target.value.toUpperCase() }))} />
              </div>
            </>
          )}
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14 }}>
            <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} style={{ marginTop: 4 }} />
            <span>
              Concordo em enviar meus documentos e minha selfie para conferência de identidade. Eles ficam em área privada, só a equipe vê, e são usados apenas para aprovar meu cadastro. Veja a{' '}
              <a href="/privacidade" target="_blank" rel="noreferrer">Política de Privacidade</a>.
            </span>
          </label>
          {erro && <div className="aviso aviso-erro" role="alert">{erro}</div>}
          <button type="submit" className="btn btn-primario" disabled={enviando || !completo || !aceite}>
            {enviando ? 'Enviando…' : 'Enviar para análise'}
          </button>
          {!completo && <small>Envie todas as fotos acima para liberar o botão.</small>}
        </form>
      )}
    </div>
  );
}
