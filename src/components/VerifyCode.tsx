import { useState, useEffect, useRef } from 'react';
import { Check, Loader2, RotateCcw } from 'lucide-react';
import { verifyAPI } from '../services/api';

// ============================================================
// بابُ التحقّق — **مكوّنٌ واحدٌ لكلّ فعلٍ يحتاج رمزًا**.
//
//   بُنيت القاعدةُ محايدةَ القناة (`server/lib/verify`) ولم يكن لها بابٌ في
//   التطبيق. وهذا بالضبط الصنفُ الذي طاردناه طوال هذا التدقيق: طبقةٌ صحيحةٌ
//   مُختبَرةٌ لا يبلغها إنسان.
//
//   ── ولا يعرف هذا المكوّنُ قناةً بعينها ──
//   لا زرَّ «أرسل واتساب» ولا «أرسل SMS» مكتوبًا هنا: القنواتُ تُقرأ من
//   الخادم (`/verify/channels`) وتُعرَض **ما هو مُهيّأٌ منها فقط**. فزرُّ
//   قناةٍ لا تُرسل وعدٌ لا يُوفى، ومن ضغطه ينتظر رمزًا لن يصل.
//
//   ── وما يُعرَض بعد الإرسال ──
//   القناةُ التي سافر بها الرمزُ فعلًا، والهويّةُ **مقنَّعة**. فمن أرسل إلى
//   نمرةٍ خطأً يراها فورًا بدل أن ينتظر رمزًا ذهب إلى غيره.
// ============================================================

interface Props {
  /** ما يُثبَت ملكُه: بريدٌ أو رقم. */
  identifier: string;
  /** الفعلُ الذي طلب التحقّق — يُربَط به الرمزُ فلا يصلح لفعلٍ آخر. */
  purpose: 'login' | 'phone_change' | 'order_confirm' | 'password_reset';
  /** ماذا يجري بعد النجاح. */
  onVerified: () => void;
  onCancel?: () => void;
  /** سطرٌ يشرح لماذا نطلب التحقّقَ الآن — لا يُطلَب رمزٌ بلا سبب. */
  why?: string;
}

