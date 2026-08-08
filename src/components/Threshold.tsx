import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { Loader2, ArrowLeft } from 'lucide-react';

// ============================================================
// **العتبة — التسجيلُ سطرٌ في المحادثة، لا صفحةٌ تُقتَحم.**
//
//   ── العطبُ الذي وُلدت منه، مقيسًا ──
//   الرحلةُ اليومَ ثلاثُ شاشاتٍ وإعادتا تحميل:
//
//       /        صفحةُ الهبوط — يكتب حاجتَه ويُفهَم
//         ↓  «دخول» = <a href="/login">   ← **إعادةُ تحميلٍ كاملةٌ للمتصفّح**
//       /login   استمارةٌ في ٥٤٩ سطرًا
//         ↓  window.location.assign('/home')  ← إعادةُ تحميلٍ ثانية
//       /home    المحادثة
//
//   و`<a href>` في تطبيق React Router ليس تنقّلًا — **هو هدمُ التطبيق
//   وإعادةُ بنائه**. فما كتبه الإنسانُ وما فُهم منه يُمحى في اللحظة التي
//   يضغط فيها «دخول». وهو أوّلُ سببٍ يجعل إنسانًا لا يعود: لا يرى عطبًا،
//   يرى **عملَه يختفي**.
//
//   ── والقاعدة ──
//   **شاشةٌ واحدةٌ من أوّل زيارةٍ إلى آخر فعل.** والعتبةُ تظهر حيث يقف
//   الإنسانُ، وتُخفى فور عبورها، ويُكمل ما كان يفعله — لا يُساق إلى مكانٍ
//   آخرَ ليعود.
//
//   ── وحدُّها: لا تخترع مصادقةً ──
//   تنادي `login`/`register` من المخزن كما تناديهما `AuthPage`. فلا مسارَ
//   خادمٍ جديد، ولا سرَّ يُخزَّن هنا، ولا طريقَ ثانيًا للدخول. هي **شكلٌ
//   جديدٌ لبابٍ قائم** — ولو حُذفت بقيت `AuthPage` تعمل كما هي.
//
//   ── وما ليس فيها بعد ──
//   الدخولُ بالنمرة ورمزٍ يُرسَل. `/api/auth/request-otp` مبنيٌّ ويعمل لكنّه
//   **يشترط `auth`** — فهو لمن دخل يبدّل نمرتَه، لا لمن يدخل. وبناؤه يحتاج
//   مسارًا عامًّا وحدَّ محاولاتٍ وقناةَ رسائل، وهي مساحةٌ أمنيّةٌ لا تُرتجَل.
// ============================================================

type Step = 'who' | 'secret';

