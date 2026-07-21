import { MapPin } from 'lucide-react';
import { Section, SecHead, Reveal } from '../components';
import { useLanding } from '../context';
import { CITY_FALLBACK } from '../data';
import { C } from '../theme';

export default function Cities() {
  const { tx, stats } = useLanding();
  const cityItems = (stats?.cities && stats.cities.length)
    ? stats.cities.slice(0, 6)
    : CITY_FALLBACK.map(c => ({ city: c, count: 0 }));

  return (
    <Section>
      <Reveal><SecHead title={tx('citiesTitle')} sub={tx('citiesSub')} /></Reveal>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,150px), 1fr))', gap: 14, marginTop: 30 }}>
        {cityItems.map((c, i) => (
          <Reveal key={c.city + i} delay={(i % 3) * 70}>
            <div className="lpcard" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: C.shadow, padding: '20px 16px', textAlign: 'center' }}>
              <div className="lpico" style={{ width: 42, height: 42, borderRadius: 12, background: `${C.orange}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: C.orange }}><MapPin size={20} /></div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{c.city}</div>
              <div style={{ fontSize: 11.5, color: c.count > 0 ? C.ink3 : C.orangeD, fontWeight: 700, marginTop: 3 }}>{c.count > 0 ? `${c.count} ${tx('cityUnit')}` : tx('cityBeFirst')}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
