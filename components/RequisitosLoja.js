import { REQUISITOS } from '../lib/termo-lojista';

// Faixa no topo do cadastro da loja: o que é preciso para vender.
export default function RequisitosLoja() {
  return (
    <aside
      aria-label="Requisitos para vender"
      style={{ background: 'var(--azul)', color: '#fff', borderRadius: 16, padding: '18px 18px 16px', display: 'grid', gap: 10, borderLeft: '6px solid var(--amarelo)' }}
    >
      <strong style={{ fontSize: 19, color: 'var(--amarelo)' }}>Antes de começar: o que você precisa para vender</strong>
      <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4, fontSize: 15 }}>
        {REQUISITOS.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <small style={{ color: '#e6d8f5' }}>
        MEI é aceito. Depois do cadastro, a nossa equipe confere os dados e libera a loja.
      </small>
    </aside>
  );
}
