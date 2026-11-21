// CNPJ e CPF: funções puras (sem rede), testáveis.
export const soDigitos = (v) => String(v || '').replace(/\D/g, '');

function digito(base, pesos) {
  const soma = base.split('').reduce((t, n, i) => t + Number(n) * pesos[i], 0);
  const r = soma % 11;
  return r < 2 ? 0 : 11 - r;
}

export function cnpjValido(v) {
  const c = soDigitos(v);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const d1 = digito(c.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digito(c.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(c[12]) && d2 === Number(c[13]);
}

export function cpfValido(v) {
  const c = soDigitos(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const d1 = digito(c.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digito(c.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(c[9]) && d2 === Number(c[10]);
}

export function formatarCnpj(v) {
  const c = soDigitos(v).slice(0, 14);
  return c.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}
export function formatarCpf(v) {
  const c = soDigitos(v).slice(0, 11);
  return c.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

// Valida os dados da empresa e do responsável. Devolve { dados } ou { erro }.
export function validarEmpresa(f) {
  if (!cnpjValido(f.cnpj)) return { erro: 'CNPJ inválido. Confira os 14 números (MEI também vale).' };
  const razao = String(f.razao_social || '').trim().replace(/\s+/g, ' ');
  if (razao.length < 3 || razao.length > 120) return { erro: 'Informe a razão social (o nome que aparece no cartão CNPJ).' };
  const resp = String(f.responsavel_nome || '').trim().replace(/\s+/g, ' ');
  if (resp.length < 5 || resp.length > 80) return { erro: 'Informe o nome completo do responsável legal.' };
  if (!cpfValido(f.responsavel_cpf)) return { erro: 'CPF do responsável inválido.' };
  return { dados: { cnpj: soDigitos(f.cnpj), razao_social: razao, responsavel_nome: resp, responsavel_cpf: soDigitos(f.responsavel_cpf) } };
}
