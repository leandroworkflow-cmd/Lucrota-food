// Regras dos documentos do entregador. Funções puras: sem rede e sem banco, fáceis de testar.

export const TIPOS_DOC = ['cnh', 'crlv', 'selfie'];
export const ROTULO_DOC = { cnh: 'CNH', crlv: 'Documento da moto (CRLV)', selfie: 'Selfie' };
export const MAX_BYTES_DOC = 3 * 1024 * 1024;
export const STATUS_DOCS = { sem_documentos: 'Sem documentos', em_analise: 'Em análise', aprovado: 'Aprovado', reprovado: 'Reprovado' };

// Moto e carro exigem CNH e documento do veículo; bicicleta e a pé exigem só a selfie.
export const veiculoMotorizado = (veiculo) => veiculo === 'moto' || veiculo === 'carro';
export function tiposExigidos(veiculo) {
  return veiculoMotorizado(veiculo) ? ['cnh', 'crlv', 'selfie'] : ['selfie'];
}
export function docsFaltando(veiculo, enviados) {
  const tem = new Set(enviados || []);
  return tiposExigidos(veiculo).filter((t) => !tem.has(t));
}

// Só entregadores da plataforma passam pela verificação. Os convidados por uma loja ficam fora.
export const precisaDeDocumentos = (ent) => !ent?.loja_id;

// Confere se o arquivo é mesmo um JPEG (o navegador sempre converte para JPEG antes de enviar).
export function ehJpeg(bytes) {
  return bytes && bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();

export function normalizarPlaca(v) {
  return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
// Placa antiga (ABC1234) ou Mercosul (ABC1D23).
export const placaValida = (v) => /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(normalizarPlaca(v));

function hojeISO(agora) {
  return new Date(agora).toISOString().slice(0, 10);
}

// Valida os dados digitados. Devolve { dados } ou { erro }.
export function validarDadosDocs(b, veiculo, agora = Date.now()) {
  if (!b || typeof b !== 'object') return { erro: 'Requisição inválida.' };
  if (b.consentimento !== true) return { erro: 'Para enviar os documentos, você precisa concordar com o uso deles para a verificação.' };
  const dados = {};
  if (veiculoMotorizado(veiculo)) {
    const nome = String(b.cnh_nome || '').trim().replace(/\s+/g, ' ');
    if (nome.length < 5 || nome.length > 80) return { erro: 'Digite o nome completo exatamente como está na CNH.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.cnh_validade || '')) || Number.isNaN(Date.parse(b.cnh_validade))) return { erro: 'Informe a validade da CNH.' };
    if (b.cnh_validade < hojeISO(agora)) return { erro: 'A CNH está vencida. Renove antes de enviar.' };
    if (b.cnh_validade > hojeISO(agora + 20 * 365 * 864e5)) return { erro: 'Confira a validade da CNH.' };
    const cat = String(b.cnh_categoria || '').toUpperCase().trim();
    if (!['A', 'B', 'AB', 'AC', 'AD', 'AE', 'C', 'D', 'E'].includes(cat)) return { erro: 'Escolha a categoria da CNH.' };
    if (veiculo === 'moto' && !cat.includes('A')) return { erro: 'Para entregar de moto, a CNH precisa ser categoria A (ou AB).' };
    if (veiculo === 'carro' && cat === 'A') return { erro: 'Para entregar de carro, a CNH precisa ser categoria B ou superior.' };
    if (!placaValida(b.placa)) return { erro: 'Digite a placa do veículo (ex.: ABC1D23).' };
    Object.assign(dados, { cnh_nome: nome, cnh_validade: b.cnh_validade, cnh_categoria: cat, placa: normalizarPlaca(b.placa) });
  }
  return { dados };
}

// O nome da CNH precisa combinar com o do cadastro (mesmo primeiro e último nome).
export function nomesCombinam(nomeCadastro, nomeCnh) {
  const a = semAcento(nomeCadastro).split(' ').filter(Boolean);
  const b = semAcento(nomeCnh).split(' ').filter(Boolean);
  if (!a.length || !b.length) return false;
  return a[0] === b[0] && (a.length === 1 || b.includes(a[a.length - 1]));
}

// Regras automáticas (grátis, sem IA). Nunca reprovam sozinhas: só sinalizam para a conferência humana.
export function avaliarRegras(ent, dados) {
  const alertas = [];
  if (veiculoMotorizado(ent.veiculo) && dados.cnh_nome && !nomesCombinam(ent.nome, dados.cnh_nome)) {
    alertas.push('O nome na CNH não combina com o nome do cadastro.');
  }
  return alertas;
}

// Transforma a resposta de qualquer IA (texto/objeto) num formato único e seguro.
// Os campos que a IA não souber ficam nulos; nada vindo da IA aprova ou reprova sozinho.
export function normalizarAnalise(bruto) {
  let o = bruto;
  if (typeof bruto === 'string') {
    const m = bruto.match(/\{[\s\S]*\}/);
    try { o = m ? JSON.parse(m[0]) : null; } catch { o = null; }
  }
  if (!o || typeof o !== 'object') return null;
  const txt = (v, n = 80) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);
  const dataIso = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  return {
    legivel: o.legivel === true,
    tipo_ok: o.tipo_ok === true,
    nome: txt(o.nome),
    validade: dataIso(o.validade),
    categoria: txt(o.categoria, 4),
    placa: o.placa ? normalizarPlaca(o.placa).slice(0, 8) || null : null,
    observacao: txt(o.observacao, 200),
  };
}

// Compara o que a IA leu com o que o entregador digitou. Devolve alertas em português.
export function compararComDigitado(tipo, analise, dados, nomeCadastro) {
  if (!analise) return ['A conferência automática não conseguiu ler o documento.'];
  const a = [];
  if (!analise.legivel) a.push(`${ROTULO_DOC[tipo]}: a foto está ilegível ou cortada.`);
  if (!analise.tipo_ok) a.push(`${ROTULO_DOC[tipo]}: a imagem não parece ser esse documento.`);
  if (tipo === 'cnh') {
    if (analise.nome && !nomesCombinam(dados.cnh_nome, analise.nome)) a.push('O nome lido na CNH é diferente do digitado.');
    if (analise.validade && analise.validade !== dados.cnh_validade) a.push('A validade lida na CNH é diferente da digitada.');
    if (analise.nome && !nomesCombinam(nomeCadastro, analise.nome)) a.push('O nome lido na CNH não combina com o cadastro.');
  }
  if (tipo === 'crlv' && analise.placa && analise.placa !== dados.placa) a.push('A placa lida no documento é diferente da digitada.');
  return a;
}
