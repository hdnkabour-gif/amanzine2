import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import {
  Search, Mic, Camera, MapPin, ArrowLeft, Check, RotateCcw,
  MessageCircle, ShoppingBag, Eye, Plus, AlertTriangle, Phone, Heart, Sparkles, Truck,
} from 'lucide-react';
import { NEED_EXAMPLES, type NeedResult, type NeedOption } from '../lib/needEngine';
import { lastByIntent, getInteractions, setSatisfaction, type Interaction, type Via } from '../lib/experienceLog';
import { buildContext } from '../lib/core/context';
import { orchestrate, recordExperience, recordFeedback } from '../lib/core/orchestrator';
import { relatedProfessions } from '../lib/knowledge/graph';
import { playGate } from '../lib/gateTransition';
import UnderstandingCard from '../components/UnderstandingCard';
import type { Journey } from '../lib/core/plugins';
import type { Page } from '../types';

// ============================================================
// الصفحة الرئيسية «الحيّة». رأسها ثابت («شنو محتاج اليوم؟» + خانة)،
// لكن جسمها يحكي قصّة المستخدم — مشاهد (beats) تتغيّر حسب دوره وحالته،
// لا بطاقات ثابتة. بحدّ أقصى ٥ مشاهد (لا ازدحام). المشتري لا يرى المتجر.
// الذاكرة ليست قسمًا — تظهر داخل النتيجة نفسها.
// (الأسماء الداخلية لا تظهر للمستخدم إطلاقًا — كلّ ما يراه عربيّ طبيعيّ.)
// ============================================================

const MAX_BEATS = 5;
const VISIT_KEY = 'amanzine_last_visit';

interface Turn { who: 'sys' | 'user'; text: string }
interface Beat { id: string; icon: any; color: string; title: string; sub?: string; page?: Page; pr: number }
interface Dest { page?: Page; url?: string }

const destToStr = (d: Dest) => d.page ? `page:${d.page}` : d.url ? `url:${d.url}` : '';
const strToDest = (s: string): Dest => s.startsWith('page:') ? { page: s.slice(5) as Page } : s.startsWith('url:') ? { url: s.slice(4) } : {};

