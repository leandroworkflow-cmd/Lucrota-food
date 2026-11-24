'use client';

// Alerta sonoro no navegador do cliente (sem arquivo de áudio). Os navegadores só liberam som depois de um toque
// na página, por isso desbloquearAudio() é chamado no primeiro toque; o alarme só toca com o áudio liberado.
let ctx = null;

export function desbloquearAudio() {
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return false;
    if (!ctx) ctx = new C();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx.state === 'running';
  } catch {
    return false;
  }
}

export const audioPronto = () => Boolean(ctx) && ctx.state === 'running';

// Toca uma sequência de bipes altos (3 rodadas de ~1,5 s). Devolve true se conseguiu tocar.
export function tocarAlarme(rodadas = 3) {
  if (!audioPronto()) desbloquearAudio();
  if (!ctx || ctx.state !== 'running') return false;
  const base = ctx.currentTime;
  for (let r = 0; r < rodadas; r++) {
    [880, 1175, 880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = base + r * 1.8 + i * 0.3;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
      osc.start(t);
      osc.stop(t + 0.28);
    });
  }
  return true;
}

export function vibrar() {
  try { navigator.vibrate?.([400, 200, 400, 200, 800]); } catch {}
}
