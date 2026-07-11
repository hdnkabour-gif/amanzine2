import { useState, type CSSProperties, type ReactElement } from 'react';
import { ShoppingBag, MessageCircle } from 'lucide-react';
import type { Page } from '../types';

// ============================================================
// ActivityTimeline — «نشاطي» في My Space.
// Timeline + Inbox = شيء واحد: كل ما يحدث في حياتك، وفلتر «ما يحتاج ردًا».
// مبنيّ على بيانات موجودة (طلبات/رسائل) — يظهر دائمًا، بلا backend.
// ============================================================

const INK = '#FAFAFA', MUTED = '#9a9a9a', ORANGE = '#FF6A00';
const CARD = 'rgba(255,255,255,0.03)', BORDER = '1px solid rgba(255,255,255,0.06)';

export interface TimelineItem {
  id: string; kind: 'order' | 'message';
  color: string; title: string; at: number;
  needsReply: boolean; page: Page;
}

const rel = (ms: number) => {
  const diff = Math.max(0, Date.now() - ms);
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (m < 1) return 'الآن';
  if (m < 60) return `قبل ${m} د`;
  if (h < 24) return `قبل ${h} س`;
  if (d < 7) return `قبل ${d} ي`;
  return new Date(ms).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short' });
};

const iconOf = (k: TimelineItem['kind']): ReactElement =>
  k === 'order' ? <ShoppingBag size={15} /> : <MessageCircle size={15} />;

export default function ActivityTimeline({ items, onGo }: { items: TimelineItem[]; onGo: (p: Page) => void }) {
  const [filter, setFilter] = useState<'all' | 'inbox'>('all');
  if (items.length === 0) return null;

  const inboxCount = items.filter(i => i.needsReply).length;
  const shown = (filter === 'inbox' ? items.filter(i => i.needsReply) : items).slice(0, 12);

  return (
    <div style={{ background: CARD, border: BORDER, borderRadius: 18, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: INK }}>💬 نشاطي</span>
        <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 99, padding: 3 }}>
          <button onClick={() => setFilter('all')} style={tab(filter === 'all')}>الكل</button>
          <button onClick={() => setFilter('inbox')} style={tab(filter === 'inbox')}>
            ما يحتاج ردًا{inboxCount > 0 ? ` · ${inboxCount}` : ''}
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 18, color: MUTED, fontSize: 12.5 }}>لا شيء ينتظر ردّك 👌</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {shown.map((it, i) => (
            <button key={it.id} onClick={() => onGo(it.page)}
              style={{ display: 'flex', gap: 11, alignItems: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 0', textAlign: 'start', fontFamily: 'inherit' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ width: 30, height: 30, borderRadius: 9, background: `${it.color}22`, color: it.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{iconOf(it.kind)}</span>
                {i < shown.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 12, background: 'rgba(255,255,255,0.07)', marginTop: 2 }} />}
              </div>
              <div style={{ flex: 1, paddingTop: 3, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: INK, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</span>
                  {it.needsReply && <span style={{ fontSize: 9, color: ORANGE, background: 'rgba(255,106,0,0.12)', borderRadius: 99, padding: '1px 7px', fontWeight: 800 }}>يحتاج ردًا</span>}
                </div>
                <div style={{ fontSize: 10.5, color: MUTED, marginTop: 2 }}>{rel(it.at)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function tab(active: boolean): CSSProperties {
  return { border: 'none', cursor: 'pointer', borderRadius: 99, padding: '5px 11px', fontSize: 11, fontWeight: 800, fontFamily: 'inherit', background: active ? ORANGE : 'transparent', color: active ? '#fff' : MUTED };
}
