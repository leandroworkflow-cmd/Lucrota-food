'use client';

import { useId, useRef, useState } from 'react';
import { enviarImagem } from '../lib/imagem';

// Escolhe uma foto, reduz no celular, envia e devolve o endereço por onChange.
export default function CampoImagem({ rotulo, valor, onChange, userId, formato = 'quadrado', maxLado = 900 }) {
  const id = useId();
  const entrada = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  async function escolher(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setErro('');
    setEnviando(true);
    try {
      onChange(await enviarImagem(arquivo, userId, { maxLado }));
    } catch (err) {
      setErro(err.message || 'Não consegui enviar a foto.');
    }
    setEnviando(false);
  }

  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <div className="campo-img">
        <div className={`campo-img-previa ${formato}`}>
          {valor ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={valor} alt="" />
          ) : (
            <span aria-hidden="true">📷</span>
          )}
        </div>
        <div className="opcoes">
          <button type="button" className="btn btn-pequeno" disabled={enviando} onClick={() => entrada.current?.click()}>
            {enviando ? 'Enviando…' : valor ? 'Trocar foto' : 'Escolher foto'}
          </button>
          {valor && !enviando && (
            <button type="button" className="btn btn-pequeno" onClick={() => onChange('')}>
              Remover
            </button>
          )}
        </div>
        <input id={id} ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={escolher} />
      </div>
      {erro && (
        <small role="alert" style={{ color: 'var(--erro, #b3261e)' }}>
          {erro}
        </small>
      )}
    </div>
  );
}