export default function VerifyCode({ identifier, purpose, onVerified, onCancel, why }: Props) {
  const [phase, setPhase] = useState<'idle' | 'sending' | 'sent' | 'checking' | 'done'>('idle');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [sentTo, setSentTo] = useState<{ channel: string; masked: string } | null>(null);
  const [usable, setUsable] = useState<{ id: string; name: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // ما هو مُهيّأٌ لهذه الهويّة — يُسأل الخادمُ ولا يُخمَّن في الواجهة.
  useEffect(() => {
    let dead = false;
    verifyAPI.channels(identifier)
      .then(r => { if (!dead) setUsable(r.all.filter(c => r.usable.includes(c.id))); })
      .catch(() => { /* تبقى القائمةُ فارغةً ويُرسَل على الافتراضيّ */ });
    return () => { dead = true; };
  }, [identifier]);

  const send = async (channel?: string) => {
    setErr(''); setPhase('sending');
    try {
      const r = await verifyAPI.start(identifier, purpose, channel);
      setSentTo({ channel: r.channel, masked: r.masked });
      setPhase('sent');
      setTimeout(() => inputRef.current?.focus(), 60);
    } catch (e: any) {
      // رسالةُ الخادم تُعرَض كما هي: هو وحدَه يعرف **لماذا** تعذّر الإرسال
      // (لا قناة · هويّةٌ خاطئة · عطبٌ عابر)، وصياغةُ رسالةٍ عامّةٍ هنا تُخفيه.
      setErr(e?.message || 'ما قدرناش نصيفطو الكود');
      setPhase('idle');
    }
  };

  const check = async () => {
    if (code.trim().length < 4) return;
    setErr(''); setPhase('checking');
    try {
      await verifyAPI.check(identifier, purpose, code.trim());
      setPhase('done');
      onVerified();
    } catch (e: any) {
      setErr(e?.message || 'كود ماشي صحيح');
      setPhase('sent');
      setCode('');
      inputRef.current?.focus();
    }
  };

  const box: React.CSSProperties = {
    border: '1px solid var(--border,rgba(255,255,255,.12))',
    background: 'var(--panel,rgba(255,255,255,.04))',
    borderRadius: 14, padding: '14px 16px', display: 'flex',
    flexDirection: 'column', gap: 10,
  };

  if (phase === 'done') {
    return (
      <div style={{ ...box, borderColor: 'rgba(10,143,111,.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mint,#12A150)', fontWeight: 800, fontSize: 13.5 }}>
          <Check size={16} /> تأكّد — مرسي
        </div>
      </div>
    );
  }

  return (
    <div style={box}>
      {why && <div style={{ fontSize: 12.5, color: 'var(--ink3)', fontWeight: 600 }}>{why}</div>}

      {phase === 'idle' || phase === 'sending' ? (
        <>
          {/* لا قناةَ مُهيّأة ⇒ يُقال صراحةً. الزرُّ الذي لا يُرسل أسوأُ من غيابه. */}
          {usable.length === 0 ? (
            <div style={{ fontSize: 12.5, color: 'var(--warn,#F59E0B)', fontWeight: 700 }}>
              ما كايناش شي قناة مهيّأة باش نصيفطو الكود — زيد بريد ولا ربط واتساب من الإعدادات.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {usable.map(c => (
                <button key={c.id} onClick={() => send(c.id)} disabled={phase === 'sending'}
                  style={{ padding: '9px 15px', borderRadius: 11, border: '1px solid var(--border2,rgba(255,255,255,.14))',
                    background: 'transparent', color: 'var(--ink1)', fontSize: 12.5, fontWeight: 800,
                    fontFamily: 'inherit', cursor: phase === 'sending' ? 'wait' : 'pointer' }}>
                  {phase === 'sending' ? <Loader2 size={13} className="spin" /> : `صيفط ليا ف ${c.name}`}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ fontSize: 12.5, color: 'var(--ink3)' }}>
            صيفطنا الكود ف <strong style={{ color: 'var(--ink1)' }}>{sentTo?.channel === 'whatsapp' ? 'واتساب' : sentTo?.channel === 'sms' ? 'رسالة' : 'البريد'}</strong>
            {' '}لـ <strong style={{ color: 'var(--ink1)', direction: 'ltr', display: 'inline-block' }}>{sentTo?.masked}</strong>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={e => { if (e.key === 'Enter') check(); }}
              inputMode="numeric"
              placeholder="••••••"
              aria-label="كود التحقّق"
              style={{ flex: 1, padding: '11px 14px', borderRadius: 11, textAlign: 'center',
                letterSpacing: '.5em', fontSize: 17, fontWeight: 900, direction: 'ltr',
                border: '1px solid var(--border2,rgba(255,255,255,.14))',
                background: 'var(--void2,rgba(0,0,0,.18))', color: 'var(--ink1)', fontFamily: 'inherit' }}
            />
            <button onClick={check} disabled={code.length < 4 || phase === 'checking'}
              style={{ padding: '11px 18px', borderRadius: 11, border: 'none',
                background: code.length >= 4 ? 'var(--ember,#FF6A00)' : 'var(--panel2,rgba(255,255,255,.06))',
                color: code.length >= 4 ? '#fff' : 'var(--ink3)', fontSize: 13, fontWeight: 800,
                fontFamily: 'inherit', cursor: code.length >= 4 ? 'pointer' : 'not-allowed' }}>
              {phase === 'checking' ? <Loader2 size={14} className="spin" /> : 'أكّد'}
            </button>
          </div>
          <button onClick={() => send(sentTo?.channel)}
            style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--ink3)',
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', padding: 0 }}>
            <RotateCcw size={11} style={{ verticalAlign: 'middle', marginLeft: 4 }} /> عاود صيفط
          </button>
        </>
      )}

      {/* رسالةُ الخادم كما هي — فيها «بقا ليك ٣ محاولات» وهو ما يحتاجه الإنسان. */}
      {err && <div style={{ fontSize: 12.5, color: 'var(--red,#F5484A)', fontWeight: 700 }}>{err}</div>}

      {onCancel && (
        <button onClick={onCancel}
          style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--ink3)',
            fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', padding: 0 }}>
          إلغاء
        </button>
      )}
    </div>
  );
}
