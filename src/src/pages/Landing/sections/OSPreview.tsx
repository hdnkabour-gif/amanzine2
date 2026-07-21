import { useEffect, useRef } from 'react';
import { type Lang } from '../../../i18n/translations';
import { C } from '../theme';
import { useLanding } from '../context';
import { Reveal, Section, SecHead } from '../components';
import { SAMPLES, type Listing } from '../data';

// نصوص مُحلّية لهذا القسم (5 لغات)
const TXT: Record<Lang, { title: string; sub: string; hint: string; dash: string; orders: string; ai: string; visits: string; ord: string; new: string; ship: string; urgent: string; aiQ: string; aiA: string }> = {
  ar:     { title: 'نظامك كاملاً في مكان واحد', sub: 'جرّبه قبل أن تسجّل — اسحب أي نافذة بشريطها العلوي.', hint: '👆 اسحب النوافذ', dash: 'لوحة التحكم', orders: 'الطلبات الحيّة', ai: 'مساعد AMANZINE', visits: 'الزيارات', ord: 'الطلبات', new: 'جديد', ship: 'شُحن', urgent: 'عاجل', aiQ: 'بغيت تليفون سامسونج', aiA: '🌟 هاهوما أحسن 3 هواتف متوفرة دابا…' },
  darija: { title: 'نظامك كامل ف بلاصة وحدة', sub: 'جرّبو قبل ما تسجّل — جرّ أي نافذة من الشريط ديالها.', hint: '👆 جرّ النوافذ', dash: 'لوحة التحكم', orders: 'الطلبات مباشرة', ai: 'مساعد AMANZINE', visits: 'الزيارات', ord: 'الطلبات', new: 'جديد', ship: 'تشحن', urgent: 'عاجل', aiQ: 'بغيت تليفون سامسونج', aiA: '🌟 هاهوما أحسن 3 هواتف موجودين دابا…' },
  fr:     { title: 'Tout votre système au même endroit', sub: 'Essayez avant de vous inscrire — glissez une fenêtre par sa barre.', hint: '👆 Glissez les fenêtres', dash: 'Tableau de bord', orders: 'Commandes en direct', ai: 'Assistant AMANZINE', visits: 'Visites', ord: 'Commandes', new: 'Nouveau', ship: 'Expédié', urgent: 'Urgent', aiQ: 'Je veux un téléphone Samsung', aiA: '🌟 Voici les 3 meilleurs téléphones dispo…' },
  en:     { title: 'Your whole system in one place', sub: 'Try it before signing up — drag any window by its top bar.', hint: '👆 Drag the windows', dash: 'Dashboard', orders: 'Live orders', ai: 'AMANZINE assistant', visits: 'Visits', ord: 'Orders', new: 'New', ship: 'Shipped', urgent: 'Urgent', aiQ: 'I want a Samsung phone', aiA: '🌟 Here are the top 3 phones in stock…' },
  zh:     { title: '你的整个系统集于一处', sub: '注册前先试用 — 拖动任意窗口的顶栏。', hint: '👆 拖动窗口', dash: '控制台', orders: '实时订单', ai: 'AMANZINE 助手', visits: '访问', ord: '订单', new: '新', ship: '已发货', urgent: '紧急', aiQ: '我想要三星手机', aiA: '🌟 以下是有货的前 3 款手机…' },
};

