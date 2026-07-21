import { Check } from 'lucide-react';
import { t } from '../../../i18n/translations';
import { Section, SecHead, Reveal } from '../components';
import { useLanding } from '../context';
import { C } from '../theme';

export default function Pricing() {
  const { lang, isRtl } = useLanding();
  return (
    <Section id="pricing">
      <Reveal>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: C.orangeD, background: `${C.orange}12`, border: `1px solid ${C.orange}26`, borderRadius: 99, padding: '5px 15px', letterSpacing: '.05em', textTransform: 'uppercase' }}>{t(lang, 'pricing.badge')}</span>
        </div>
        <SecHead title={t(lang, 'pricing.title')} sub={t(lang, 'pricing.sub')} />
      </Reveal>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,260px), 1fr))', gap: 18, marginTop: 30, maxWidth: 720, marginInline: 'auto' }}>
        <Reveal>
          <div className="lpcard" style={{ height: '100%', background: C.surface, border: `1px solid ${C.border}`, boxShadow: C.shadow, borderRadius: 20, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 11, textAlign: isRtl ? 'right' : 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>{t(lang, 'pricing.free.name')}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: C.ink }}>{t(lang, 'pricing.free.price')}</div>
            <div style={{ fontSize: 12, color: C.ink3 }}>{t(lang, 'pricing.free.desc')}</div>
            {(['pricing.free.f1', 'pricing.free.f2', 'pricing.free.f3'] as const).map(k => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.ink2 }}><Check size={14} color={C.green} /> {t(lang, k)}</div>
            ))}
            <a href="/login" style={{ marginTop: 'auto', textAlign: 'center', padding: '13px', borderRadius: 13, background: `${C.green}14`, border: `1px solid ${C.green}40`, color: C.green, fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>{t(lang, 'pricing.free.cta')}</a>
          </div>
        </Reveal>
        <Reveal delay={90}>
          <div className="lpcard" style={{ height: '100%', position: 'relative', background: C.surface, border: `2px solid ${C.orange}`, boxShadow: `0 18px 50px ${C.orange}26`, borderRadius: 20, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 11, textAlign: isRtl ? 'right' : 'left' }}>
            <span style={{ position: 'absolute', top: 14, insetInlineEnd: 16, fontSize: 10, fontWeight: 800, color: '#fff', background: C.orange, borderRadius: 99, padding: '4px 11px' } as any}>⭐ Pro</span>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.orangeD }}>{t(lang, 'pricing.pro.name')}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: C.ink }}>{t(lang, 'pricing.pro.price')}</div>
            <div style={{ fontSize: 12, color: C.ink3 }}>{t(lang, 'pricing.pro.desc')}</div>
            {(['pricing.pro.f1', 'pricing.pro.f2', 'pricing.pro.f3'] as const).map(k => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.ink2 }}><Check size={14} color={C.orange} /> {t(lang, k)}</div>
            ))}
            <a href="/login" className="lpbtn" style={{ marginTop: 'auto', position: 'relative', overflow: 'hidden', textAlign: 'center', padding: '13px', borderRadius: 13, background: `linear-gradient(135deg, ${C.orange}, ${C.orangeD})`, color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}><span className="sh" />{t(lang, 'pricing.pro.cta')}</a>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
