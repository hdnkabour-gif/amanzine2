import { useState } from 'react';
import { needsAPI } from '../services/api';

// ============================================================
// NeedCapture — ما يظهر مكان «ما لقيناش».
//   سوقٌ جديد يبدأ فارغًا. الشاشة القديمة كانت تقول للباحث «كون أوّل واحد
//   وانشر» — أي تطلب من طالبِ سبّاكٍ أن يصير سبّاكًا. تُضيّع الزبون وإشارةَ
//   الطلب معًا. هنا نلتقط الحاجة: الفشل يصير طلبًا مؤكّدًا نعود به لصاحبه.
//   الاتّصال اختياريّ — من لا يريد تركه يُسجَّل طلبُه مجهّلًا وتبقى الإشارة.
// ============================================================

const EMBER = 'var(--ember,#FF6A00)';
const INK1 = 'var(--ink1,#FAFAFA)';
const INK3 = 'var(--ink3,#7E877F)';
const LINE = '1px solid var(--border,rgba(255,255,255,.10))';

export default function NeedCapture({ query, city, concept }: {
  query: string; city?: string; concept?: string;
}) {
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<'reachable' | 'anon' | null>(null);

  const what = (query || '').trim();

  const send = async (withContact: boolean) => {
    setBusy(true); setErr(null);
    try {
      const r = await needsAPI.create({
        raw: what || concept || 'طلب', city, concept,
        contact: withContact ? contact.trim() : undefined,
      });
      setDone(r.reachable ? 'reachable' : 'anon');
    } catch (e: any) {
      setErr(e?.message || 'تعذّر التسجيل — عاود من بعد');
    }
    setBusy(false);
  };

  if (done) {
    return (
      <div style={{ maxWidth: 460, margin: '0 auto', padding: '26px 20px', borderRadius: 16, textAlign: 'center', border: '1px solid rgba(34,197,94,.35)', background: 'rgba(34,197,94,.07)' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: INK1, marginBottom: 7 }}>سجّلنا حاجتك</div>
        <div style={{ fontSize: 12.5, color: INK3, lineHeight: 1.8 }}>
          {done === 'reachable'
            ? <>كنقلّبو ليك على <b style={{ color: INK1 }}>{what}</b>{city ? ` ف${city}` : ''} ونعيّطو ليك ملّي نلقاو.</>
            : <>سجّلناها بلا اتّصال. رجع من بعد وشوف — ولا خلّي رقمك باش نعيّطو ليك.</>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 460, margin: '0 auto', padding: '24px 20px', borderRadius: 16, border: LINE, background: 'var(--panel,rgba(255,255,255,.03))' }}>
      <div style={{ fontSize: 40, marginBottom: 10, textAlign: 'center' }}>🔎</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: INK1, textAlign: 'center', marginBottom: 6 }}>
        ما لقّيناش {what ? `«${what}»` : ''}{city ? ` ف${city}` : ''} دابا
      </div>
      {/* لا نطلب منه أن ينشر — هو جاء يطلب لا يعرض. */}
      <div style={{ fontSize: 12.5, color: INK3, textAlign: 'center', lineHeight: 1.8, marginBottom: 16 }}>
        عاد كنبداو فهاد المدينة. خلّي رقمك ونعيّطو ليك ملّي نلقاو — بلاش وبلا حساب.
      </div>

      <input value={contact} onChange={e => { setContact(e.target.value); setErr(null); }}
        placeholder="06 12 34 56 78 — ولا البريد" inputMode="tel" dir="ltr"
        style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, border: err ? '1px solid rgba(239,68,68,.5)' : LINE, background: 'rgba(255,255,255,.03)', color: INK1, fontSize: 14, fontFamily: 'inherit', outline: 'none', textAlign: 'center' }} />
      {err && <div style={{ fontSize: 12, color: '#FCA5A5', marginTop: 7, textAlign: 'center' }}>{err}</div>}

      <button onClick={() => send(true)} disabled={busy || !contact.trim()}
        style={{ width: '100%', marginTop: 11, padding: '12px 16px', borderRadius: 12, border: 'none', background: contact.trim() ? EMBER : 'rgba(255,255,255,.10)', color: contact.trim() ? '#fff' : INK3, fontSize: 14, fontWeight: 800, fontFamily: 'inherit', cursor: contact.trim() ? 'pointer' : 'default' }}>
        {busy ? '…' : 'عيّطو ليّ ملّي تلقاو'}
      </button>

      {/* من لا يريد ترك رقمه: الإشارة تُلتقط مجهّلةً، ولا نفقد الطلب. */}
      <button onClick={() => send(false)} disabled={busy}
        style={{ width: '100%', marginTop: 8, padding: '9px', borderRadius: 12, border: 'none', background: 'transparent', color: INK3, fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
        سجّل حاجتي بلا رقم
      </button>
    </div>
  );
}
