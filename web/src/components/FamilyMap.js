import { useEffect, useRef, useState } from 'react';

const MOSCOW = [55.7558, 37.6173];
const LEAFLET_VERSION = '1.9.4';
const LEAFLET_CSS_URL = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
const LEAFLET_JS_URL = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;

let leafletPromise;

const loadLeaflet = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('Leaflet is client-only'));
  if (window.L) return Promise.resolve(window.L);

  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = LEAFLET_CSS_URL;
    document.head.appendChild(link);
  }

  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById('leaflet-js');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.L));
        existing.addEventListener('error', () => reject(new Error('Failed to load Leaflet')));
        return;
      }

      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = LEAFLET_JS_URL;
      script.async = true;
      script.onload = () => resolve(window.L);
      script.onerror = () => reject(new Error('Failed to load Leaflet'));
      document.body.appendChild(script);
    });
  }

  return leafletPromise;
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getLocationPoints = (members) => members
  .map((member) => {
    const lat = toNumber(member.location?.latitude);
    const lng = toNumber(member.location?.longitude);
    if (lat === null || lng === null) return null;

    return {
      lat,
      lng,
      member,
    };
  })
  .filter(Boolean);

export default function FamilyMap({ members = [], geofences = [] }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    let disposed = false;

    const init = async () => {
      if (!containerRef.current || mapRef.current) return;

      const L = await loadLeaflet();
      if (disposed || !containerRef.current) return;

      const points = getLocationPoints(members);
      const firstGeofence = geofences[0];
      const center = points.length > 0
        ? [points[0].lat, points[0].lng]
        : firstGeofence
          ? [Number(firstGeofence.latitude), Number(firstGeofence.longitude)]
          : MOSCOW;

      mapRef.current = L.map(containerRef.current, {
        center,
        zoom: points.length > 0 || firstGeofence ? 12 : 10,
        scrollWheelZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current);

      layerRef.current = L.layerGroup().addTo(mapRef.current);
    };

    init();

    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const updateLayers = async () => {
      if (!mapRef.current || !layerRef.current) return;

      const L = await loadLeaflet();
      layerRef.current.clearLayers();

      const bounds = [];
      const points = getLocationPoints(members);

      points.forEach(({ lat, lng, member }) => {
        bounds.push([lat, lng]);
        L.circleMarker([lat, lng], {
          radius: 9,
          color: '#4f46e5',
          weight: 3,
          fillColor: '#6366f1',
          fillOpacity: 0.85,
        })
          .bindPopup(`<strong>${member.fullName || member.full_name || 'Участник'}</strong><br/>${member.familyName || ''}`)
          .addTo(layerRef.current);
      });

      geofences.forEach((geofence) => {
        const lat = toNumber(geofence.latitude);
        const lng = toNumber(geofence.longitude);
        const radius = Number(geofence.radius || geofence.radius_meters || 100);
        if (lat === null || lng === null) return;

        bounds.push([lat, lng]);
        L.circle([lat, lng], {
          radius,
          color: '#059669',
          weight: 2,
          fillColor: '#10b981',
          fillOpacity: 0.12,
        })
          .bindPopup(`<strong>${geofence.name || 'Геозона'}</strong><br/>Радиус: ${radius} м`)
          .addTo(layerRef.current);
      });

      if (bounds.length > 0) {
        mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
      }
    };

    updateLayers().catch(() => setMapError('Не удалось загрузить интерактивную карту'));
  }, [members, geofences]);

  return (
    <div className="relative h-80 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700">
      <div ref={containerRef} className="absolute inset-0 z-0" />
      {mapError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-center">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{mapError}</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Проверьте интернет-соединение для OpenStreetMap/Leaflet.</p>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-xl bg-white/90 dark:bg-gray-800/90 px-3 py-2 shadow-sm backdrop-blur">
        <p className="text-sm font-medium text-gray-900 dark:text-white">Карта семьи</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {getLocationPoints(members).length} участников онлайн, {geofences.length} геозон
        </p>
      </div>
    </div>
  );
}
