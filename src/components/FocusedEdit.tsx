import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import VerifyCode from './VerifyCode';
import { X, Check, Loader2 } from 'lucide-react';
import type { ActionObject } from '../lib/akg/kb/actions';

// ============================================================
// **نافذةٌ تفتح الشيءَ المطلوبَ وحدَه.**
//
//   طلبُ صاحب المشروع نصًّا: «نافذة منبثقة تفتح فقط الشيء الذي يطلبه
//   المستخدم — مثلًا رقم الهاتف تفتح فقط خانة لكتابة رقم الهاتف، ليس صفحة
//   الإعدادات بالكامل».
//
//   والعطبُ مقيس: «بدّل اسم المحلّ» و«بدّل العنوان» و«بدّل اللغة» ثلاثةُ
//   أفعالٍ لها بابٌ واحدٌ فيه خمسون حقلًا. فمن طلب حقلًا يُلقى في صفحةٍ
//   ويُترَك يبحث — فيظنّ أنّ التطبيق لم يفهمه، وقد فهمه تمامًا.
//
//   ── ولماذا لا تفتح كلَّ هدفٍ يُقرأ ──
//   لأنّ نافذةً تُفتَح ولا تحفظ **أسوأُ من صفحةٍ كاملة**: الصفحةُ تُتعِب
//   والنافذةُ الكاذبةُ تُوهِم أنّ العملَ تمّ. فلا يُفتَح حقلٌ إلّا وله مسارُ
//   حفظٍ حقيقيٌّ مقيس. وما لا نافذةَ له يُساق إلى صفحته كما كان — ولا
//   يُخترَع له شيء.
//
//   ── والنمرةُ تمرّ بالتحقّق كما تمرّ في الإعدادات ──
//   لا نسخةَ ثانيةً من ذلك المسار: نفسُ `VerifyCode` ونفسُ الغرض
//   (`phone_change`) ونفسُ الحفظ. نمرةٌ تُبدَّل بلا تأكيدٍ من نافذةٍ سريعةٍ
//   تعني بابًا خلفيًّا حول حمايةٍ بُنيت عمدًا.
// ============================================================

/** الحقولُ التي **لها مسارُ حفظٍ حقيقيّ**. ما ليس هنا يُساق إلى صفحته. */
export const FOCUSABLE = ['phone', 'shop_name', 'address', 'language', 'shop_hours'] as const;
export type FocusField = typeof FOCUSABLE[number];

export const isFocusable = (o?: ActionObject | string): o is FocusField =>
  !!o && (FOCUSABLE as readonly string[]).includes(o);

const TITLE: Record<FocusField, string> = {
  phone: 'النمرة ديالك',
  shop_name: 'اسم المحلّ',
  address: 'العنوان',
  language: 'اللغة',
  shop_hours: 'وقت الخدمة',
};
const WHY: Record<FocusField, string> = {
  phone: 'هي القناة اللي كيوصلو بيك الزبناء — كتبان ف المتجر وف رسالة واتساب.',
  shop_name: 'هادشي اللي كيشوفو الزبناء ف المتجر وف كل رسالة.',
  address: 'كيبان للزبناء وكيدخل ف حساب التوصيل.',
  language: 'لغة التطبيق والرسائل اللي كتصيفط.',
  shop_hours: 'كيبان للزبون واش نتا محلول دابا ولا لا.',
};

