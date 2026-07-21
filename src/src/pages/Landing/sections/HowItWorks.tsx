import { t } from '../../../i18n/translations';
import { Section, SecHead, Reveal } from '../components';
import { useLanding } from '../context';
import { C } from '../theme';

export default function HowItWorks() {
  const { lang, isRtl, tx } = useLanding();
  const steps = [
    { n: '1', t: 'landing.how.step1', d: 'how1d', color: C.orange },
    { n: '2', t: 'landing.how.step2', d: 'how2d', color: C.blue },
    { n: '3', t: 'landing.how.step3', d: 'how3d', color: C.green },
  ];
  return (
    <Section id="how">
      <Reveal><SecHead title={tx('howTitle')} sub={tx('howSub')} /></Reveal>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,260px), 1fr))', gap: 18, marginTop: 30 }}>
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 100}>
            <div className="lpcard" style={{ height: '100%', padding: '28px 24px', borderRadius: 18, background: C.surface, border: `1px solid ${C.border}`, boxShadow: C.shadow, textAlign: isRtl ? 'right' : 'left' }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: `${s.color}14`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, marginBottom: 16, border: `1.5px solid ${s.color}55` }}>{s.n}</div>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 8px', color: C.ink }}>{t(lang, s.t)}</h3>
              <p style={{ fontSize: 13, color: C.ink2, lineHeight: 1.7, margin: 0 }}>{tx(s.d)}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
