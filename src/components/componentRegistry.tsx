// ============================================================
// Component Registry + ComponentFactory — رابع السجلّات (Schema/Capability/
//   Relation/Component). كلّ مكوّن حقل مُسجَّل باسمه، والـ Factory يبحث عنه
//   ويرسمه — بلا switch حتّى على مستوى الـ widgets. ViewModel يعطي اسمًا،
//   والـ Factory يرسم. لاستبدال مكتبة الواجهة: نغيّر هذا الملفّ وحده.
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { shrinkForListing, MAX_PHOTOS } from '../lib/imageFile';

const BORDER = 'var(--border2,rgba(255,255,255,.14))';
const INK1 = 'var(--ink1)';
const INK3 = 'var(--ink3)';

// خطّاف الإدخال النصّيّ: يحتفظ بالقيمة محلّيًّا أثناء الكتابة ولا «يُثبّتها»
// (فيتقدّم المخطّط للسؤال التالي) إلّا عند الخروج من الحقل أو Enter. بدونه كانت
// كلّ ضغطة مفتاح تُحسَب إجابةً مكتملة فينتقل السؤال بعد حرف واحد.
function useBufferedInput(value: any, onChange: (v: any) => void) {
  const [local, setLocal] = useState<string>(value ?? '');
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setLocal(value ?? ''); }, [value]);
  const commit = () => { if ((local ?? '') !== (value ?? '')) onChange(local); };
  return {
    value: local,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setLocal(e.target.value),
    onFocus: () => { focused.current = true; },
    onBlur: () => { focused.current = false; commit(); },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
    },
  };
}

export interface FieldComponentProps {
  value: any;
  onChange: (v: any) => void;
  props: Record<string, any>;   // choices/placeholder/currency/required…
  big?: boolean;
  accent: string;
  green: string;
}

type FieldComponent = (p: FieldComponentProps) => React.ReactElement;

// ── المكوّنات ──────────────────────────────────────────────
const TextInput: FieldComponent = ({ value, onChange, props, big, mode }: any) => {
  const b = useBufferedInput(value, onChange);
  return (
    <input {...b} inputMode={mode} autoFocus={big}
      placeholder={props.placeholder || ''} style={{ width: '100%', padding: big ? '13px 14px' : '10px 12px', borderRadius: 11, border: `1px solid ${BORDER}`, background: 'var(--panel,rgba(0,0,0,.15))', color: INK1, fontSize: big ? 16 : 14, fontWeight: 700, fontFamily: 'inherit', direction: 'rtl' }} />
  );
};
const NumericInput: FieldComponent = (p) => <TextInput {...p} {...{ mode: 'numeric' } as any} />;

const MoneyInput: FieldComponent = ({ value, onChange, props, big }) => {
  const b = useBufferedInput(value, onChange);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input {...b} inputMode="numeric" autoFocus={big}
        placeholder={props.placeholder || 'بشحال؟'} style={{ flex: 1, padding: big ? '13px 14px' : '10px 12px', borderRadius: 11, border: `1px solid ${BORDER}`, background: 'var(--panel,rgba(0,0,0,.15))', color: INK1, fontSize: big ? 16 : 14, fontWeight: 700, fontFamily: 'inherit', direction: 'rtl' }} />
      <span style={{ fontSize: 12.5, fontWeight: 800, color: INK3 }}>{props.currency || 'MAD'}</span>
    </div>
  );
};

