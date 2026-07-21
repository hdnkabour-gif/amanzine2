import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ============================================================
// MapView — خريطة Leaflet + OpenStreetMap (مجانية، مضمّنة، بلا CDN)
// تستهلك عقد الخريطة الجاهز { markers, center }. علامات متجهية (circleMarker)
// بلا صور خارجية → آمنة مع CSP الحالي (imgSrc https: للبلاطات فقط).
// onSearchArea يُستدعى عند تحريك الخريطة → "ابحث في هذه المنطقة".
// ============================================================

export interface MapMarker {
  id: string; source: string; name: string; lat: number; lng: number;
  type: string; verified?: boolean; rating?: number; href: string; distanceKm?: number | null;
}

const TYPE_COLOR: Record<string, string> = { store: '#f97316', service: '#8b5cf6' };

export default function MapView({
  markers, center, radiusKm = 25, onSearchArea, height = 460,
}: {
  markers: MapMarker[];
  center: { lat: number; lng: number };
  radiusKm?: number;
  onSearchArea?: (b: { lat: number; lng: number; radiusKm: number }) => void;
  height?: number;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const searchRef = useRef(onSearchArea);
  searchRef.current = onSearchArea;

  // إنشاء الخريطة مرّة
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: true })
      .setView([center.lat, center.lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '© OpenStreetMap',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    // دائرة نطاق البحث حول المستخدم
    L.circle([center.lat, center.lng], { radius: radiusKm * 1000, color: '#8b5cf6', weight: 1, fillOpacity: 0.05 }).addTo(map);
    // "ابحث في هذه المنطقة" عند التوقّف عن التحريك
    map.on('moveend', () => {
      if (!searchRef.current) return;
      const c = map.getCenter();
      const b = map.getBounds();
      const km = c.distanceTo(b.getNorthEast()) / 1000; // نصف قطر تقريبي للعرض الحالي
      searchRef.current({ lat: c.lat, lng: c.lng, radiusKm: Math.min(Math.round(km), 100) });
    });
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 100); // ضبط الحجم بعد الرسم
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // إعادة رسم العلامات عند تغيّر النتائج
  useEffect(() => {
    const layer = layerRef.current; if (!layer) return;
    layer.clearLayers();
    for (const m of markers) {
      if (typeof m.lat !== 'number' || typeof m.lng !== 'number') continue;
      const color = TYPE_COLOR[m.type] || '#8b5cf6';
      const marker = L.circleMarker([m.lat, m.lng], {
        radius: 9, color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.95,
      });
      const stars = m.rating ? `⭐ ${m.rating}` : '';
      const dist = m.distanceKm != null ? ` · ${m.distanceKm} كم` : '';
      marker.bindPopup(
        `<div style="font-family:Tajawal,sans-serif;min-width:150px;text-align:right" dir="rtl">
           <div style="font-weight:800;margin-bottom:4px">${escapeHtml(m.name)}${m.verified ? ' ✔' : ''}</div>
           <div style="font-size:12px;color:#666;margin-bottom:6px">${stars}${dist}</div>
           <a href="${m.href}" style="color:#8b5cf6;font-weight:700;text-decoration:none;font-size:13px">عرض النشاط ↗</a>
         </div>`,
      );
      layer.addLayer(marker);
    }
  }, [markers]);

  // متابعة تغيّر المركز (مثلاً بعد تحديد الموقع)
  useEffect(() => {
    if (mapRef.current) mapRef.current.panTo([center.lat, center.lng]);
  }, [center.lat, center.lng]);

  return <div ref={elRef} style={{ width: '100%', height, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }} />;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
