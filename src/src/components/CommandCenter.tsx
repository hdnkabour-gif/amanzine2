import { useEffect, useState, type ReactElement } from 'react';
import {
  ShoppingBag, MessageCircle, Calendar, PackageX, ChevronLeft,
  Sparkles, Sun, Moon, Coffee,
} from 'lucide-react';
import { bookingsAPI, type Booking } from '../services/api';
import type { Page } from '../types';

// ============================================================
// CommandCenter — «فضائي» (My Space): أول ما يراه المستخدم.
// ليس Dashboard حسب الميزات، بل «اليوم» + «ما يحتاج انتباهك».
// مبنيّ على البيانات: كل عنصر يظهر فقط إن كان له محتوى (قانون ٦/١٠).
// يقرأ من العقود الموجودة (orders/conversations/products عبر props،
// bookings عبر API) — بلا أي بنية خلفية جديدة.
// ============================================================

const ORANGE = '#FF6A00', INK = '#FAFAFA', MUTED = '#9a9a9a';
const CARD = 'rgba(255,255,255,0.03)', BORDER = '1px solid rgba(255,255,255,0.06)';

// «الخطوة التالية» — اقتراح استباقي (Progressive Platform, DR-0005)
export interface Nudge { id: string; text: string; cta: string; page: Page; }

interface Props {
  name: string;
  pending: number;      // طلبات تنتظر الموافقة
  unread: number;       // رسائل غير مقروءة
  todayRevenue: number;
  currency: string;
  lowStock: number;     // منتجات قاربت النفاد
  aiActive?: boolean;
  nudges?: Nudge[];     // اقتراحات «الميزة تجيء إليك»
  onGo: (p: Page) => void;
}

interface Attn { key: string; icon: ReactElement; color: string; title: string; page: Page; }

const isSoon = (iso?: string) => {
  if (!iso) return false;
  const d = new Date(iso).getTime(), now = Date.now();
  return d >= now - 3600e3 && d <= now + 36 * 3600e3; // من الآن حتى ~الغد
};

export default function CommandCenter({ name, pending, unread, todayRevenue, currency, lowStock, aiActive, nudges = [], onGo }: Props) {
  const [bookingsSoon, setBookingsSoon] = useState(0);

  useEffect(() => {
    let alive = true;
    bookingsAPI.list()
      .then(bs => { if (alive) setBookingsSoon((bs || []).filter((b: Booking) => ['pending', 'confirmed'].includes(b.status) && isSoon(b.scheduledAt)).length); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const hour = new Date().getHours();
  const { greet, GreetIcon } = hour < 12
    ? { greet: 'صباح النور', GreetIcon: Coffee }
    : hour < 18 ? { greet: 'مرحباً', GreetIcon: Sun } : { greet: 'مساء الخير', GreetIcon: Moon };

  // «ما يحتاج انتباهك» — مرتّب بالأولوية، ويظهر فقط ما له محتوى
  const attention: Attn[] = [];
  if (pending > 0)      attention.push({ key: 'orders', color: ORANGE,   icon: <ShoppingBag size={17} />, title: `${pending} طلب ينتظر موافقتك`, page: 'orders' });
  if (unread > 0)       attention.push({ key: 'msg',    color: '#7C3AED', icon: <MessageCircle size={17} />, title: `${unread} رسالة لم تُقرأ`, page: 'conversations' });
  if (bookingsSoon > 0) attention.push({ key: 'book',   color: '#22C55E', icon: <Calendar size={17} />, title: `${bookingsSoon} حجز قادم قريباً`, page: 'bookings' });
  if (lowStock > 0)     attention.push({ key: 'stock',  color: '#EF4444', icon: <PackageX size={17} />, title: `${lowStock} منتج قارب على النفاد`, page: 'products' });

  const date = new Date().toLocaleDateString('ar-MA', { weekday: 'long', day: 'numeric', month: 'long' });

  // «اليوم» — بطاقات موجزة (تظهر الحجوزات فقط إن وُجدت)
  const chips = [
    { label: 'إيراد اليوم', value: `${todayRevenue.toLocaleString()} ${currency}`, color: '#22C55E' },
    { label: 'طلبات جديدة', value: String(pending), color: ORANGE },
    { label: 'رسائل', value: String(unread), color: '#7C3AED' },
    ...(bookingsSoon > 0 ? [{ label: 'حجوزات قادمة', value: String(bookingsSoon), color: '#3B82F6' }] : []),
  ];

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* التحية — فضاؤك الشخصي */}
      <div style={{ background: `linear-gradient(135deg, rgba(255,106,0,0.14), rgba(255,106,0,0.03))`, border: '1px solid rgba(255,106,0,0.18)', borderRadius: 20, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(255,106,0,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ORANGE, flexShrink: 0 }}>
            <GreetIcon size={22} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{greet}، {name || 'صديقي'} 👋</div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>هذا فضاؤك — كل ما يخصّك هنا · {date}</div>
          </div>
          {aiActive && (
            <span style={{ fontSize: 10, background: 'rgba(34,197,94,0.1)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '4px 9px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
              <Sparkles size={11} /> AI نشط
            </span>
          )}
        </div>

        {/* «اليوم» موجز */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${chips.length}, 1fr)`, gap: 8, marginTop: 16 }}>
          {chips.map((c, i) => (
            <div key={i} style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: c.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.value}</div>
              <div style={{ fontSize: 9.5, color: MUTED, marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ✨ الخطوة التالية — الميزة تجيء إليك (Progressive Platform) */}
      {nudges.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {nudges.slice(0, 2).map(n => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.22)', borderRadius: 14, padding: '12px 14px' }}>
              <span style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(139,92,246,0.16)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Sparkles size={16} /></span>
              <span style={{ flex: 1, fontSize: 12.5, color: INK, lineHeight: 1.5 }}>{n.text}</span>
              <button onClick={() => onGo(n.page)} style={{ flexShrink: 0, background: '#7C3AED', border: 'none', color: '#fff', borderRadius: 10, padding: '7px 13px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>{n.cta}</button>
            </div>
          ))}
        </div>
      )}

      {/* ما يحتاج انتباهك */}
      <div style={{ background: CARD, border: BORDER, borderRadius: 18, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: attention.length ? 12 : 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: INK }}>✦ ما يحتاج انتباهك</span>
          {attention.length > 0 && <span style={{ fontSize: 10.5, color: ORANGE, background: 'rgba(255,106,0,0.12)', borderRadius: 99, padding: '2px 9px', fontWeight: 800 }}>{attention.length}</span>}
        </div>

        {attention.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 10px', color: MUTED }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>👌</div>
            <div style={{ fontSize: 12.5 }}>كل شيء تحت السيطرة اليوم — لا شيء ينتظرك.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {attention.map(a => (
              <button key={a.key} onClick={() => onGo(a.page)}
                style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'start', background: 'rgba(255,255,255,0.02)', border: BORDER, borderRadius: 12, padding: '11px 12px', cursor: 'pointer', color: INK, fontFamily: 'inherit' }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: `${a.color}22`, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{a.icon}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>{a.title}</span>
                <ChevronLeft size={16} color={MUTED} />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
