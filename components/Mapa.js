'use client';

import { useEffect, useRef, useState } from 'react';

// Leaflet + OpenStreetMap, carregados do CDN (gratuito, sem chave). Marcadores são emojis.
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

let carregando = null;
function carregarLeaflet() {
  if (typeof window === 'undefined') return Promise.reject(new Error('sem janela'));
  if (window.L) return Promise.resolve(window.L);
  if (carregando) return carregando;
  carregando = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = LEAFLET_CSS;
      document.head.appendChild(css);
    }
    const s = document.createElement('script');
    s.src = LEAFLET_JS;
    s.async = true;
    s.onload = () => resolve(window.L);
    s.onerror = () => {
      carregando = null;
      reject(new Error('mapa'));
    };
    document.head.appendChild(s);
  });
  return carregando;
}

const EMOJI = { loja: '🏪', cliente: '📍', moto: '🛵', voce: '🔵' };

// pontos: [{ id, tipo: 'loja'|'cliente'|'moto'|'voce', lat, lng, rotulo }]
// linha: [[lat, lng], ...] opcional. altura em px.
// aoClicar(lat, lng): se informado, o mapa deixa marcar um ponto com o toque.
export default function Mapa({ pontos, linha, altura = 280, aoClicar, rotuloMapa = 'Mapa da entrega' }) {
  const caixa = useRef(null);
  const mapa = useRef(null);
  const marcas = useRef(new Map());
  const rota = useRef(null);
  const ajustado = useRef('');
  const clique = useRef(aoClicar);
  const [falhou, setFalhou] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    clique.current = aoClicar;
  }, [aoClicar]);

  useEffect(() => {
    let vivo = true;
    carregarLeaflet()
      .then((L) => {
        if (!vivo || !caixa.current || mapa.current) return;
        const m = L.map(caixa.current, { zoomControl: true, attributionControl: true }).setView([-19.77, -43.85], 13);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(m);
        m.on('click', (e) => clique.current?.(e.latlng.lat, e.latlng.lng));
        mapa.current = m;
        setPronto(true);
      })
      .catch(() => vivo && setFalhou(true));
    return () => {
      vivo = false;
      if (mapa.current) {
        mapa.current.remove();
        mapa.current = null;
        marcas.current.clear();
        rota.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const L = window.L;
    const m = mapa.current;
    if (!pronto || !L || !m) return;

    const ids = new Set();
    for (const p of pontos) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
      ids.add(p.id);
      const existente = marcas.current.get(p.id);
      if (existente) {
        existente.setLatLng([p.lat, p.lng]);
      } else {
        const icone = L.divIcon({
          className: 'marca-mapa',
          html: `<span class="marca-mapa-in marca-${p.tipo}">${EMOJI[p.tipo] || '📍'}</span>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });
        const mk = L.marker([p.lat, p.lng], { icon: icone, title: p.rotulo || '', keyboard: false }).addTo(m);
        if (p.rotulo) mk.bindTooltip(p.rotulo, { direction: 'top', offset: [0, -16] });
        marcas.current.set(p.id, mk);
      }
    }
    for (const [id, mk] of marcas.current) {
      if (!ids.has(id)) {
        mk.remove();
        marcas.current.delete(id);
      }
    }

    if (rota.current) {
      rota.current.remove();
      rota.current = null;
    }
    if (linha && linha.length > 1) {
      rota.current = L.polyline(linha, { color: '#5a1a9a', weight: 5, opacity: 0.8 }).addTo(m);
    }

    // Enquadra o mapa quando muda o conjunto de pontos (não a cada passo da moto).
    const chave = [...ids].sort().join('|');
    if (chave && chave !== ajustado.current) {
      ajustado.current = chave;
      const validos = pontos.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
      if (validos.length === 1) m.setView([validos[0].lat, validos[0].lng], 16);
      else if (validos.length > 1) m.fitBounds(validos.map((p) => [p.lat, p.lng]), { padding: [40, 40], maxZoom: 17 });
    }
  }, [pontos, linha, pronto]);

  if (falhou) {
    return (
      <div className="mapa-falha" role="status">
        Não consegui carregar o mapa agora. As informações da entrega continuam funcionando.
      </div>
    );
  }
  return <div ref={caixa} className="mapa" style={{ height: altura }} role="img" aria-label={rotuloMapa} />;
}
