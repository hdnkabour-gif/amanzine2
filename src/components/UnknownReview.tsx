import { useState, useEffect, useCallback } from 'react';
import { aiAPI, type LearnedUnknown } from '../services/api';

// ============================================================
// ما لم يفهمه التطبيق — ومراجعتُه.
//
//   الحلقةُ كانت مقطوعةً في موضعَين:
//     ① القواعدُ تعجز ⇒ يُسجَّل النصُّ ⇒ **ولا أحدَ يراه**. جدولٌ يكبر بلا قارئ.
//     ② الذكاءُ يفهم ⇒ يُعرَض جوابُه ⇒ **يُرمى**. فتُسأل الكلمةُ في كلّ مرّة،
//        وإن انقطع الذكاءُ عاد الجهلُ كما كان.
//
//   هنا يُغلَق الطرفان: يرى المالكُ ما عجز عنه التطبيق، ومعه ما فهمه الذكاءُ
//   **اقتراحًا لا حقيقة**، ثمّ يعتمد أو يرفض.
//
//   **ولا شيءَ يدخل المعرفةَ بلا اعتماد.** لو تعلّم النظامُ وحدَه لَورث أخطاءَ
//   الذكاء بلا مراجعة — وهي أخطاءُ لغةٍ محلّيّةٍ لا يراها إلّا مغربيّ.
// ============================================================

const BORDER = '1px solid var(--border2,rgba(255,255,255,.14))';

export default function UnknownReview({ onApprove }: { onApprove?: (u: LearnedUnknown) => void }) {
  const [rows, setRows] = useState<LearnedUnknown[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setBusy(true); setErr('');
    try {
      const r = await aiAPI.unknowns('pending', 60);
      setRows(r.unknowns || []);
    } catch {
      // **صدقٌ في الحالة.** لا نُظهر «لا شيء» حين يكون العطبُ في الشبكة:
      // «فارغ» و«ما وصلناش» حالتان مختلفتان، وخلطُهما يُخفي عملًا مطلوبًا.
      setErr('ما قدرناش نجيبو اللائحة — عاود المحاولة.');
    } finally { setBusy(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const judge = async (u: LearnedUnknown, status: 'approved' | 'rejected') => {
    setRows(rs => rs.filter(r => r.text !== u.text));   // تفاؤلٌ: الصفُّ يختفي فورًا
    try {
      await aiAPI.judgeUnknown(u.text, status);
      if (status === 'approved') onApprove?.(u);
    } catch { load(); }                                  // فشل ⇒ نُعيد الحقيقة
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--ink1)' }}>🧠 كلماتٌ ما فهمهاش التطبيق</div>
        <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4, lineHeight: 1.7 }}>
          كلُّ كلمةٍ هنا سألها إنسانٌ حقيقيٌّ ولم نُجبه. واللي فهمو الذكاءُ كيبان
          حداها <b>اقتراحًا</b> — نتا اللي كتقرّر.
        </div>
      </div>

      {err && <div style={{ fontSize: 12.5, color: 'var(--danger,#EF4444)', fontWeight: 700 }}>{err}</div>}
      {busy && !rows.length && <div style={{ fontSize: 12.5, color: 'var(--ink3)' }}>كنجيبو…</div>}

      {!busy && !err && !rows.length && (
        <div style={{ fontSize: 12.5, color: 'var(--amz-emerald,#0a8f6f)', fontWeight: 700 }}>
          ✓ ما كاين حتى كلمة موقوفة — التطبيق فاهم كلشي اللي تكتب ليه.
        </div>
      )}

      {rows.map(u => (
        <div key={u.text} style={{
          border: BORDER, borderRadius: 12, padding: '10px 12px',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink1)' }}>«{u.text}»</span>
          <span style={{ fontSize: 11, color: 'var(--ink3)' }}>تسألت {u.count} مرّة</span>

          {u.aiSuggestion
            ? <span style={{
                fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                border: '1px solid var(--amz-gold,#D4A017)', color: 'var(--amz-gold,#D4A017)',
              }}>الذكاء: {u.aiSuggestion}</span>
            : <span style={{ fontSize: 11.5, color: 'var(--ink3)' }}>بلا اقتراح</span>}

          <div style={{ display: 'flex', gap: 7, marginInlineStart: 'auto' }}>
            <button type="button" onClick={() => judge(u, 'approved')} style={btn('var(--mint,#12A150)')}>
              ✓ اعتمد
            </button>
            <button type="button" onClick={() => judge(u, 'rejected')} style={btn('var(--border2,rgba(255,255,255,.2))', 'var(--ink3)')}>
              ✕ لا
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function btn(bg: string, color = '#fff'): React.CSSProperties {
  return {
    padding: '6px 13px', borderRadius: 9, border: 'none', background: bg, color,
    fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer',
  };
}
