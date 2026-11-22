'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const CHAVE = 'broke-convites-v1';
const DIAS = 7;

// Lê/grava quando cada convite foi fechado (o armazenamento pode falhar; nesse caso o convite só some até recarregar).
function lerFechados() {
  try {
    const o = JSON.parse(localStorage.getItem(CHAVE) || '{}');
    const limite = Date.now() - DIAS * 86400000;
    return Object.keys(o).filter((k) => o[k] > limite);
  } catch {
    return [];
  }
}
function gravarFechado(id) {
  try {
    const o = JSON.parse(localStorage.getItem(CHAVE) || '{}');
    o[id] = Date.now();
    localStorage.setItem(CHAVE, JSON.stringify(o));
  } catch {}
}

function Motoboy() {
  return (
    <svg viewBox="0 0 160 120" role="img" aria-label="Entregador de moto com bag de entrega" className="convite-arte">
      <ellipse cx="80" cy="108" rx="62" ry="5" fill="#000" opacity=".12" />
      <circle cx="38" cy="92" r="15" fill="#2a1840" /><circle cx="38" cy="92" r="6" fill="#d9c7f5" />
      <circle cx="124" cy="92" r="15" fill="#2a1840" /><circle cx="124" cy="92" r="6" fill="#d9c7f5" />
      <path d="M38 92 L62 70 H100 L124 92" fill="none" stroke="#ffc400" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M52 66 H92 Q98 66 98 72 V74 H52 Z" fill="#b98ae8" />
      <path d="M118 52 L126 70 M112 52 H124" stroke="#e9dcff" strokeWidth="5" strokeLinecap="round" />
      <rect x="50" y="26" width="34" height="32" rx="6" fill="#ffc400" /><rect x="50" y="38" width="34" height="5" fill="#5a1a9a" opacity=".85" />
      <path d="M86 58 L98 40 Q102 34 108 40 L112 52" fill="none" stroke="#c9a8ff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M84 64 L100 66" stroke="#e9dcff" strokeWidth="8" strokeLinecap="round" />
      <circle cx="104" cy="28" r="10" fill="#f1c7a0" />
      <path d="M93 28 A11 11 0 0 1 115 28 V31 H93 Z" fill="#fff" />
      <rect x="106" y="27" width="10" height="5" rx="2" fill="#2a1840" />
    </svg>
  );
}

function Lojinha() {
  return (
    <svg viewBox="0 0 160 120" role="img" aria-label="Fachada de loja com toldo" className="convite-arte">
      <ellipse cx="80" cy="108" rx="62" ry="5" fill="#000" opacity=".12" />
      <rect x="28" y="46" width="104" height="58" rx="4" fill="#fff" />
      <path d="M22 46 L32 20 H128 L138 46 Z" fill="#5a1a9a" />
      <path d="M22 46 H138 V52 Q127 60 116 52 Q105 60 94 52 Q83 60 72 52 Q61 60 50 52 Q39 60 28 52 Q25 52 22 52 Z" fill="#ffc400" />
      <rect x="40" y="64" width="40" height="40" rx="3" fill="#d9c7f5" />
      <rect x="92" y="64" width="26" height="40" rx="3" fill="#5a1a9a" />
      <circle cx="111" cy="86" r="2.5" fill="#ffc400" />
      <rect x="46" y="70" width="12" height="14" rx="2" fill="#ffc400" /><rect x="62" y="70" width="12" height="14" rx="2" fill="#5a1a9a" opacity=".7" />
    </svg>
  );
}

const CARTOES = [
  { id: 'entregador', href: '/entregador', titulo: 'Seja entregador', texto: 'Ganhe fazendo entregas no seu horário.', botao: 'Quero entregar', Arte: Motoboy, classe: 'convite-roxo' },
  { id: 'lojista', href: '/lojistas', titulo: 'Seja um parceiro lojista', texto: 'Venda mais com a sua loja no Brokê.', botao: 'Quero vender', Arte: Lojinha, classe: 'convite-claro' },
];

// Dois cartões lado a lado na tela inicial; cada um tem o seu X e volta a aparecer só depois de 7 dias.
export default function ConvitesParceiros() {
  const [abertos, setAbertos] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => {
      const fechados = lerFechados();
      setAbertos(CARTOES.map((c) => c.id).filter((id) => !fechados.includes(id)));
    }, 700);
    return () => clearTimeout(t);
  }, []);

  const fechar = (id) => {
    gravarFechado(id);
    setAbertos((a) => a.filter((x) => x !== id));
  };
  const fecharTodos = () => abertos.forEach(fechar);

  useEffect(() => {
    if (!abertos.length) return undefined;
    const aoTeclar = (e) => e.key === 'Escape' && fecharTodos();
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  });

  if (!abertos.length) return null;
  return (
    <div className="convites-fundo" onClick={fecharTodos} role="dialog" aria-label="Faça parte do Brokê">
      <div className="convites-grade" onClick={(e) => e.stopPropagation()}>
        {CARTOES.filter((c) => abertos.includes(c.id)).map(({ id, href, titulo, texto, botao, Arte, classe }) => (
          <section key={id} className={`convite ${classe}`}>
            <button type="button" className="convite-x" aria-label={`Fechar: ${titulo}`} onClick={() => fechar(id)}>×</button>
            <Arte />
            <h2>{titulo}</h2>
            <p>{texto}</p>
            <Link href={href} className="convite-botao">{botao}</Link>
          </section>
        ))}
      </div>
    </div>
  );
}
