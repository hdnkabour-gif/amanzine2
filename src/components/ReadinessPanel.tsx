import { useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { readinessAPI, type ReadinessCheck } from '../services/api';

// ============================================================
// بوّابةُ الجاهزيّة — القائمةُ التي تُنفَّذ، لا التي تُقرأ.
//
//   البوّابةُ الرسميّة بين «البنية التحتيّة» و«تجربة المستخدم»: لا يُنتقَل
//   للمرحلة التالية وبندٌ لازمٌ أحمر. وكلُّ سطرٍ هنا نتيجةُ فحصٍ نُفِّذ على
//   الخادم الآن — لا علامةً وضعها إنسانٌ في وثيقة.
//
//   ثلاثةُ ألوانٍ لا لونان: الرماديُّ (`null`) يعني **لم يُفحَص**، ولا يُعَدّ
//   نجاحًا أبدًا. النسخُ الاحتياطيّةُ عند مزوّد الاستضافة مثالُه: لا نستطيع
//   رؤيتَها، فلا نختمها.
// ============================================================

const BORDER = '1px solid var(--border,rgba(255,255,255,0.08))';
const INK1 = 'var(--ink1,#FAFAFA)';
const INK3 = 'var(--ink3,#7E877F)';
const GREEN = '#34d399', RED = '#f87171', GREY = '#8b8b8b';

const MARK = (ok: boolean | null) => (ok === true ? '✅' : ok === false ? '❌' : '➖');
const COLOR = (ok: boolean | null) => (ok === true ? GREEN : ok === false ? RED : GREY);

export default function ReadinessPanel() {
  const [data, setData] = useState<{ ready: boolean; blocking: string[]; checks: ReadinessCheck[] } | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true); setErr('');
    readinessAPI.get()
      .then(setData)
      .catch(e => setErr(e?.message || 'تعذّر قراءة الحالة'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const required = (data?.checks || []).filter(c => c.required);
  const optional = (data?.checks || []).filter(c => !c.required);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ShieldCheck size={18} color={data?.ready ? GREEN : RED} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: INK1 }}>
            {loading ? 'جارٍ الفحص…' : data?.ready ? '🟢 جاهزٌ للإطلاق' : '🔴 غيرُ جاهز'}
          </div>
          <div style={{ fontSize: 12, color: INK3 }}>
            {data?.blocking?.length
              ? `يمنع العبور: ${data.blocking.join(' · ')}`
              : 'كلُّ بندٍ لازمٍ أخضر — يمكن الانتقال لتجربة المستخدم'}
          </div>
        </div>
        <button onClick={load} disabled={loading} className="btn btn-ghost btn-sm" style={{ gap: 5 }}>
          <RefreshCw size={13} /> أعِد الفحص
        </button>
      </div>

      {err && <p style={{ fontSize: 12.5, color: RED }}>{err}</p>}

      {!!required.length && (
        <Section title="لازمٌ للإطلاق" note="فشلُ أيٍّ منها يُغلق البوّابة">
          {required.map(c => <Row key={c.id} c={c} />)}
        </Section>
      )}

      {!!optional.length && (
        <Section title="اختياريّ" note="غيابُه لا يمنع الإطلاق، لكنّه يُنقص قدرةً">
          {optional.map(c => <Row key={c.id} c={c} />)}
        </Section>
      )}

      <p style={{ fontSize: 11, color: INK3, lineHeight: 1.7 }}>
        ➖ يعني <strong>لم يُفحَص</strong> — لا «سليم». ما لا يستطيع التطبيقُ رؤيتَه (النسخُ
        الاحتياطيّةُ عند مزوّد قاعدة البيانات مثلًا) لا يُختَم بالخضرة.
      </p>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div style={{ border: BORDER, borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: INK1 }}>{title}</span>
        <span style={{ fontSize: 11, color: INK3 }}>{note}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ c }: { c: ReadinessCheck }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', padding: '6px 0', borderTop: BORDER, fontSize: 12.5 }}>
      <span>{MARK(c.ok)}</span>
      <span style={{ fontWeight: 800, color: COLOR(c.ok), minWidth: 130 }}>{c.label}</span>
      <span style={{ color: INK3, flex: 1 }}>{c.detail}</span>
    </div>
  );
}
