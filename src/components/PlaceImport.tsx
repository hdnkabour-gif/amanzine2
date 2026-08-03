import { useState, useMemo } from 'react';
import { judgePlaceList, PLACE_COUNT, type PlaceVerdict } from '../lib/akg/kb/places';

// ============================================================
// لصقُ مدنِ شركةٍ جديدة — ومقارنتُها بما نعرف.
//
//   الحاجةُ كما وصفها المالك: «عند إضافة شركةٍ أخرى ينسخ المستخدمُ المناطقَ
//   والمدنَ التي لم يتعرّف عليها التطبيق، فيقارن: مكرّرةٌ أم مكتوبةٌ بطريقةٍ
//   أخرى، مدينةٌ أم حيٌّ أم عنوان — ثمّ يضيفها من مركز المعرفة».
//
//   والأحكامُ أربعةٌ لا ثلاثة، والرابعُ هو الذي يمنع الفساد:
//     ✓ معروف   — لا شيءَ يُفعَل
//     ≈ يشبه     — إملاءٌ آخرُ لمكانٍ عندنا («Rissani» / «Risani»)
//     ⌂ حيّ      — **ليس مدينةً**. «عين الشق» حيٌّ في الدار البيضاء، وإضافتُه
//                  مدينةً تُفسد البحثَ والتوصيلَ معًا
//     + جديد    — يستحقّ الإضافة
//
//   ولا يُضاف شيءٌ إلّا بنقرةِ إنسان. القانون: لا تعلُّمَ ذاتيّ.
// ============================================================

const BORDER = '1px solid var(--border2,rgba(255,255,255,.14))';

const STYLES: Record<PlaceVerdict['kind'], { icon: string; label: string; color: string }> = {
  known:    { icon: '✓', label: 'معروفٌ عندنا',        color: 'var(--mint,#12A150)' },
  similar:  { icon: '≈', label: 'إملاءٌ آخرُ لمعروف',   color: 'var(--amz-gold,#D4A017)' },
  district: { icon: '⌂', label: 'حيٌّ لا مدينة',        color: '#8B5CF6' },
  new:      { icon: '+', label: 'جديدٌ — يستحقّ الإضافة', color: 'var(--info,#3B82F6)' },
};

export default function PlaceImport({ onAdd }: { onAdd?: (names: string[]) => void }) {
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const r = useMemo(() => (text.trim() ? judgePlaceList(text) : null), [text]);
  const groups: [PlaceVerdict['kind'], PlaceVerdict[]][] = r
    ? [['new', r.fresh], ['similar', r.similar], ['district', r.district], ['known', r.known]]
    : [];

  const toggle = (name: string) =>
    setPicked(p => { const n = new Set(p); n.has(name) ? n.delete(name) : n.add(name); return n; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--ink1)' }}>🗺️ مقارنةُ مدنِ شركةِ توصيل</div>
        <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4, lineHeight: 1.7 }}>
          ألصق قائمةَ المدن كما تعطيها الشركة — بأسطرٍ أو فواصلَ أو «·».
          نعرف الآن <b style={{ color: 'var(--amz-emerald,#0a8f6f)' }}>{PLACE_COUNT}</b> مكانًا،
          وسنقول لك أيُّها جديدٌ فعلًا.
        </div>
      </div>

      <textarea value={text} onChange={e => { setText(e.target.value); setPicked(new Set()); }}
        rows={5} placeholder={'casablanca · rissani · عين الشق · ville inconnue'}
        style={{
          width: '100%', resize: 'vertical', padding: 12, borderRadius: 12, border: BORDER,
          background: 'var(--panel,rgba(0,0,0,.15))', color: 'var(--ink1)',
          fontSize: 13.5, fontFamily: 'inherit', direction: 'rtl', lineHeight: 1.8,
        }} />

      {r && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {groups.map(([kind, list]) => (
              <span key={kind} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px',
                borderRadius: 99, border: `1px solid ${STYLES[kind].color}`,
                color: STYLES[kind].color, fontSize: 11.5, fontWeight: 800,
              }}>{STYLES[kind].icon} {STYLES[kind].label}: {list.length}</span>
            ))}
          </div>

          {groups.filter(([, l]) => l.length).map(([kind, list]) => (
            <div key={kind} style={{ border: BORDER, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{
                padding: '7px 12px', fontSize: 12, fontWeight: 800,
                background: `color-mix(in srgb, ${STYLES[kind].color} 12%, transparent)`,
                color: STYLES[kind].color,
              }}>{STYLES[kind].icon} {STYLES[kind].label} — {list.length}</div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {list.map(v => (
                  <label key={v.input} style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px',
                    borderTop: BORDER, fontSize: 13, color: 'var(--ink1)',
                    cursor: kind === 'new' ? 'pointer' : 'default',
                  }}>
                    {/* الإضافةُ للجديد وحدَه. الحيُّ والمشابهُ لا يُضافان مدنًا. */}
                    {kind === 'new' && (
                      <input type="checkbox" checked={picked.has(v.input)}
                        onChange={() => toggle(v.input)} style={{ width: 16, height: 16 }} />
                    )}
                    <span style={{ fontWeight: 700 }}>{v.input}</span>
                    {'why' in v && v.why && (
                      <span style={{ fontSize: 11.5, color: 'var(--ink3)', marginInlineStart: 'auto' }}>{v.why}</span>
                    )}
                    {v.kind === 'known' && (
                      <span style={{ fontSize: 11.5, color: 'var(--ink3)', marginInlineStart: 'auto' }}>{v.place.ar}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}

          {r.fresh.length > 0 && (
            <button type="button" disabled={!picked.size} onClick={() => { onAdd?.([...picked]); setPicked(new Set()); }}
              style={{
                alignSelf: 'flex-start', padding: '10px 16px', borderRadius: 11, border: 'none',
                background: picked.size ? 'var(--mint,#12A150)' : 'var(--border2,rgba(255,255,255,.12))',
                color: '#fff', fontSize: 13, fontWeight: 800, fontFamily: 'inherit',
                cursor: picked.size ? 'pointer' : 'default',
              }}>
              أضِف {picked.size || ''} مكانًا إلى المعرفة
            </button>
          )}

          {r.fresh.length === 0 && text.trim() && (
            <div style={{ fontSize: 12.5, color: 'var(--amz-emerald,#0a8f6f)', fontWeight: 700 }}>
              ✓ كلُّ ما لصقتَه معروفٌ عندنا سلفًا — لا حاجةَ لإضافةِ شيء.
            </div>
          )}
        </>
      )}
    </div>
  );
}
