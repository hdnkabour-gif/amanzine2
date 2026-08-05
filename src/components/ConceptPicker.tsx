import { useMemo, useState } from 'react';
import { Search, Check, X } from 'lucide-react';
import { normLoose } from '../lib/normalize';
import { CONCEPTS } from '../lib/akg/kb/concepts';

// ============================================================
// ConceptPicker — «اربطها بـ…» تختار من **عقل المنصّة** لا بالكتابة الحرّة.
//   المشكلة التي يحلّها: حقلٌ نصّيٌّ حرّ يعني أنّ المالك يخمّن الاسم، وأيّ خطأٍ
//   مطبعيّ ينتج ربطًا ميّتًا لا يطابق أيّ مفهوم ⇒ التعلّم يضيع بصمت.
//   البحث يشمل: المعرّف · الاسم بكلّ اللغات (ar/fr/en) · كلّ المرادفات (variants)
//   ⇒ تكتب «plombier» أو «sbbak» أو «سبّاك» فتصل لنفس المفهوم.
// ============================================================

export interface ConceptChoice { id: string; label: string; category: string }

const INK1 = 'var(--ink1,#FAFAFA)';
const INK3 = 'var(--ink3,#7E877F)';
const BORDER = '1px solid var(--border2,rgba(255,255,255,0.14))';

// تطبيعٌ خفيف يسمح بالبحث بأيّ لغة (يزيل التشكيل/الهمزات وتوحيد الحروف اللاتينيّة).
const norm = normLoose;   // كان نسخةً محلّيّة

interface Row { id: string; label: string; category: string; hay: string }

// فهرسٌ يُبنى مرّةً واحدة: كلّ ما يمكن أن يكتبه المالك بأيّ لغة.
function buildIndex(): Row[] {
  return (CONCEPTS as any[]).map(c => {
    const names = Object.values(c.concept || {}).filter(v => typeof v === 'string') as string[];
    const vars = Object.values(c.variants || {}).flat().filter(v => typeof v === 'string') as string[];
    return {
      id: c.id,
      label: (c.concept?.ar as string) || c.id,
      category: c.category || '',
      hay: norm([c.id.replace(/_/g, ' '), ...names, ...vars, c.category].join(' ')),
    };
  });
}

export default function ConceptPicker({ value, onChange, placeholder = 'اربطها بـ… ابحث بأيّ لغة' }: {
  value?: ConceptChoice | null;
  onChange: (c: ConceptChoice | null) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const index = useMemo(buildIndex, []);

  const results = useMemo(() => {
    const nq = norm(q);
    if (!nq) return index.slice(0, 8);            // اقتراحاتٌ فورًا، لا شاشةٌ فارغة
    const starts: Row[] = [], has: Row[] = [];
    for (const r of index) {
      if (r.label && norm(r.label).startsWith(nq)) starts.push(r);
      else if (r.hay.includes(nq)) has.push(r);
      if (starts.length + has.length > 60) break;
    }
    return [...starts, ...has].slice(0, 10);
  }, [q, index]);

  // مفهومٌ مختار: نعرضه كشارةٍ واضحة مع إمكان التغيير.
  if (value) {
    return (
      <div style={{ flex: '1 1 150px', minWidth: 0, display: 'flex', alignItems: 'center', gap: 7, padding: '8px 11px', borderRadius: 10, border: '1px solid var(--mint,#12A150)', background: 'color-mix(in srgb,#12A150 12%,transparent)' }}>
        <Check size={14} style={{ color: 'var(--mint,#12A150)', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 750, color: INK1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value.label}</span>
        <span style={{ fontSize: 10.5, color: INK3, flexShrink: 0 }}>{value.category}</span>
        <button onClick={() => { onChange(null); setQ(''); }} aria-label="تغيير"
          style={{ marginInlineStart: 'auto', flexShrink: 0, background: 'none', border: 'none', color: INK3, cursor: 'pointer', display: 'flex', padding: 2 }}>
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ flex: '1 1 150px', minWidth: 0, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg2,rgba(255,255,255,0.02))', border: BORDER, borderRadius: 10, padding: '8px 11px' }}>
        <Search size={13} style={{ color: INK3, flexShrink: 0 }} />
        <input value={q} onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 160)}  // يسمح بالنقر قبل الإغلاق
          placeholder={placeholder}
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: INK1, fontSize: 13, fontFamily: 'inherit', direction: 'rtl' }} />
      </div>

      {open && (
        <div role="listbox" style={{ position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, top: 'calc(100% + 5px)', zIndex: 30, maxHeight: 240, overflowY: 'auto', borderRadius: 12, border: BORDER, background: 'var(--void,#0B0D12)', boxShadow: '0 16px 40px rgba(0,0,0,.45)' }}>
          {results.length === 0 ? (
            <div style={{ padding: '12px 13px', fontSize: 12, color: INK3, lineHeight: 1.7 }}>
              ما لقينا هاد المفهوم فالعقل.<br />
              <span style={{ color: 'var(--ember,#FF6A00)' }}>ماشي كل جملة خدمة</span> — «أنا حرفي» أو «واش تعاوني؟» نيّة لا مهنة: ارفضها (×).
            </div>
          ) : results.map(r => (
            <button key={r.id} type="button" role="option"
              onMouseDown={() => { onChange({ id: r.id, label: r.label, category: r.category }); setOpen(false); }}
              style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,.05)', color: INK1, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'start' }}>
              <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
              <span style={{ fontSize: 10.5, color: INK3, flexShrink: 0 }}>{r.category}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
