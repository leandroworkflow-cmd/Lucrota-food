// Selfie diária do entregador da plataforma. Funções puras.
import { diaBR } from './metricas';

export const DIAS_GUARDAR_SELFIE = 30;
export const MAX_BYTES_SELFIE = 3 * 1024 * 1024;

// Entregadores convidados por uma loja e contas de teste ficam fora.
export const exigeSelfieDia = (ent) => !ent?.loja_id && !ent?.conta_teste;

export const diaDaSelfie = (agora = Date.now()) => diaBR(new Date(agora).toISOString());
export const caminhoSelfieDia = (entId, dia) => `${entId}/dia/${dia}.jpg`;

// Dia (AAAA-MM-DD) antes do qual as selfies já podem ser apagadas.
export const diaLimiteApagar = (agora = Date.now()) => diaDaSelfie(agora - DIAS_GUARDAR_SELFIE * 86400000);
