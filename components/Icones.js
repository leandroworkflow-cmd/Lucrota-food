// Ícones de traço do Brokê (24x24, desenhados para este app). Herdam a cor do texto.
const D = {
  menu: 'M4 7h16M4 12h16M4 17h10',
  voltar: 'M15 5l-7 7 7 7',
  direita: 'M9 5l7 7-7 7',
  baixo: 'M6 9l6 6 6-6',
  cima: 'M6 15l6-6 6 6',
  ganhos: ['M12 3a9 9 0 100 18 9 9 0 000-18z', 'M14.6 9.3c-.5-.8-1.4-1.3-2.6-1.3-1.5 0-2.5.8-2.5 1.9 0 2.6 5 1.4 5 4 0 1.2-1.1 2-2.7 2-1.3 0-2.3-.5-2.8-1.4', 'M12 6.5V8M12 16v1.5'],
  carteira: ['M4 7.5A2.5 2.5 0 016.5 5H17v3', 'M4 7.5V17a2 2 0 002 2h13a1 1 0 001-1V9a1 1 0 00-1-1H6.5A2.5 2.5 0 014 7.5z', 'M16 13.5h.01'],
  docs: ['M7 3h7l4 4v14H7z', 'M14 3v4h4', 'M10 12h5M10 16h5'],
  perfil: ['M12 4.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z', 'M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6'],
  suporte: ['M5 14v-2a7 7 0 0114 0v2', 'M5 14h2.5v4.5H5a1 1 0 01-1-1V15a1 1 0 011-1z', 'M19 14h-2.5v4.5H19a1 1 0 001-1V15a1 1 0 00-1-1z', 'M17 18.5c0 1.4-2 2.2-5 2.2'],
  ajustes: ['M4 7h9M17 7h3M4 17h3M11 17h9', 'M15 5a2 2 0 100 4 2 2 0 000-4z', 'M9 15a2 2 0 100 4 2 2 0 000-4z'],
  sair: ['M10 4H6a1 1 0 00-1 1v14a1 1 0 001 1h4', 'M15 8l4 4-4 4M19 12H9'],
  lista: 'M5 6h1.5M5 12h1.5M5 18h1.5M10 6h9M10 12h9M10 18h6',
  casa: ['M4 11l8-7 8 7', 'M6 10v10h12V10', 'M10 20v-5h4v5'],
  loja: ['M4 9l1.5-5h13L20 9', 'M4 9a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0A2.7 2.7 0 0020 9', 'M5.5 12v8h13v-8', 'M10 20v-4h4v4'],
  escudo: ['M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z', 'M9 12l2 2 4-4'],
  sino: ['M6 16v-5a6 6 0 0112 0v5l1.5 2h-15z', 'M10 20.5a2 2 0 004 0'],
  ok: 'M5 12.5l4.5 4.5L19 7.5',
  relogio: ['M12 3a9 9 0 100 18 9 9 0 000-18z', 'M12 7.5V12l3 2'],
  alerta: ['M12 4l9 16H3z', 'M12 10v4M12 17h.01'],
  fechar: 'M6 6l12 12M18 6L6 18',
  pino: ['M12 21s6-5.5 6-11a6 6 0 10-12 0c0 5.5 6 11 6 11z', 'M12 7.8a2.2 2.2 0 100 4.4 2.2 2.2 0 000-4.4z'],
  moto: ['M6 19a3 3 0 100-6 3 3 0 000 6zM18 19a3 3 0 100-6 3 3 0 000 6z', 'M6 16h5l3-6h3l1 6', 'M9 10h4'],
  chat: ['M4 5h16v11H9.5L5 20v-4H4z'],
};

export function Icone({ nome, tam = 22, traco = 1.9, className, style }) {
  const d = D[nome];
  if (!d) return null;
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={traco} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className} style={{ flex: 'none', ...style }}>
      {(Array.isArray(d) ? d : [d]).map((p) => <path key={p} d={p} />)}
    </svg>
  );
}