export default function OSPreview() {
  const { lang, listings } = useLanding();
  const x = TXT[lang] || TXT.ar;
  const rootRef = useRef<HTMLDivElement>(null);
  const ords: Listing[] = (listings.length ? listings : SAMPLES).slice(0, 3);

  // نوافذ قابلة للسحب (mouse + touch)
  useEffect(() => {
    const root = rootRef.current; if (!root) return;
    const wins = Array.from(root.querySelectorAll<HTMLElement>('[data-drag]'));
    const cleanups: Array<() => void> = [];
    wins.forEach(win => {
      const bar = win.querySelector<HTMLElement>('[data-bar]'); if (!bar) return;
      let drag = false, sx = 0, sy = 0, ox = 0, oy = 0;
      const start = (cx: number, cy: number) => {
        drag = true; sx = cx; sy = cy;
        const r = win.getBoundingClientRect(), p = root.getBoundingClientRect();
        ox = r.left - p.left; oy = r.top - p.top;
        win.style.zIndex = '99'; win.style.insetInlineEnd = 'auto';
        win.style.left = ox + 'px'; win.style.insetInlineStart = ox + 'px'; win.style.top = oy + 'px';
      };
      const move = (cx: number, cy: number) => { if (!drag) return; const nx = ox + (cx - sx), ny = oy + (cy - sy); win.style.left = nx + 'px'; win.style.insetInlineStart = nx + 'px'; win.style.top = ny + 'px'; };
      const end = () => { drag = false; };
      const md = (e: MouseEvent) => { e.preventDefault(); start(e.clientX, e.clientY); };
      const mm = (e: MouseEvent) => move(e.clientX, e.clientY);
      const ts = (e: TouchEvent) => start(e.touches[0].clientX, e.touches[0].clientY);
      const tm = (e: TouchEvent) => move(e.touches[0].clientX, e.touches[0].clientY);
      bar.addEventListener('mousedown', md); window.addEventListener('mousemove', mm); window.addEventListener('mouseup', end);
      bar.addEventListener('touchstart', ts, { passive: true }); window.addEventListener('touchmove', tm, { passive: true }); window.addEventListener('touchend', end);
      cleanups.push(() => { bar.removeEventListener('mousedown', md); window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', end); bar.removeEventListener('touchstart', ts); window.removeEventListener('touchmove', tm); window.removeEventListener('touchend', end); });
    });
    return () => cleanups.forEach(f => f());
  }, [listings.length]);

  const dot = (c: string) => <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />;
  const barStyle: React.CSSProperties = { height: 34, display: 'flex', alignItems: 'center', gap: 7, padding: '0 12px', background: C.alt, borderBottom: `1px solid ${C.border}`, cursor: 'grab' };
  const winStyle: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: C.shadowH, overflow: 'hidden' };
  const title: React.CSSProperties = { marginInlineStart: 'auto', fontSize: 11, color: C.ink3, fontWeight: 800 };
  const chip = (bg: string, col: string): React.CSSProperties => ({ marginInlineStart: 'auto', fontSize: 9.5, fontWeight: 800, padding: '3px 9px', borderRadius: 99, background: bg, color: col });

  return (
    <Section alt>
      <Reveal><SecHead title={x.title} sub={x.sub} /></Reveal>
      <Reveal>
        <div ref={rootRef} className="osdesk" style={{ marginTop: 30 }}>
          {/* لوحة التحكم */}
          <div className="oswin osw1" data-drag style={winStyle}>
            <div data-bar style={barStyle}>{dot('#FF5F57')}{dot('#FEBC2E')}{dot('#28C840')}<span style={title}>📊 {x.dash}</span></div>
            <div style={{ padding: 14 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                {[{ n: '12,450', l: x.visits, c: C.blue }, { n: '8,921', l: x.ord, c: C.orange }, { n: '284K', l: 'DH', c: C.green }].map((k, i) => (
                  <div key={i} style={{ flex: 1, background: C.alt, borderRadius: 11, padding: 11, textAlign: 'center' }}>
                    <b style={{ fontSize: 17, color: k.c }}>{k.n}</b><span style={{ display: 'block', fontSize: 10, color: C.ink3, marginTop: 2 }}>{k.l}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 84 }}>
                {[40, 65, 45, 80, 60, 95, 70].map((h, i) => <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '5px 5px 0 0', background: i === 5 ? `linear-gradient(${C.orange}, ${C.orangeD})` : C.alt, border: `1px solid ${C.border}` }} />)}
              </div>
            </div>
          </div>

          {/* الطلبات الحيّة */}
          <div className="oswin osw2" data-drag style={winStyle}>
            <div data-bar style={barStyle}>{dot('#FF5F57')}{dot('#FEBC2E')}{dot('#28C840')}<span style={title}>🛒 {x.orders}</span></div>
            <div style={{ padding: 14 }}>
              {ords.map((o, i) => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < ords.length - 1 ? `1px solid ${C.border}` : 'none', fontSize: 12.5 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: C.alt, display: 'grid', placeItems: 'center', fontSize: 15 }}>{o.emoji || (o.type === 'service' ? '🛠️' : '🛍️')}</span>
                  <div style={{ minWidth: 0 }}><b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: C.ink }}>{o.name}</b><span style={{ color: C.ink3, fontSize: 10 }}>{o.city || '—'} · {o.price} DH</span></div>
                  <span style={chip(i === 0 ? `${C.green}22` : i === 1 ? `${C.orange}22` : `${C.blue}22`, i === 0 ? C.green : i === 1 ? C.orangeD : C.blue)}>{i === 0 ? x.new : i === 1 ? x.urgent : x.ship}</span>
                </div>
              ))}
            </div>
          </div>

          {/* مساعد AMANZINE */}
          <div className="oswin osw3" data-drag style={winStyle}>
            <div data-bar style={barStyle}>{dot('#FF5F57')}{dot('#FEBC2E')}{dot('#28C840')}<span style={title}>🤖 {x.ai}</span></div>
            <div style={{ padding: 14 }}>
              <div style={{ maxWidth: '85%', marginInlineStart: 'auto', background: C.orange, color: '#fff', padding: '9px 13px', borderRadius: '13px 13px 3px 13px', fontSize: 12.5, marginBottom: 9 }}>{x.aiQ}</div>
              <div style={{ maxWidth: '88%', background: C.alt, color: C.ink, padding: '9px 13px', borderRadius: '13px 13px 13px 3px', fontSize: 12.5, marginBottom: 9 }}>{x.aiA}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: C.alt, borderRadius: 12, padding: 10 }}>
                <span style={{ width: 34, height: 34, borderRadius: 8, background: C.surface, display: 'grid', placeItems: 'center', border: `1px solid ${C.border}` }}>📱</span>
                <div><b style={{ fontSize: 11, color: C.ink }}>Galaxy A55</b><br /><span style={{ color: C.orange, fontWeight: 900, fontSize: 12 }}>3,200 DH</span></div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
      <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, fontWeight: 700, color: C.ink3 }}>{x.hint}</div>
    </Section>
  );
}
