import { Section, SecHead, Reveal } from '../components';
import { useLanding } from '../context';
import { CAPS } from '../data';
import { C } from '../theme';

export default function Bento() {
  const { tx, isRtl } = useLanding();
  return (
    <Section alt>
      <Reveal><SecHead title={tx('bentoTitle')} sub={tx('bentoSub')} /></Reveal>
      <div className="bento" style={{ marginTop: 32 }}>
        {CAPS.map((cp, i) => {
          const CIcon = cp.Icon;
          const featured = cp.feat || cp.wide;
          return (
            <Reveal key={cp.k} delay={(i % 4) * 60} style={{ height: '100%' }}>
              <div className={`lpcard ${cp.feat ? 'feat' : cp.wide ? 'wide' : ''}`} style={{ height: '100%', minHeight: cp.feat ? 200 : 0, padding: cp.feat ? 26 : '20px 18px', borderRadius: 18, background: featured ? `linear-gradient(135deg, ${cp.c}, ${cp.c}cc)` : C.surface, border: featured ? 'none' : `1px solid ${C.border}`, boxShadow: C.shadow, color: featured ? '#fff' : C.ink, display: 'flex', flexDirection: 'column', textAlign: isRtl ? 'right' : 'left' }}>
                <div className="lpico" style={{ width: cp.feat ? 56 : 46, height: cp.feat ? 56 : 46, borderRadius: 14, background: featured ? 'rgba(255,255,255,0.2)' : `${cp.c}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: featured ? '#fff' : cp.c, marginBottom: 13 }}><CIcon size={cp.feat ? 28 : 22} /></div>
                <h3 style={{ fontSize: cp.feat ? 20 : 15.5, fontWeight: 800, margin: '0 0 6px' }}>{tx('cap.' + cp.k)}</h3>
                <p style={{ fontSize: cp.feat ? 13.5 : 12, color: featured ? 'rgba(255,255,255,0.92)' : C.ink2, lineHeight: 1.65, margin: 0 }}>{tx('cap.' + cp.k + '.d')}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
