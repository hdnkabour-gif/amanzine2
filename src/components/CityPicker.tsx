import { useState, useRef, useEffect, useMemo } from 'react';
import { suggestPlaces, resolvePlace, type Place } from '../lib/akg/kb/places';

// ============================================================
// خانةُ المدينة — تُكمِل أثناء الكتابة بالعربيّة والفرنسيّة معًا.
//
//   ما كان قبلها: قائمةٌ منسدلةٌ بثلاثَ عشرةَ مدينة، ومن سكن خارجها يختار
//   «أخرى». و٤٠٩ أماكنَ في المعرفة لا يبلغها المستخدمُ أبدًا.
//
//   ولماذا لا تُعرَض القائمةُ كلُّها؟ لأنّ ٤٠٩ خيارًا في منسدلةٍ على هاتفٍ
//   ليست خيارًا بل عقوبة. يكتب حرفًا فيرى ستّة.
//
//   ويقبل الكتابةَ الحرّة: من سكن دُوّارًا لا يعرفه أحدٌ يكتب اسمَه ويمضي —
//   خانةٌ تمنع ما لا تعرفه تمنع بيعًا حقيقيًّا.
// ============================================================

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** يُستدعى بالمكان المحلول — لمن يريد المُعرِّفَ لا النصّ. */
  onResolve?: (p: Place | undefined) => void;
  accent?: string;
  big?: boolean;
  required?: boolean;
}

export default function CityPicker({
  value, onChange, onResolve, placeholder = 'المدينة… (بالعربية أو الفرنسية)',
  accent = 'var(--amz-gold,#D4A017)', big, required,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [cursor, setCursor] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => { setDraft(value || ''); }, [value]);

  // الإغلاق عند النقر خارجها — وإلّا بقيت القائمةُ معلّقةً فوق الصفحة.
  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const hits = useMemo(() => (open ? suggestPlaces(draft, 7) : []), [draft, open]);
  const known = useMemo(() => resolvePlace(draft), [draft]);

  const choose = (p: Place) => {
    setDraft(p.ar); onChange(p.ar); onResolve?.(p);
    setOpen(false); setCursor(0);
  };

  const type = (v: string) => {
    setDraft(v); onChange(v); setOpen(true); setCursor(0);
    onResolve?.(resolvePlace(v));
  };

  const keys = (e: React.KeyboardEvent) => {
    if (!open || !hits.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => (c + 1) % hits.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => (c - 1 + hits.length) % hits.length); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(hits[cursor]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={box} style={{ position: 'relative', width: '100%' }}>
      <input
        value={draft}
        onChange={e => type(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={keys}
        placeholder={placeholder}
        aria-required={required}
        style={{
          width: '100%', padding: big ? '13px 14px' : '10px 12px', borderRadius: 11,
          border: `1px solid ${known ? 'var(--amz-emerald,#0a8f6f)' : 'var(--border2,rgba(255,255,255,.14))'}`,
          background: 'var(--panel,rgba(0,0,0,.15))', color: 'var(--ink1)',
          fontSize: big ? 16 : 14, fontWeight: 700, fontFamily: 'inherit', direction: 'rtl',
        }} />

      {/* صدقٌ في الحالة: نقول إن كنّا نعرف المكانَ أو لا — بلا منعٍ ولا خطأ. */}
      {draft.trim().length >= 2 && (
        <div style={{ fontSize: 11, marginTop: 4, color: known ? 'var(--amz-emerald,#0a8f6f)' : 'var(--ink3)' }}>
          {known
            ? `✓ ${known.ar}${known.fr && known.fr !== known.ar ? ` · ${known.fr}` : ''}`
            : 'مكانٌ غيرُ معروفٍ عندنا — يُقبَل كما كتبتَه'}
        </div>
      )}

      {open && hits.length > 0 && (
        <div role="listbox" style={{
          position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, top: '100%', marginTop: 4,
          zIndex: 40, maxHeight: 260, overflowY: 'auto', borderRadius: 12,
          border: '1px solid var(--border2,rgba(255,255,255,.14))',
          background: 'var(--panel2,#132040)', boxShadow: '0 12px 32px rgba(0,0,0,.35)',
        }}>
          {hits.map((p, i) => (
            <button key={p.ar + p.fr} type="button" role="option" aria-selected={i === cursor}
              onMouseEnter={() => setCursor(i)} onClick={() => choose(p)}
              style={{
                display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between',
                gap: 10, padding: '9px 12px', border: 'none', cursor: 'pointer',
                background: i === cursor ? `color-mix(in srgb, ${accent} 16%, transparent)` : 'transparent',
                color: 'var(--ink1)', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
                textAlign: 'start',
              }}>
              <span>{p.ar}</span>
              {/* الاسمُ الفرنسيُّ يُعرَض دائمًا: التاجرُ يكتب بلغةٍ والشركةُ تفهم بأخرى. */}
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink3)', direction: 'ltr' }}>
                {p.fr !== p.ar ? p.fr : ''}{p.major ? '' : ' ·'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
