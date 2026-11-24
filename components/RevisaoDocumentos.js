'use client';

import { useEffect, useState } from 'react';
import { api } from '../lib/api-cliente';
import { ROTULO_DOC } from '../lib/documentos';

const VEICULO = { moto: 'Moto', bicicleta: 'Bicicleta', carro: 'Carro', a_pe: 'A pé' };

// Conferência humana dos documentos: fotos lado a lado, dados digitados e alertas automáticos.
export default function RevisaoDocumentos({ id, nome, aoDecidir, aoFechar }) {
  const [d, setD] = useState(null);
  const [erro, setErro] = useState('');
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    api(`/api/admin/documentos?id=${id}`).then(setD).catch((e) => setErro(e.message));
  }, [id]);

  async function decidir(decisao) {
    setOcupado(true);
    setErro('');
    try {
      await api('/api/admin/acao', { metodo: 'POST', corpo: { acao: 'docs_decisao', id, decisao, motivo } });
      await aoDecidir(decisao === 'aprovar' ? `${nome} foi aprovado.` : `${nome} foi recusado e vai receber o motivo.`);
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  const ent = d?.entregador;
  const alertas = ent?.docs_analise?.alertas || [];
  const aguardando = ent?.docs_status === 'em_analise';
  return (
    <div className="cartao" style={{ borderColor: 'var(--roxo, #5a1a9a)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <h3 style={{ margin: 0 }}>Documentos de {nome}</h3>
        <button type="button" className="btn btn-pequeno" onClick={aoFechar}>Fechar</button>
      </div>
      {erro && <div className="aviso aviso-erro">{erro}</div>}
      {!d && !erro && <p className="muted">Carregando…</p>}
      {ent && (
        <>
          <p className="muted" style={{ margin: 0 }}>
            {VEICULO[ent.veiculo]} · {ent.telefone}{ent.cpf && <> · CPF: <b>{ent.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</b></>}{ent.endereco && <> · Endereço: {ent.endereco}</>}
            {ent.cnh_nome && <> · Nome na CNH: <b>{ent.cnh_nome}</b> · Validade {ent.cnh_validade?.split('-').reverse().join('/')} · Categoria {ent.cnh_categoria} · Placa <b>{ent.placa}</b></>}
          </p>
          {alertas.length > 0 ? (
            <div className="aviso aviso-erro">
              <b>Atenção:</b>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{alertas.map((a) => <li key={a}>{a}</li>)}</ul>
            </div>
          ) : (
            <div className="aviso">A conferência automática não achou problemas. Mesmo assim, confira as fotos.</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            {['selfie', 'cnh', 'crlv', 'comprovante'].filter((t) => d.links[t]).map((t) => (
              <figure key={t} style={{ margin: 0 }}>
                {d.pdfs?.[t] ? (
                  <a className="btn" href={d.links[t]} target="_blank" rel="noreferrer">Abrir o PDF da {ROTULO_DOC[t]}</a>
                ) : (
                  <a href={d.links[t]} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.links[t]} alt={ROTULO_DOC[t]} style={{ width: '100%', borderRadius: 10, border: '1px solid #ddd' }} />
                  </a>
                )}
                <figcaption className="muted" style={{ fontSize: 13 }}>{ROTULO_DOC[t]}</figcaption>
              </figure>
            ))}
          </div>
          {d.selfiesDia?.length > 0 && (
            <div style={{ display: 'grid', gap: 6 }}>
              <b>Selfies diárias (últimos dias)</b>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
                {d.selfiesDia.map((x) => (
                  <figure key={x.dia} style={{ margin: 0, flex: 'none', width: 120 }}>
                    <a href={x.url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={x.url} alt={`Selfie de ${x.dia}`} style={{ width: '100%', borderRadius: 10, border: '1px solid #ddd' }} />
                    </a>
                    <figcaption className="muted" style={{ fontSize: 12 }}>{x.dia.split('-').reverse().join('/')} {new Date(x.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}</figcaption>
                  </figure>
                ))}
              </div>
              <small className="muted">Compare com a selfie do cadastro e a foto da CNH. Se o rosto for outro, suspenda a conta na lista de entregadores.</small>
            </div>
          )}
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Confira: o rosto da selfie é o mesmo da foto da CNH; o nome e a validade batem com o digitado; a placa do documento do veículo é a digitada; o comprovante de residência está no nome do entregador (ou de um familiar) e bate com o endereço digitado. Os links das fotos expiram em 5 minutos.
          </p>
          {aguardando ? (
            <>
              <input className="campo" placeholder="Motivo (obrigatório para recusar; o entregador vê)" value={motivo} maxLength={200} onChange={(e) => setMotivo(e.target.value)} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-amarelo" disabled={ocupado} onClick={() => decidir('aprovar')}>Aprovar documentos</button>
                <button type="button" className="btn" disabled={ocupado || motivo.trim().length < 3} onClick={() => decidir('reprovar')}>Recusar</button>
              </div>
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Situação: {ent.docs_status === 'aprovado' ? 'aprovado' : ent.docs_status === 'reprovado' ? `recusado (${ent.docs_motivo})` : 'aguardando envio'}.</p>
          )}
        </>
      )}
    </div>
  );
}