const ChoiceCards: FieldComponent = ({ value, onChange, props, big, accent }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
    {((props.choices as string[]) || []).map(op => (
      <button key={op} type="button" onClick={() => onChange(op)}
        style={{ padding: big ? '10px 16px' : '7px 12px', borderRadius: 11, border: `1px solid ${value === op ? accent : BORDER}`, background: value === op ? `color-mix(in srgb, ${accent} 18%, transparent)` : 'transparent', color: value === op ? accent : 'var(--ink2)', fontSize: big ? 14 : 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{op}</button>
    ))}
  </div>
);

const ToggleField: FieldComponent = ({ value, onChange, big, green }) => (
  <div style={{ display: 'flex', gap: 8 }}>
    {[['نعم', true], ['لا', false]].map(([lbl, val]) => (
      <button key={String(val)} type="button" onClick={() => onChange(val)}
        style={{ padding: big ? '10px 20px' : '7px 14px', borderRadius: 11, border: `1px solid ${value === val ? green : BORDER}`, background: value === val ? `color-mix(in srgb, ${green} 18%, transparent)` : 'transparent', color: value === val ? green : INK3, fontSize: big ? 14 : 12.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>{lbl as string}</button>
    ))}
  </div>
);

// ── الصور: مُنتقٍ حقيقيّ ───────────────────────────────────
// كان هذا زرًّا كاذبًا: ينقره المستخدم فيكتب النصّ «أضيفت» ويعرض ✓ بلا أيّ
// صورة — لا حقل ملفّ ولا رفع. الإعلان يُنشَر بلا صورة والمستخدم يظنّها أُضيفت.
// صار حقلَ ملفٍّ فعليًّا: يختار، يُضغَط، ويظهر مصغّرًا يمكن حذفه.
const GalleryPicker: FieldComponent = ({ value, onChange, big, green }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const photos: string[] = Array.isArray(value) ? value : value ? [String(value)] : [];

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr(null); setBusy(true);
    const room = MAX_PHOTOS - photos.length;
    const next: string[] = [];
    for (const f of Array.from(files).slice(0, Math.max(0, room))) {
      if (!f.type.startsWith('image/')) { setErr('اختر صورةً فقط'); continue; }
      try { next.push(await shrinkForListing(f)); }
      catch { setErr('تعذّر قراءة الصورة — جرّب وحدة أخرى'); }
    }
    if (next.length) onChange([...photos, ...next]);
    if (files.length > room) setErr(`الحدّ ${MAX_PHOTOS} صور`);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';   // اختيارُ نفس الملفّ مرّتين
  };
  const drop = (i: number) => {
    const rest = photos.filter((_, k) => k !== i);
    onChange(rest.length ? rest : undefined);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <input ref={inputRef} type="file" accept="image/*" multiple hidden
        onChange={e => { void pick(e.target.files); }} />
      {photos.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {photos.map((src, i) => (
            <div key={i} style={{ position: 'relative', width: 72, height: 72, borderRadius: 11, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
              <img src={src} alt={`صورة ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button type="button" onClick={() => drop(i)} aria-label={`حذف الصورة ${i + 1}`}
                style={{ position: 'absolute', insetInlineEnd: 3, top: 3, width: 20, height: 20, borderRadius: 99, border: 'none', background: 'rgba(0,0,0,.62)', color: '#fff', fontSize: 13, lineHeight: 1, cursor: 'pointer', padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      )}
      {photos.length < MAX_PHOTOS && (
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}
          style={{ display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start', padding: big ? '11px 18px' : '9px 14px', borderRadius: 11, border: `1px dashed ${photos.length ? green : BORDER}`, background: 'transparent', color: photos.length ? green : INK3, fontSize: big ? 14 : 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: busy ? 'progress' : 'pointer' }}>
          {busy ? '…كنحضّر الصور' : photos.length ? `＋ زيد صورة (${photos.length}/${MAX_PHOTOS})` : '📷 أضف صورًا'}
        </button>
      )}
      <div style={{ fontSize: 11.5, color: err ? '#FCA5A5' : INK3 }}>
        {err || 'الإعلان بصورة كيتشاف أكثر بكثير — حتّى وحدة كتّفرق.'}
      </div>
    </div>
  );
};

const VideoPicker: FieldComponent = ({ value, onChange, big, green }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const name = typeof value === 'object' && value ? (value as any).name : value;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <input ref={inputRef} type="file" accept="video/*" hidden
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange({ name: f.name, size: f.size }); }} />
      <button type="button" onClick={() => (name ? onChange(undefined) : inputRef.current?.click())}
        style={{ display: 'flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start', padding: big ? '11px 18px' : '9px 14px', borderRadius: 11, border: `1px dashed ${name ? green : BORDER}`, background: 'transparent', color: name ? green : INK3, fontSize: big ? 14 : 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
        {name ? `🎬 ${String(name).slice(0, 28)} — احذف` : '🎬 أضف فيديو'}
      </button>
    </div>
  );
};

// ── قيمٌ متعدّدة: مقاسات · ألوان · تخصّصات ────────────────────
// لم يكن للنظام مكوّنٌ يقبل أكثر من قيمة، فكان المقاسُ واللونُ خارجَ المساعد
// أصلًا — لا يُسأل عنهما ولا يُحفظان. المقترَحاتُ تأتي من الفئة أو من قاعدة
// المعرفة (`services[]`)، ويبقى للتاجر أن يزيد ما ليس عندنا.
const TagsPicker: FieldComponent = ({ value, onChange, props, big, accent, green }) => {
  const [draft, setDraft] = useState('');
  const picked: string[] = Array.isArray(value) ? value.map(String)
    : value ? String(value).split(/\s*[،,]\s*/).filter(Boolean) : [];
  const suggestions = ((props.choices as string[]) || []).filter(s => !picked.includes(s));
  const commit = (v: string[]) => onChange(v.length ? v : undefined);
  const add = (t: string) => { const s = t.trim(); if (s && !picked.includes(s)) commit([...picked, s]); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {picked.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {picked.map(t => (
            <button key={t} type="button" onClick={() => commit(picked.filter(x => x !== t))}
              title="اضغط للحذف"
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: big ? '7px 13px' : '5px 11px', borderRadius: 99, border: `1px solid ${green}`, background: `color-mix(in srgb, ${green} 16%, transparent)`, color: green, fontSize: big ? 13.5 : 12, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>
              {t} <span style={{ opacity: .7 }}>×</span>
            </button>
          ))}
        </div>
      )}
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {suggestions.map(s => (
            <button key={s} type="button" onClick={() => add(s)}
              style={{ padding: big ? '8px 14px' : '6px 11px', borderRadius: 99, border: `1px dashed ${BORDER}`, background: 'transparent', color: 'var(--ink2)', fontSize: big ? 13.5 : 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
              ＋ {s}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 7 }}>
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(draft); setDraft(''); } }}
          placeholder={(props.placeholder as string) || 'زيد وحدة أخرى…'}
          style={{ flex: 1, padding: big ? '11px 13px' : '9px 11px', borderRadius: 11, border: `1px solid ${BORDER}`, background: 'var(--panel,rgba(0,0,0,.15))', color: INK1, fontSize: big ? 15 : 13.5, fontWeight: 700, fontFamily: 'inherit', direction: 'rtl' }} />
        <button type="button" onClick={() => { add(draft); setDraft(''); }} disabled={!draft.trim()}
          style={{ padding: '0 15px', borderRadius: 11, border: `1px solid ${draft.trim() ? accent : BORDER}`, background: 'transparent', color: draft.trim() ? accent : INK3, fontSize: 13, fontWeight: 800, fontFamily: 'inherit', cursor: draft.trim() ? 'pointer' : 'default' }}>زيد</button>
      </div>
    </div>
  );
};

// ── السجلّ ──────────────────────────────────────────────────
const registry: Record<string, FieldComponent> = {
  TextInput,
  TagsPicker,
  NumberInput: NumericInput,
  PhoneInput: NumericInput,
  LocationInput: TextInput,
  MoneyInput,
  ChoiceCards,
  ToggleField,
  GalleryPicker,
  VideoPicker,
};

export function registerComponent(name: string, comp: FieldComponent): void {
  registry[name] = comp;
}

// المصنع: بحث في السجلّ ثمّ رسم — بلا switch.
export default function ComponentFactory({ component, ...rest }: { component: string } & FieldComponentProps) {
  const C = registry[component] || TextInput;
  return <C {...rest} />;
}
