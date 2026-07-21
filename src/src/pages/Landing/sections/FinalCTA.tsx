import { t } from '../../../i18n/translations';
import { Section, Reveal } from '../components';
import { useLanding } from '../context';
import { C } from '../theme';

export default function FinalCTA() {
  const { lang, tx, isAuthed, Arrow, startDemo } = useLanding();
  return (
    <Section>
      <Reveal>
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 28, padding: 'clamp(36px,6vw,64px) clamp(20px,5vw,40px)', textAlign: 'center', background: `linear-gradient(135deg, ${C.orange}, ${C.purple})`, boxShadow: `0 24px 70px ${C.orange}33` }}>
          <div style={{ position: 'absolute', top: '-40%', insetInlineStart: '50%', transform: 'translateX(-50%)', width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 65%)', pointerEvents: 'none' }} />
          <h2 style={{ position: 'relative', fontSize: 'clamp(24px,4.5vw,40px)', fontWeight: 900, margin: '0 0 12px', letterSpacing: '-0.02em', color: '#fff' }}>{tx('ctaTitle')}</h2>
          <p style={{ position: 'relative', fontSize: 'clamp(13px,1.8vw,16px)', color: 'rgba(255,255,255,0.92)', maxWidth: 520, margin: '0 auto 26px', lineHeight: 1.7 }}>{tx('ctaSub')}</p>
          <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <a href={isAuthed ? '/dashboard' : '/login'} className="lpbtn" style={{ position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', gap: 9, padding: '15px 34px', borderRadius: 14, background: '#fff', color: C.orangeD, fontSize: 15.5, fontWeight: 800, textDecoration: 'none', boxShadow: '0 12px 30px rgba(0,0,0,0.18)' }}><span className="sh" />{isAuthed ? t(lang, 'landing.merchant.ctaExisting') : t(lang, 'landing.merchant.ctaNew')} <Arrow size={18} /></a>
            <button onClick={startDemo} style={{ padding: '15px 28px', borderRadius: 14, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', fontSize: 14.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>{t(lang, 'landing.demo')}</button>
            <a href="/market" style={{ padding: '15px 24px', borderRadius: 14, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', fontSize: 14.5, fontWeight: 800, textDecoration: 'none' }}>{tx('browseMarket')}</a>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
