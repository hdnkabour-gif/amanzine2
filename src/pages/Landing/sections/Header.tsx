import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { LANGS } from '../../../i18n/translations';
import { C } from '../theme';
import { useScrolled } from '../hooks';
import { useLanding } from '../context';

export default function Header() {
  const { lang, setLang, isRtl, tx, isAuthed } = useLanding();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const scrolled = useScrolled(16);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (langRef.current && !langRef.current.contains(e.target as Node)) setShowLangMenu(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const curLang = LANGS.find(l => l.code === lang) || LANGS[0];

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, height: 64, padding: '0 clamp(14px,4vw,40px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: scrolled ? 'rgba(248,250,252,0.85)' : 'transparent', backdropFilter: scrolled ? 'blur(16px)' : 'none', WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none', borderBottom: `1px solid ${scrolled ? C.border : 'transparent'}`, transition: 'background .3s, border-color .3s', animation: 'lpIn .5s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <img src="/brand/amanzine-logo.png" alt="AMANZINE" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement as HTMLElement).innerHTML = '<span style="font-size:17px;font-weight:900;color:#006233">A</span>'; }} />
        </div>
        <span style={{ fontWeight: 900, fontSize: 16.5, letterSpacing: '-0.02em', color: '#006233' }}>AMAN<span style={{ color: '#C1272D' }}>Z</span>INE</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div ref={langRef} style={{ position: 'relative' }}>
          <button onClick={() => setShowLangMenu(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 11px', borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.ink2, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {curLang.flag} <span className="hide-xs">{curLang.label}</span>
            <ChevronDown size={10} style={{ transform: showLangMenu ? 'rotate(180deg)' : 'none', transition: '.2s' }} />
          </button>
          {showLangMenu && (
            <div className="lpmenu" style={{ position: 'absolute', top: '120%', [isRtl ? 'right' : 'left']: 0, minWidth: 150, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: C.shadowH, zIndex: 100 } as any}>
              {LANGS.map(l => (
                <button key={l.code} onClick={() => { setLang(l.code); setShowLangMenu(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', background: l.code === lang ? `${C.orange}12` : 'transparent', border: 'none', color: l.code === lang ? C.orangeD : C.ink2, fontSize: 13, fontWeight: l.code === lang ? 800 : 500, cursor: 'pointer', fontFamily: 'inherit', textAlign: isRtl ? 'right' : 'left' }}>{l.flag} {l.label}</button>
              ))}
            </div>
          )}
        </div>
        <a href="/market" className="hide-xs" style={{ padding: '9px 14px', borderRadius: 10, background: `${C.orange}12`, border: `1px solid ${C.orange}33`, color: C.orangeD, fontSize: 12.5, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}>{tx('market')}</a>
        {isAuthed
          ? <a href="/dashboard" style={{ padding: '9px 16px', borderRadius: 10, background: `linear-gradient(135deg, ${C.orange}, ${C.orangeD})`, color: '#fff', fontSize: 12.5, fontWeight: 800, textDecoration: 'none' }}>{tx('dashboard')}</a>
          : <a href="/login" style={{ padding: '9px 16px', borderRadius: 10, background: C.ink, color: '#fff', fontSize: 12.5, fontWeight: 800, textDecoration: 'none' }}>{tx('login')}</a>}
      </div>
    </header>
  );
}
