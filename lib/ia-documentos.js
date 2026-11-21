import { normalizarAnalise, compararComDigitado } from './documentos';

// Conferência automática dos documentos.
//   IA_PROVEDOR=nenhum (padrão): sem IA. Só regras simples + conferência humana no /admin. Custa R$ 0.
//   IA_PROVEDOR=claude: lê CNH e documento da moto com o Claude (precisa de ANTHROPIC_API_KEY).
// A selfie NUNCA vai para IA de texto/imagem aqui: comparar rostos exige um serviço próprio de biometria (KYC).
// Os documentos pessoais não são enviados a IAs gratuitas, que usam o conteúdo para treino.

export const provedorIA = () => (process.env.IA_PROVEDOR || 'nenhum').toLowerCase();
export const iaAtiva = () => provedorIA() === 'claude' && Boolean(process.env.ANTHROPIC_API_KEY);

const PROMPT = {
  cnh: 'Esta imagem deve ser uma CNH brasileira. Leia e responda SOMENTE um JSON: {"legivel":bool,"tipo_ok":bool (é mesmo uma CNH),"nome":string|null,"validade":"AAAA-MM-DD"|null,"categoria":string|null,"observacao":string|null}. Não invente: use null no que não conseguir ler.',
  crlv: 'Esta imagem deve ser o documento de um veículo brasileiro (CRLV). Responda SOMENTE um JSON: {"legivel":bool,"tipo_ok":bool (é mesmo o documento do veículo),"placa":string|null,"nome":string|null (proprietário),"observacao":string|null}. Não invente: use null no que não conseguir ler.',
};

async function lerComClaude(tipo, bytes) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: Buffer.from(bytes).toString('base64') } },
        { type: 'text', text: PROMPT[tipo] },
      ] }],
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok) throw new Error(`IA respondeu ${r.status}`);
  const j = await r.json();
  return normalizarAnalise(j?.content?.[0]?.text);
}

// arquivos: { cnh: Uint8Array, crlv: Uint8Array }. Nunca lança erro; devolve { usada, alertas, leitura }.
export async function conferirComIA(arquivos, dados, nomeCadastro) {
  if (!iaAtiva()) return { usada: false, alertas: [], leitura: null };
  const alertas = [];
  const leitura = {};
  for (const tipo of ['cnh', 'crlv']) {
    if (!arquivos[tipo]) continue;
    try {
      leitura[tipo] = await lerComClaude(tipo, arquivos[tipo]);
      alertas.push(...compararComDigitado(tipo, leitura[tipo], dados, nomeCadastro));
    } catch (e) {
      console.error('IA de documentos falhou:', e?.message || e);
      alertas.push(`${tipo.toUpperCase()}: a conferência automática falhou; será vista por uma pessoa.`);
    }
  }
  return { usada: true, alertas, leitura };
}
