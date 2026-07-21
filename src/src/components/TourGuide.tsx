import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { useT, useLang, isRtlLang } from '../i18n';

interface StepConfig {
  page: string;
  key: string;
  icon: string;
  gradient: [string, string];
  accentBg: string;
  bullets: string[];
}

const STEPS: StepConfig[] = [
  {
    page: 'dashboard',
    key: 's1',
    icon: '📊',
    gradient: ['#FF6A00', '#C9954C'],
    accentBg: 'rgba(255,106,0,.08)',
    bullets: ['nav.orders', 'nav.customers', 'nav.analytics'],
  },
  {
    page: 'products',
    key: 's2',
    icon: '📦',
    gradient: ['#a78bfa', '#7C3AED'],
    accentBg: 'rgba(167,139,250,.08)',
    bullets: ['nav.products', 'landing.feature.ai', 'landing.feature.banner'],
  },
  {
    page: 'orders',
    key: 's3',
    icon: '🛒',
    gradient: ['#F6C453', '#D97706'],
    accentBg: 'rgba(246,196,83,.08)',
    bullets: ['status.pending', 'status.approved', 'nav.delivery'],
  },
  {
    page: 'conversations',
    key: 's4',
    icon: '💬',
    gradient: ['#25D366', '#15A349'],
    accentBg: 'rgba(37,211,102,.08)',
    bullets: ['landing.feature.whatsapp', 'landing.feature.ai', 'nav.customers'],
  },
  {
    page: 'customers',
    key: 's5',
    icon: '👥',
    gradient: ['#60a5fa', '#2563EB'],
    accentBg: 'rgba(96,165,250,.08)',
    bullets: ['nav.customers', 'nav.orders', 'nav.analytics'],
  },
  {
    page: 'delivery',
    key: 's6',
    icon: '🚚',
    gradient: ['#00D2B3', '#0D9488'],
    accentBg: 'rgba(0,210,179,.08)',
    bullets: ['landing.feature.delivery', 'status.shipped', 'status.delivered'],
  },
  {
    page: 'connections',
    key: 's7',
    icon: '🔗',
    gradient: ['#f472b6', '#BE185D'],
    accentBg: 'rgba(244,114,182,.08)',
    bullets: ['landing.feature.whatsapp', 'landing.feature.ai', 'landing.feature.secure'],
  },
  {
    page: 'settings',
    key: 's8',
    icon: '⚙️',
    gradient: ['#94a3b8', '#475569'],
    accentBg: 'rgba(148,163,184,.08)',
    bullets: ['settings.storeName', 'settings.language', 'settings.theme'],
  },
  {
    page: 'store',
    key: 's9',
    icon: '🌐',
    gradient: ['#FF6A00', '#00D2B3'],
    accentBg: 'rgba(255,106,0,.06)',
    bullets: ['landing.customer.f1', 'landing.customer.f2', 'landing.customer.f3'],
  },
];

const TOUR_KEY = (userId: string) => `tour_done_${userId}`;

