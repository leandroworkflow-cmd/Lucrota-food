// Funções de mapa e GPS (puras, sem chaves pagas). Mapa: OpenStreetMap. Rota: OSRM público.

export const coordValida = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

// Caixa que cobre o Brasil: barra coordenadas absurdas enviadas por engano ou má-fé.
export const noBrasil = (lat, lng) => coordValida(lat, lng) && lat > -34 && lat < 6 && lng > -74 && lng < -28;

// Distância em metros entre dois pontos (fórmula de haversine).
export function distanciaM(a, b) {
  const R = 6371000;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Estimativa simples quando a rota online não responde: trajeto ~30% maior que a linha reta, a 22 km/h.
export function estimativaSemRota(de, para) {
  const metros = distanciaM(de, para) * 1.3;
  return { metros, segundos: (metros / (22 / 3.6)) | 0, aproximada: true };
}

export function textoDistancia(metros) {
  if (!Number.isFinite(metros)) return '';
  return metros < 1000 ? `${Math.round(metros / 10) * 10} m` : `${(metros / 1000).toFixed(1).replace('.', ',')} km`;
}

export function textoTempo(segundos) {
  if (!Number.isFinite(segundos)) return '';
  const min = Math.max(1, Math.round(segundos / 60));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}

// Navegação grátis: abre o Waze ou o Google Maps no celular do entregador.
export function linkWaze({ lat, lng, endereco }) {
  return coordValida(lat, lng)
    ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(endereco || '')}&navigate=yes`;
}
export function linkGoogleMaps({ lat, lng, endereco }) {
  const destino = coordValida(lat, lng) ? `${lat},${lng}` : encodeURIComponent(endereco || '');
  return `https://www.google.com/maps/dir/?api=1&destination=${destino}`;
}

// Rota de carro/moto pelo OSRM público (gratuito, sem garantia de disponibilidade). Roda no navegador.
export async function rotaOSRM(de, para, sinal) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${de.lng},${de.lat};${para.lng},${para.lat}?overview=full&geometries=geojson`;
    const r = await fetch(url, { signal: sinal });
    if (!r.ok) throw new Error('rota');
    const j = await r.json();
    const rota = j.routes?.[0];
    if (!rota) throw new Error('sem rota');
    return {
      metros: rota.distance,
      segundos: rota.duration,
      linha: rota.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      aproximada: false,
    };
  } catch {
    return { ...estimativaSemRota(de, para), linha: [[de.lat, de.lng], [para.lat, para.lng]] };
  }
}

// O dado de posição é "velho" se passou de 2 minutos sem atualizar.
export const posicaoAntiga = (iso, agora = Date.now()) => !iso || agora - new Date(iso).getTime() > 120000;