export default function Threshold({ why, onDone, onCancel }: {
  /** لماذا نطلبه الآن — يُقال قبل أن يُطلَب شيء. */
  why: string;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const { login, register } = useStore();
  const [step, setStep] = useState<Step>('who');
  const [isNew, setIsNew] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { ref.current?.focus(); }, [step]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async () => {
    setErr('');
    if (step === 'who') {
      if (!emailOk) { setErr('كتب بريدًا صحيحًا'); return; }
      setStep('secret');
      return;
    }
    if (secret.length < 6) { setErr('كلمةُ السرّ خاصّها ٦ حروف على الأقلّ'); return; }
    if (isNew && !name.trim()) { setErr('شنو سميتك؟'); return; }
    setBusy(true);
    try {
      if (isNew) await register(name.trim(), email.trim(), secret);
      else await login(email.trim(), secret);
      onDone();
    } catch (e: any) {
      // **ورسالةُ الخطأ تُقال بالدارجة** — «Invalid credentials» ليست جوابًا
      //   لمغربيّ. والخطأُ الشائعُ أنّه سجّل من قبل ولا يذكر، أو العكس.
      const raw = String(e?.message || '');
      setErr(/exists|مسجّل|موجود/i.test(raw) ? 'هاد البريد مسجّل من قبل — دخل بكلمة السرّ ديالك.'
        : /invalid|غير صحيح/i.test(raw) ? 'البريد ولا كلمةُ السرّ ماشي صحيحين.'
          : 'ما قدرناش دابا — عاود من بعد.');
    } finally { setBusy(false); }
  };

  // ── **ألوانٌ مكتفيةٌ بذاتها — لا تستعير سِمةَ صفحة** ────────────
  //
  //   عطبٌ رآه صاحبُ المشروع: نصُّ العتبة **باهتٌ لا يُقرأ**. والسببُ أنّها
  //   كُتبت بـ`var(--ink1)` — وهو **أبيضُ** (`#F0F4FF`) في سِمة التطبيق،
  //   بينما صفحةُ الهبوط **فاتحة** (`#FAF8F2`). فأبيضُ على فاتحٍ يختفي.
  //
  //   والعتبةُ تظهر في **صفحتَين بسِمتَين متعاكستَين**، فلا تصحّ لها ألوانٌ
  //   مستعارة. ولذلك تحمل ألوانَها: أرضيّةٌ صريحةٌ وحبرٌ صريحٌ عليها —
  //   تُقرأ في الاثنتَين بلا أن تسأل أيَّهما هي.
  const K = { ink: '#0F1A15', ink2: '#586B61', ink3: '#8A948E', line: 'rgba(15,26,21,.14)', field: '#FFFFFF' };
  const B = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 11, border: 'none', fontSize: 13.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' } as const;

  return (
    <div style={{
      maxWidth: 620, width: '100%', margin: '8px auto 0', padding: '15px 17px',
      borderRadius: 16, border: '1px solid rgba(10,143,111,.34)', background: '#F2FAF6', boxShadow: '0 6px 22px rgba(15,26,21,.07)',
      direction: 'rtl',
    }}>
      {/* لماذا نطلب — **قبل** أن نطلب. ومن طُلب منه شيءٌ بلا سببٍ يظنّه ضريبة. */}
      <div style={{ fontSize: 13.5, fontWeight: 700, color: K.ink2, lineHeight: 1.8, marginBottom: 12 }}>
        {why}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {step === 'who' ? (
          <input
            ref={ref} value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            placeholder="البريد الإلكتروني" type="email" inputMode="email" autoComplete="email"
            aria-label="البريد الإلكتروني" dir="ltr"
            style={{ flex: '1 1 200px', minWidth: 0, padding: '10px 13px', borderRadius: 11, background: K.field, border: `1px solid ${K.line}`, color: K.ink, fontSize: 14.5, fontWeight: 700, fontFamily: 'inherit' }}
          />
        ) : (
          <>
            {isNew && (
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="سميتك" aria-label="سميتك"
                style={{ flex: '1 1 130px', minWidth: 0, padding: '10px 13px', borderRadius: 11, background: K.field, border: `1px solid ${K.line}`, color: K.ink, fontSize: 14.5, fontWeight: 700, fontFamily: 'inherit' }}
              />
            )}
            <input
              ref={ref} value={secret} onChange={e => setSecret(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              placeholder="كلمة السرّ" type="password"
              autoComplete={isNew ? 'new-password' : 'current-password'}
              aria-label="كلمة السرّ" dir="ltr"
              style={{ flex: '1 1 150px', minWidth: 0, padding: '10px 13px', borderRadius: 11, background: K.field, border: `1px solid ${K.line}`, color: K.ink, fontSize: 14.5, fontWeight: 700, fontFamily: 'inherit' }}
            />
          </>
        )}
        <button onClick={submit} disabled={busy} style={{ ...B, background: '#0A8F6F', color: '#fff' }}>
          {busy ? <Loader2 size={15} className="amz-spin" /> : <ArrowLeft size={15} />}
          {step === 'who' ? 'كمّل' : isNew ? 'دخل' : 'دخول'}
        </button>
      </div>

      {err && (
        <div role="alert" style={{ marginTop: 9, fontSize: 12.5, fontWeight: 700, color: '#C0392B' }}>{err}</div>
      )}

      <div style={{ marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <button
          onClick={() => { setIsNew(v => !v); setErr(''); }}
          style={{ background: 'none', border: 'none', padding: 0, color: K.ink3, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {isNew ? 'عندي حساب من قبل' : 'ما عنديش حساب — نصايب واحد'}
        </button>
        {onCancel && (
          <button onClick={onCancel} style={{ background: 'none', border: 'none', padding: 0, color: K.ink3, fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>
            من بعد
          </button>
        )}
      </div>
    </div>
  );
}