export default function LivingHome() {
  const { settings, products, orders, customers, conversations, setPage, user } = useStore();
  const [text, setText] = useState('');
  const [result, setResult] = useState<NeedResult | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [pending, setPending] = useState<NeedOption | null>(null);
  const [gapDays, setGapDays] = useState(0);
  const [fuDone, setFuDone] = useState(false);
  const [journey, setJourney] = useState<Journey | 'discover'>('discover');
  const [xpLog] = useState<Interaction[]>(getInteractions); // تفاعلات الجلسات السابقة (تُقرأ مرّة)

  useEffect(() => {
    try {
      const last = Number(localStorage.getItem(VISIT_KEY) || 0);
      if (last) setGapDays(Math.floor((Date.now() - last) / 86400000));
      localStorage.setItem(VISIT_KEY, String(Date.now()));
    } catch { /* noop */ }
  }, []);

  const greet = useMemo(() => {
    const h = new Date().getHours();
    const g = h < 12 ? 'صباح الخير' : h < 18 ? 'مرحباً' : 'مساء الخير';
    const name = (user as any)?.name?.split(' ')?.[0] || '';
    return name ? `${g} ${name} 👋` : `${g} 👋`;
  }, [user]);

  // ── مشاهد القصّة: من بيانات المستخدم الحقيقية، بصوت سرديّ ──
  const beats = useMemo(() => {
    const pending = orders.filter(o => o.status === 'pending').length;
    const unreadMsg = conversations.reduce((s, c: any) => s + (c.unread || 0), 0);
    const shipped = orders.filter(o => o.status === 'shipped' || o.status === 'delivered').length;
    const published = products.filter(p => p.status === 'published').length;
    const lowStock = products.filter(p => p.stock >= 0 && p.stock <= (settings.products?.lowStockAlert ?? 3)).length;
    const views = products.reduce((s, p: any) => s + (p.views || 0), 0);
    const seller = published > 0 || orders.length > 0 || products.length > 0;

    const b: Beat[] = [];
    if (pending > 0) b.push({ id: 'orders', icon: ShoppingBag, color: 'var(--warn,#F59E0B)', title: `عندك ${pending} طلب جداد كيتسنّاو`, sub: 'راجعهم قبل ما يبردو الزبناء', page: 'orders', pr: 96 });
    if (unreadMsg > 0) b.push({ id: 'msg', icon: MessageCircle, color: 'var(--purple,#8B5CF6)', title: `${unreadMsg} زبناء صيفطو ليك رسالة`, sub: 'ردّ عليهم دابا باش ما يمشيوش', page: 'conversations', pr: 90 });
    if (shipped > 0) b.push({ id: 'ship', icon: Truck, color: 'var(--mint,#12A150)', title: `${shipped} طلب فطريق التوصيل`, sub: 'تبّع وين وصلو', page: 'delivery', pr: 78 });
    if (seller && published === 0) b.push({ id: 'first', icon: Plus, color: 'var(--ember,#FF6A00)', title: 'بدا متجرك — زيد أوّل منتج', sub: 'فدقيقتين وتكون مفتوح للزبناء', page: 'products', pr: 82 });
    if (lowStock > 0) b.push({ id: 'stock', icon: AlertTriangle, color: 'var(--warn,#F59E0B)', title: `${lowStock} منتجات قربو يساليو`, sub: 'جدّد المخزون قبل ما يفوتك بيع', page: 'products', pr: 64 });
    if (seller && !settings.brand?.phone) b.push({ id: 'phone', icon: Phone, color: 'var(--info,#3B82F6)', title: 'زيد رقم تيليفونك', sub: 'باش يوصلو ليك الزبناء دغيا', page: 'settings', pr: 56 });
    if (seller && published > 0 && views > 0) b.push({ id: 'views', icon: Eye, color: 'var(--mint,#12A150)', title: `الناس كيشوفو متجرك — ${views.toLocaleString()} مشاهدة`, sub: 'هاد النشاط كيجيب طلبات', page: 'insights', pr: 52 });
    if (customers.length > 0) b.push({ id: 'cust', icon: Heart, color: 'var(--red,#F5484A)', title: `عندك ${customers.length} زبون فقاعدتك`, sub: 'صيفط ليهم شي عرض جديد', page: 'customers', pr: 40 });

    b.sort((x, y) => y.pr - x.pr);
    return { list: b.slice(0, MAX_BEATS), seller };
  }, [orders, conversations, products, customers, settings]);

  // Identity → Context: نبني سياق المستخدم الحاليّ قبل تفسير طلبه.
  const uctx = useMemo(() => buildContext({ products, orders, customers, conversations, settings }, { authed: !!user }),
    [products, orders, customers, conversations, settings, user]);

  const go = (dest: Dest, what: string, intent?: string, via: Via = 'type') => {
    if (intent) recordExperience({ object: result?.object, raw: text, intent, what, dest: destToStr(dest), via, journey, uctx });
    // البوّابة تنفتح ثمّ تأخذك لوجهتك — استعارة أمانزين (سريعة، آمنة، تحترم تقليل الحركة).
    if (dest.page) {
      const p = dest.page;
      // العقل يحمل الجملة معه: «بغيت نبيع تلفون» → النشر الموحّد يستخرجها تلقائيًّا بلا إعادة كتابة.
      if (p === 'publish') { try { sessionStorage.setItem('amanzine_publish_seed', result?.object?.raw || text); } catch { /* noop */ } }
      playGate(() => setPage(p));
      return;
    }
    if (dest.url) {
      // نمرّر الطلب للسوق فيبحث على الخادم فعلًا (ربط النيّة بالمحرّك الموحّد)
      let url = dest.url;
      if (url.startsWith('/market') || url.startsWith('/explore')) {
        const raw = result?.object?.raw || text;
        const sep = url.includes('?') ? '&' : '?';
        url += `${sep}q=${encodeURIComponent(raw)}`;
        const city = result?.object?.location;
        if (city) url += `&city=${encodeURIComponent(city)}`;
      }
      const target = url;
      playGate(() => { try { window.location.assign(target); } catch { /* noop */ } });
    }
  };

  const submit = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const { result: r, journey: j } = orchestrate(q, uctx); // Context → Orchestrator → Journey (+ تعلّم الخادم)
    setJourney(j);
    setText(q); setResult(r); setStepIdx(0); setPending(null);
    setTurns([{ who: 'user', text: q }, ...(r.open ? [{ who: 'sys' as const, text: r.open }] : [])]);
  };
  const reset = () => { setText(''); setResult(null); setTurns([]); setStepIdx(0); setPending(null); };

  const pickOption = (opt: NeedOption) => {
    setTurns(t => [...t, { who: 'user', text: opt.label }]);
    const steps = result?.steps || [];
    if (stepIdx + 1 < steps.length) setStepIdx(i => i + 1);
    else setPending(opt);
  };
  const activeStep = result?.steps?.[stepIdx];
  const mem = result ? lastByIntent(result.intent, xpLog) : undefined; // ذاكرة تخصّ هذه النيّة (من تفاعلات سابقة)

  // متابعة تجربة سابقة (Life Memory مرئيّة): طلب حِرفيّ/عاجل من الأيام الماضية.
  const followUp = useMemo(() => {
    const now = Date.now();
    return xpLog.find(i => ['urgent', 'find_pro', 'rent', 'buy'].includes(i.intent) && now - i.at > 3600000 && now - i.at < 3 * 86400000);
  }, [xpLog]);
  const fuLabel = followUp ? (followUp.object?.profession || followUp.object?.category || followUp.what) : '';

  // Knowledge Graph: الخطوة المجاورة — «بعد صبّاغ، تحتاج أيضاً؟»
  const related = result ? relatedProfessions(result.object?.profession) : [];

  // «لماذا أرى هذا؟» — شفافية: كل مشهد بسببه
  const WHY: Record<string, string> = {
    orders: 'عندك طلبات بانتظار الموافقة',
    msg: 'زبناء صيفطو ليك رسائل',
    ship: 'عندك طلبات فطريق التوصيل',
    first: 'باقي ما نشرتي حتى منتج',
    stock: 'شي منتجات مخزونها قربو يسالي',
    phone: 'رقم هاتفك ناقص فالمتجر',
    views: 'الناس كيشوفو متجرك',
    cust: 'عندك زبناء فقاعدتك',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 4 }}>
      {/* Header — ثابت */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--ink3)', fontWeight: 700, marginBottom: 6 }}>{greet}</div>
        <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.1rem)', fontWeight: 900, letterSpacing: '-0.02em', margin: 0, color: 'var(--ink1)' }}>
          شنو محتاج اليوم؟
        </h1>
      </div>

      {/* Input */}
      <form onSubmit={e => { e.preventDefault(); submit(text); }} style={{ maxWidth: 620, width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px', borderRadius: 16, background: 'var(--panel,rgba(255,255,255,.03))', border: '1.5px solid var(--border2,rgba(255,255,255,.14))' }}>
          <Search size={19} style={{ color: 'var(--ink3)', flexShrink: 0 }} />
          <input value={text} onChange={e => setText(e.target.value)}
            placeholder="كتب بالدارجة… مثلاً: الماء كيقطر ضروري"
            autoComplete="off"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink1)', fontSize: 15.5, fontWeight: 600, fontFamily: 'inherit', direction: 'rtl' }} />
          {text && (
            <button type="submit" aria-label="بحث" style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--ember,#FF6A00)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={18} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center' }}>
          {[{ i: Mic, l: 'تحدّث' }, { i: Camera, l: 'صورة' }, { i: MapPin, l: 'موقعي' }].map(m => (
            <button key={m.l} type="button" title={`${m.l} (قريبًا)`} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 11, border: '1px solid var(--border,rgba(255,255,255,.08))', background: 'var(--panel,rgba(255,255,255,.02))', color: 'var(--ink3)', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
              <m.i size={14} /> {m.l}
            </button>
          ))}
        </div>
      </form>

      {/* ── 🧠 «فهمنا طلبك» — إظهار الذكاء أثناء الكتابة (قبل البحث) ── */}
      {!result && <UnderstandingCard query={text} onAct={() => submit(text)} />}

      {/* ── نتيجة/محادثة نشطة ── */}
      {result && (
        <div style={{ maxWidth: 620, width: '100%', margin: '2px auto 0', display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: result.color, border: `1px solid ${result.color}`, borderRadius: 99, padding: '4px 11px' }}>{result.label}</span>
            {result.confidence != null && (
              <span title="درجة يقين الفهم" style={{ fontSize: 10.5, fontWeight: 800, borderRadius: 99, padding: '4px 9px', color: result.confidence >= 0.85 ? 'var(--mint,#12A150)' : result.confidence >= 0.5 ? 'var(--warn,#F59E0B)' : 'var(--ink3,#7E877F)', background: 'var(--panel,rgba(255,255,255,.04))', border: '1px solid var(--border,rgba(255,255,255,.08))' }}>
                يقين {Math.round(result.confidence * 100)}٪
              </span>
            )}
            {result.tags.map(tg => (
              <span key={tg} style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink2)', background: 'var(--panel,rgba(255,255,255,.04))', border: '1px solid var(--border,rgba(255,255,255,.08))', borderRadius: 99, padding: '4px 11px' }}>{tg}</span>
            ))}
            <button onClick={reset} style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: 'var(--ink3)', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
              <RotateCcw size={13} /> من جديد
            </button>
          </div>

          {/* ذاكرة منسوجة: تظهر داخل النتيجة إن سبق تعامل بنفس النيّة */}
          {mem && (
            <button onClick={() => go(strToDest(mem.dest), mem.what, result.intent, 'memory')} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px', borderRadius: 13, background: 'var(--panel,rgba(255,255,255,.04))', border: '1px dashed var(--border2,rgba(255,255,255,.16))', cursor: 'pointer', textAlign: 'start', fontFamily: 'inherit', width: '100%' }}>
              <span style={{ fontSize: 15 }}>↩️</span>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--ink2)' }}>آخر مرة مشيتي لـ <b style={{ color: 'var(--ink1)' }}>{mem.what}</b> — تعاود؟</span>
              <ArrowLeft size={15} style={{ color: 'var(--ink3)' }} />
            </button>
          )}

          {turns.map((tn, i) => (
            <div key={i} style={{ alignSelf: tn.who === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '10px 14px', borderRadius: 14, fontSize: 14, lineHeight: 1.5, fontWeight: tn.who === 'user' ? 700 : 500, background: tn.who === 'user' ? 'var(--ember,#FF6A00)' : 'var(--panel,rgba(255,255,255,.04))', color: tn.who === 'user' ? '#fff' : 'var(--ink1)', border: tn.who === 'user' ? 'none' : '1px solid var(--border,rgba(255,255,255,.08))' }}>
              {tn.text}
            </div>
          ))}
          {activeStep && !pending && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, alignSelf: 'flex-start', maxWidth: '92%' }}>
              <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 14, fontSize: 14, background: 'var(--panel,rgba(255,255,255,.04))', color: 'var(--ink1)', border: '1px solid var(--border,rgba(255,255,255,.08))' }}>{activeStep.q}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {activeStep.options.map(opt => (
                  <button key={opt.label} onClick={() => pickOption(opt)} style={{ padding: '9px 14px', borderRadius: 12, border: '1.5px solid var(--border2,rgba(255,255,255,.14))', background: 'var(--panel,rgba(255,255,255,.03))', color: 'var(--ink1)', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{opt.label}</button>
                ))}
              </div>
            </div>
          )}
          {(pending || !result.steps) && (
            <DestinationCard next={pending?.next || result.next}
              onGo={() => {
                const dest: Dest = pending ? { page: pending.page, url: pending.url } : { page: result.page, url: result.url };
                go(dest, pending?.label || result.tags[0] || result.label, result.intent, pending ? 'guided' : 'type');
              }} />
          )}

          {/* Knowledge Graph — الخطوة المجاورة (بلا بحث) */}
          {related.length > 0 && (pending || !result.steps) && (
            <div style={{ marginTop: 2 }}>
              <div style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 800, marginBottom: 8 }}>بعد {result.object?.profession}، واش تحتاج حتى؟</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {related.map(r => (
                  <button key={r} onClick={() => submit(`بغيت ${r}`)}
                    style={{ padding: '8px 13px', borderRadius: 99, border: '1px solid var(--border2,rgba(255,255,255,.14))', background: 'var(--panel,rgba(255,255,255,.03))', color: 'var(--ink1)', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                    + {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── القصّة الحيّة (بلا استعلام نشط) ── */}
      {!result && (
        <div style={{ maxWidth: 620, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* متابعة تجربة سابقة + Feedback Loop — «كنت كتقلب على… لقيتي؟» */}
          {followUp && fuLabel && !fuDone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 15px', borderRadius: 15, background: 'var(--panel,rgba(255,255,255,.04))', border: '1px solid color-mix(in srgb, var(--ember,#FF6A00) 28%, transparent)' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>🔁</span>
              <span style={{ flex: '1 1 150px', fontSize: 13.5, color: 'var(--ink1)', lineHeight: 1.5 }}>كنت كتقلب على <b>{fuLabel}</b> — لقيتي؟</span>
              <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                <button onClick={() => { setSatisfaction(followUp.at, true); recordFeedback(true, { raw: followUp.object?.raw || followUp.raw, intent: followUp.intent, city: uctx.place.city }); setFuDone(true); }}
                  style={{ padding: '7px 12px', borderRadius: 10, border: 'none', background: 'var(--mint,#12A150)', color: '#fff', fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>👍 حليت</button>
                <button onClick={() => { setSatisfaction(followUp.at, false); recordFeedback(false, { raw: followUp.object?.raw || followUp.raw, intent: followUp.intent, city: uctx.place.city }); submit(followUp.object?.raw || followUp.raw); }}
                  style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid var(--border2,rgba(255,255,255,.14))', background: 'transparent', color: 'var(--ink2,#B9C0BA)', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>👎 عاود</button>
              </div>
            </div>
          )}

          {gapDays >= 3 && beats.list.length > 0 && (
            <div style={{ borderRadius: 14, padding: '12px 15px', background: 'var(--ember-soft,rgba(255,106,0,.08))', border: '1px solid color-mix(in srgb, var(--ember,#FF6A00) 30%, transparent)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles size={17} style={{ color: 'var(--ember,#FF6A00)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--ink1)', fontWeight: 650 }}>اشتقنا ليك 😊 فاتوك {beats.list.length} حوايج ملّي غبتي</span>
            </div>
          )}

          {/* المشاهد كقصّة: خيط رابط + مشهد رئيسيّ في الأعلى */}
          {beats.list.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {beats.list.map((s, i) => {
                const lead = i === 0;
                return (
                  <div key={s.id} style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                    {/* rail */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ width: lead ? 44 : 38, height: lead ? 44 : 38, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, background: 'color-mix(in srgb, currentColor 15%, transparent)', border: `1px solid color-mix(in srgb, ${s.color} 35%, transparent)` }}><s.icon size={lead ? 21 : 18} /></span>
                      {i < beats.list.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 14, background: 'var(--border2,rgba(255,255,255,.12))', marginTop: 3 }} />}
                    </div>
                    {/* beat */}
                    <button onClick={() => s.page && setPage(s.page)} style={{ flex: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, padding: lead ? '15px 16px' : '12px 15px', borderRadius: 15, textAlign: 'start', fontFamily: 'inherit', cursor: 'pointer', width: '100%', border: `1px solid ${lead ? 'color-mix(in srgb, ' + s.color + ' 32%, transparent)' : 'var(--border,rgba(255,255,255,.08))'}`, background: lead ? `linear-gradient(120deg, color-mix(in srgb, ${s.color} 10%, transparent), var(--panel,rgba(255,255,255,.03)))` : 'var(--panel,rgba(255,255,255,.03))' }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: lead ? 15.5 : 14, fontWeight: 800, color: 'var(--ink1)' }}>{s.title}</span>
                        {s.sub && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink3)', marginTop: 2 }}>{s.sub}</span>}
                        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink3)', opacity: 0.85, marginTop: 3 }}>ليه كتشوف هادشي؟ {WHY[s.id] || 'مبنيّ على حالتك'}</span>
                      </span>
                      <ArrowLeft size={16} style={{ color: 'var(--ink3)', flexShrink: 0 }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {beats.list.length === 0 && (
            <button onClick={() => setPage('products')} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '15px', borderRadius: 15, background: 'var(--ember-soft,rgba(255,106,0,.08))', border: '1px solid color-mix(in srgb, var(--ember,#FF6A00) 30%, transparent)', cursor: 'pointer', textAlign: 'start', fontFamily: 'inherit', width: '100%' }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ember,#FF6A00)', background: 'color-mix(in srgb, var(--ember,#FF6A00) 14%, transparent)' }}><Plus size={19} /></span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 750, color: 'var(--ink1)' }}>{beats.seller ? 'بدا متجرك' : 'بغيت تبيع شي حاجة؟'}</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--ink3)', marginTop: 1 }}>زيد أول منتج أو خدمة فدقيقتين</span>
              </span>
              <ArrowLeft size={16} style={{ color: 'var(--ink3)', flexShrink: 0 }} />
            </button>
          )}

          {/* أمثلة تدرّب المستخدم على الكتابة الطبيعية */}
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink3)', fontWeight: 800, marginBottom: 9 }}>ولا قول لينا شنو محتاج:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {NEED_EXAMPLES.slice(0, 6).map(ex => (
                <button key={ex} onClick={() => submit(ex)} style={{ padding: '8px 14px', borderRadius: 99, border: '1px solid var(--border2,rgba(255,255,255,.14))', background: 'var(--panel,rgba(255,255,255,.03))', color: 'var(--ink1)', fontSize: 13, fontWeight: 650, fontFamily: 'inherit', cursor: 'pointer' }}>{ex}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DestinationCard({ next, onGo }: { next: string; onGo: () => void }) {
  return (
    <div style={{ marginTop: 2, border: '1.5px solid var(--ember,#FF6A00)', borderRadius: 15, padding: 15, background: 'var(--ember-soft,rgba(255,106,0,.08))', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13.5, color: 'var(--ink1)', lineHeight: 1.6 }}>
        <Check size={17} style={{ color: 'var(--ember,#FF6A00)', flexShrink: 0, marginTop: 2 }} />
        <span>{next}</span>
      </div>
      <button onClick={onGo} style={{ padding: '11px 16px', borderRadius: 12, border: 'none', background: 'var(--ember,#FF6A00)', color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        يالله نمشيو <ArrowLeft size={17} />
      </button>
    </div>
  );
}