export default function TourGuide() {
  const { setPage, user } = useStore();
  const T = useT();
  const lang = useLang();
  const isRtl = isRtlLang(lang);

  const [active, setActive] = useState(false);
  const [launcher, setLauncher] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<'fwd' | 'bwd'>('fwd');
  const [animKey, setAnimKey] = useState(0);
  const [exiting, setExiting] = useState(false);

  const userId = user?.id || 'guest';

  // الجولة اختياريّة (opt-in): لا تُعتِّم الصفحة دون طلب. للزائر الجديد نُظهر
  // لافتة صغيرة غير حاجبة، وهو يقرّر. هذا يُسرّع الفهم الأوّل ولا يفرض شيئًا.
  useEffect(() => {
    try {
      if (!localStorage.getItem(TOUR_KEY(userId))) setLauncher(true);
    } catch {}
  }, [userId]);

  const dismissLauncher = useCallback(() => {
    setLauncher(false);
    try { localStorage.setItem(TOUR_KEY(userId), '1'); } catch {}
  }, [userId]);

  const startTour = useCallback(() => { setLauncher(false); setActive(true); }, []);

  const finish = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setActive(false);
      setExiting(false);
      try { localStorage.setItem(TOUR_KEY(userId), '1'); } catch {}
    }, 350);
  }, [userId]);

  const goTo = useCallback((idx: number, direction: 'fwd' | 'bwd' = 'fwd') => {
    if (idx < 0 || idx >= STEPS.length) return;
    setDir(direction);
    setAnimKey(k => k + 1);
    setStep(idx);
    const target = STEPS[idx].page;
    if (target !== 'store') setPage(target as any);
  }, [setPage]);

  const next = () => step < STEPS.length - 1 ? goTo(step + 1, 'fwd') : finish();
  const prev = () => step > 0 ? goTo(step - 1, 'bwd') : undefined;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!active) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prev();
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [active, step]);

  // لافتة الدعوة (غير حاجبة) — تظهر للزائر الجديد فقط، ويقرّر هو.
  if (!active) {
    if (!launcher) return null;
    return (
      <div dir={isRtl ? 'rtl' : 'ltr'} style={{ position: 'fixed', bottom: 'max(18px, env(safe-area-inset-bottom))', insetInlineEnd: 18, zIndex: 8000, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px 9px 15px', borderRadius: 99, background: 'var(--panel, #111827)', border: '1px solid rgba(255,255,255,.12)', boxShadow: '0 14px 40px rgba(0,0,0,.4)', animation: 'tourLauncherIn .4s cubic-bezier(.4,0,.2,1) both', fontFamily: 'inherit' }}>
        <style>{`@keyframes tourLauncherIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <button onClick={startTour} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--ink1,#FAFAFA)', fontSize: 13.5, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
          <span aria-hidden="true">🧭</span> {isRtl ? 'جولة سريعة (٣٠ ثانية)' : 'Quick tour (30s)'}
        </button>
        <button onClick={dismissLauncher} aria-label={isRtl ? 'إغلاق' : 'Dismiss'} style={{ width: 24, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 99, background: 'rgba(255,255,255,.06)', border: 'none', color: 'var(--ink3,#7E877F)', fontSize: 15, lineHeight: 1, cursor: 'pointer', fontFamily: 'inherit' }}>×</button>
      </div>
    );
  }

  const cur   = STEPS[step];
  const [g1, g2] = cur.gradient;
  const progress  = ((step + 1) / STEPS.length) * 100;
  const slideIn   = dir === 'fwd' ? '30px' : '-30px';

  return (
    <>
      <style>{`
        @keyframes tourFadeIn { from{opacity:0;transform:translateY(${slideIn})} to{opacity:1;transform:translateY(0)} }
        @keyframes tourFadeOut { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(20px) scale(.97)} }
        @keyframes tourIconPop { 0%{transform:scale(.7) rotate(-8deg);opacity:0} 60%{transform:scale(1.1) rotate(2deg)} 100%{transform:scale(1) rotate(0deg);opacity:1} }
        @keyframes tourBarGrow { from{width:0} to{width:100%} }
        .tour-step-content { animation: tourFadeIn .35s cubic-bezier(.4,0,.2,1) both; }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={finish}
        style={{
          position: 'fixed', inset: 0, zIndex: 88880,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          opacity: exiting ? 0 : 1,
          transition: 'opacity .35s ease',
        }}
      />

      {/* Tour panel */}
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 88881,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: 'min(96vw, 480px)',
            background: 'var(--panel, #111827)',
            borderRadius: 28,
            overflow: 'hidden',
            boxShadow: `0 40px 100px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.06), 0 0 60px ${g1}20`,
            border: `1px solid ${g1}28`,
            opacity: exiting ? 0 : 1,
            transform: exiting ? 'scale(.95) translateY(16px)' : 'scale(1) translateY(0)',
            transition: 'opacity .35s ease, transform .35s cubic-bezier(.4,0,.2,1)',
            pointerEvents: 'auto',
          }}
        >
          {/* Progress bar */}
          <div style={{ height: 3, background: 'rgba(255,255,255,.05)' }}>
            <div style={{
              height: '100%',
              background: `linear-gradient(90deg,${g1},${g2})`,
              width: `${progress}%`,
              transition: 'width .4s cubic-bezier(.4,0,.2,1)',
              boxShadow: `0 0 8px ${g1}80`,
            }} />
          </div>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {STEPS.map((_, i) => (
                <button key={i} onClick={() => goTo(i, i > step ? 'fwd' : 'bwd')}
                  style={{
                    width: i === step ? 22 : 7, height: 7,
                    borderRadius: 4, border: 'none', cursor: 'pointer', padding: 0,
                    background: i < step ? `${g1}88` : i === step ? `linear-gradient(90deg,${g1},${g2})` : 'rgba(255,255,255,.12)',
                    transition: 'all .28s',
                    backgroundImage: i === step ? `linear-gradient(90deg,${g1},${g2})` : undefined,
                  }}
                />
              ))}
            </div>
            <button
              onClick={finish}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,.08)',
                background: 'rgba(255,255,255,.05)', color: 'rgba(255,255,255,.35)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {T('tour.skip')} ×
            </button>
          </div>

          {/* Content */}
          <div
            key={animKey}
            className="tour-step-content"
            style={{ padding: '22px 24px 20px' }}
          >
            {/* Icon + step number */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 18 }}>
              <div style={{
                width: 72, height: 72, borderRadius: 22, flexShrink: 0,
                background: cur.accentBg,
                border: `2px solid ${g1}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 34,
                boxShadow: `0 8px 32px ${g1}18, inset 0 0 0 1px ${g1}12`,
                animation: 'tourIconPop .4s cubic-bezier(.4,0,.2,1) both',
              }}>
                {cur.icon}
              </div>
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: g1, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 5, opacity: .8 }}>
                  {T('tour.step', { cur: String(step + 1), total: String(STEPS.length) })}
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink1,#E8E4DC)', margin: 0, lineHeight: 1.2 }}>
                  {T(`tour.${cur.key}.title`)}
                </h2>
              </div>
            </div>

            {/* Description */}
            <p style={{
              fontSize: 14, color: 'var(--ink2,#B8B0A4)',
              lineHeight: 1.75, marginBottom: 18,
            }}>
              {T(`tour.${cur.key}.desc`)}
            </p>

            {/* Feature pills */}
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
              {cur.bullets.map(bKey => (
                <span key={bKey} style={{
                  fontSize: 11, padding: '4px 11px', borderRadius: 99,
                  background: cur.accentBg,
                  border: `1px solid ${g1}22`,
                  color: g1, fontWeight: 700,
                }}>
                  {T(bKey)}
                </span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '14px 20px 18px',
            borderTop: '1px solid rgba(255,255,255,.05)',
          }}>
            <span style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,.2)', fontWeight: 500 }}>
              {step + 1} / {STEPS.length}
            </span>

            {step > 0 && (
              <button onClick={prev} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '8px 16px', borderRadius: 12,
                background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)',
                color: 'var(--ink2,#B8B0A4)', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {isRtl ? '→' : '←'} {T('tour.prev')}
              </button>
            )}

            <button onClick={next} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 22px', borderRadius: 12,
              background: `linear-gradient(135deg,${g1},${g2})`,
              border: 'none',
              color: '#fff', fontSize: 13, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: `0 4px 20px ${g1}44`,
              transition: 'filter .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
            >
              {step < STEPS.length - 1
                ? <>{T('tour.next')} {isRtl ? '←' : '→'}</>
                : T('tour.finish')
              }
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