export default function FocusedEdit({ field, onClose }: { field: FocusField; onClose: () => void }) {
  const { settings, updateSettings, notify } = useStore();
  const b = settings.brand;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [verifying, setVerifying] = useState(false);
  const firstRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  const initial = useMemo(() => ({
    phone: b?.phone || '',
    shop_name: b?.name || '',
    address: b?.address || '',
    language: b?.language || 'ar',
    shop_hours: '',
  }), [b]);

  const [value, setValue] = useState(initial[field]);
  const [start, setStart] = useState(b?.workStart || '09:00');
  const [end, setEnd] = useState(b?.workEnd || '21:00');

  // الخانةُ جاهزةٌ للكتابة فورًا: من طلب حقلًا لا يُطلَب منه أن ينقر عليه.
  useEffect(() => { firstRef.current?.focus(); }, []);
  // و«خروج» تُغلق — نافذةٌ لا تُغلَق بالمفتاح تُشعِر بأنّها فخّ.
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const save = async (patch: Record<string, unknown>) => {
    setBusy(true); setErr('');
    try {
      await updateSettings('brand', { ...b, ...patch });
      notify('success', `✅ تبدّل ${TITLE[field]}`);
      onClose();
    } catch (e: any) {
      // لا تُغلَق النافذةُ على فشل: إغلاقُها يعني أنّ العملَ تمّ وهو لم يتمّ.
      setErr(e?.message || 'ما تسجّلش — عاود');
    }
    setBusy(false);
  };

  const submit = () => {
    if (field === 'shop_hours') return save({ workStart: start, workEnd: end });
    const v = String(value).trim();
    if (!v) { setErr('الخانة خاوية'); return; }
    if (field === 'phone') {
      if (v.replace(/\D/g, '').length < 9) { setErr('النمرة ناقصة'); return; }
      if (v === (b?.phone || '').trim()) { onClose(); return; }
      // **نفسُ حمايةِ الإعدادات**: لا تُحفَظ نمرةٌ قبل أن يُثبِت صاحبُها أنّها له.
      setVerifying(true);
      return;
    }
    save(field === 'shop_name' ? { name: v } : field === 'address' ? { address: v }
      : { language: v });
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 15px', borderRadius: 13, fontSize: 15, fontFamily: 'inherit',
    border: '1px solid var(--border2,rgba(255,255,255,.16))',
    background: 'var(--void2,rgba(0,0,0,.2))', color: 'var(--ink1)',
  };

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={TITLE[field]}
      style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 18, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(3px)' }}>
      <div onClick={e => e.stopPropagation()} dir="rtl"
        style={{ width: '100%', maxWidth: 420, borderRadius: 20, padding: '20px 22px 22px',
          background: 'var(--panel,#0F1626)', border: '1px solid var(--border,rgba(255,255,255,.12))',
          boxShadow: '0 24px 70px rgba(0,0,0,.5)', fontFamily: 'Tajawal, system-ui, sans-serif' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h2 style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink1)' }}>{TITLE[field]}</h2>
          <button onClick={onClose} aria-label="سدّ"
            style={{ marginInlineStart: 'auto', background: 'none', border: 'none',
              color: 'var(--ink3)', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.7, marginBottom: 14 }}>{WHY[field]}</p>

        {verifying ? (
          <VerifyCode
            identifier={String(value).trim()}
            purpose="phone_change"
            why="النمرة هي الطريق الوحيد اللي كيوصلو بيه الزبناء ليك — خاصنا نتأكّدو منها."
            onCancel={() => setVerifying(false)}
            onVerified={() => save({ phone: String(value).trim() })}
          />
        ) : (
          <>
            {field === 'shop_hours' ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <label style={{ flex: 1, fontSize: 12, color: 'var(--ink3)' }}>من
                  <input ref={firstRef as any} type="time" value={start} onChange={e => setStart(e.target.value)} style={{ ...inp, marginTop: 5 }} />
                </label>
                <label style={{ flex: 1, fontSize: 12, color: 'var(--ink3)' }}>حتّى
                  <input type="time" value={end} onChange={e => setEnd(e.target.value)} style={{ ...inp, marginTop: 5 }} />
                </label>
              </div>
            ) : field === 'language' ? (
              <select ref={firstRef as any} value={value} onChange={e => setValue(e.target.value)} style={inp}>
                <option value="ar">العربيّة</option>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            ) : (
              <input ref={firstRef as any} value={value}
                onChange={e => { setValue(e.target.value); setErr(''); }}
                onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                dir={field === 'phone' ? 'ltr' : undefined}
                placeholder={field === 'phone' ? '06XXXXXXXX' : undefined}
                aria-label={TITLE[field]} style={inp} />
            )}

            {err && <p style={{ marginTop: 9, fontSize: 12.5, fontWeight: 700, color: 'var(--red,#F5484A)' }}>{err}</p>}

            <div style={{ display: 'flex', gap: 9, marginTop: 15 }}>
              <button onClick={submit} disabled={busy}
                style={{ flex: 1, padding: '12px', borderRadius: 13, border: 'none', fontFamily: 'inherit',
                  fontSize: 14, fontWeight: 800, background: 'var(--ember,#FF6A00)', color: '#fff',
                  cursor: busy ? 'wait' : 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 7 }}>
                {busy ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
                {field === 'phone' ? 'أكّد النمرة' : 'سجّل'}
              </button>
              <button onClick={onClose}
                style={{ padding: '12px 16px', borderRadius: 13, fontFamily: 'inherit', fontSize: 13,
                  fontWeight: 700, background: 'transparent', color: 'var(--ink3)',
                  border: '1px solid var(--border2,rgba(255,255,255,.14))', cursor: 'pointer' }}>
                بلاش
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
