import { useLanding } from '../context';
import { C } from '../theme';

export default function Footer() {
  const { tx } = useLanding();
  const links = [
    { label: tx('lnkMarket'), href: '/market' },
    { label: tx('lnkHow'), href: '#how' },
    { label: tx('lnkPricing'), href: '#pricing' },
    { label: tx('lnkFaq'), href: '#faq' },
  ];
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, background: C.surface, padding: 'clamp(30px,5vw,44px) clamp(16px,5vw,40px)', textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <img src="/brand/amanzine-logo.png" alt="AMANZINE" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement as HTMLElement).innerHTML = '<span style="font-size:13px;font-weight:900;color:#006233">A</span>'; }} />
        </div>
        <span style={{ fontWeight: 900, fontSize: 15, color: '#006233' }}>AMAN<span style={{ color: '#C1272D' }}>Z</span>INE</span>
      </div>
      <p style={{ fontSize: 12.5, color: C.ink2, maxWidth: 460, margin: '0 auto 14px', lineHeight: 1.7 }}>{tx('footTagline')}</p>

      {/* روابط سريعة */}
      <nav style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 16 }}>
        {links.map(l => (
          <a key={l.label} href={l.href} style={{ fontSize: 12.5, color: C.ink2, fontWeight: 700, textDecoration: 'none' }}>{l.label}</a>
        ))}
      </nav>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 12, marginBottom: 14 }}>
        <a href="https://wa.me/212649200188" target="_blank" rel="noreferrer" style={{ color: '#16A34A', fontWeight: 700, textDecoration: 'none' }}>💬 +212 649 200 188</a>
        <a href="https://wa.me/212612265893" target="_blank" rel="noreferrer" style={{ color: '#16A34A', fontWeight: 700, textDecoration: 'none' }}>💬 +212 612 265 893</a>
        <span style={{ color: C.ink3 }}>📍 Casablanca, Maroc</span>
      </div>
      <div style={{ fontSize: 11, color: C.ink3, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
        <span style={{ color: '#B07A2B', fontWeight: 700 }}>AMANZINE © 2026</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>{tx('footRights')}</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>{tx('creditPrefix')}: <a href="https://wa.me/212649200188" target="_blank" rel="noreferrer" style={{ color: C.orangeD, fontWeight: 700, textDecoration: 'none' }}>Alloservix · Abdellatif hadana</a></span>
      </div>
    </footer>
  );
}
