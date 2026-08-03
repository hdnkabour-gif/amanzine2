import { useState } from 'react';
import { useStore } from '../store';
import { MOROCCAN_CITIES } from '../lib/needEngine';

// ============================================================
// الترحيب — شاشتان: تحيّةٌ ثمّ تعارف.
//
//   كان هنا سبعُ حالاتٍ مُعلَنةٍ وثلاثٌ في `ORDER`، وخمسُ شاشاتٍ **مرسومةٌ
//   بلا بابٍ يبلغها**: العلامة · النوع · الفئة · الذكاء · «كل شيء جاهز».
//   `next()` يمشي في `ORDER` وحدَها، و`finishMeet` تُنهي الرحلةَ وتنتقل —
//   فلا يصل أحدٌ إلى `done` أصلًا.
//
//   ومن ذلك وُلد ما رآه المالك: «الخطوة ١ من ١» = `ORDER.length - 2` حرفيًّا.
//
//   وحملت الشاشاتُ الميّتةُ **قائمةَ فئاتٍ سابعةً** تخالف الكتالوج إملاءً
//   («إكسسوارات» مقابل «أكسسوارات») وتسميةً («منزل وديكور» مقابل «ديكور
//   ومنزل»)، وقائمةَ مدنٍ ثانيةً بجانب `MOROCCAN_CITIES`. وكتبت
//   `businessCategory` الذي **لا يقرؤه شيءٌ في المشروع كلِّه** — وقيمتُه
//   دائمًا فارغةٌ لأنّ شاشتَه لم تكن تُعرَض.
//
//   الحلُّ ليس وصلَ الأبواب: خمسُ شاشاتٍ أطولُ لا تخدم مَن نريد أن يبيع في
//   أقلّ من دقيقة. الحلُّ حذفُ ما لا يُقرأ، وإبقاءُ ما يُقرأ.
// ============================================================

type Step = 'welcome' | 'meet';
const ORDER: Step[] = ['welcome', 'meet'];

// «نتعارفو» — قدراتٌ لا أدوارٌ مقفلة. ملفٌّ واحد يقدر يدير عدّة أشياء (اليوم محتاج،
// غدًا مزوّد، بعدها تاجر). يختار المستخدم أكثر من واحدة، ويقدر يزيد/ينقص لاحقًا.
const INTERESTS: { id: string; icon: string; label: string }[] = [
  { id: 'find',    icon: '🔎', label: 'نلقى خدمة ولا منتج' },
  { id: 'provide', icon: '🔧', label: 'نقدّم خدمة (حرفيّ/مختصّ)' },
  { id: 'sell',    icon: '🛍️', label: 'نبيع منتجات' },
  { id: 'shop',    icon: '🏪', label: 'عندي محلّ / مؤسّسة' },
];

// المدنُ من `needEngine` — كانت هنا قائمةٌ ثانيةٌ بثلاثَ عشرةَ مدينةً بينما
// يفهم المحرّكُ عشراتٍ. من سكن مدينةً خارج الثلاثَ عشرةَ كان يختار «أخرى».
const CITIES = MOROCCAN_CITIES;

export default function Onboarding() {
  const { settings, updateSettings, setOnboardingCompleted, setPage } = useStore();
  const [step, setStep] = useState<Step>('welcome');
  const [meet, setMeet] = useState({ name: '', city: '', phone: '' });
  const [caps, setCaps] = useState<Set<string>>(new Set(['find']));

  const idx = ORDER.indexOf(step);
  const pct = (idx / (ORDER.length - 1)) * 100;
  const next = () => { if (idx < ORDER.length - 1) setStep(ORDER[idx + 1]); };

  const toggleCap = (id: string) => setCaps(prev => {
    const n = new Set(prev);
    if (id === 'find') return n;           // «نلقى» أساسيّة دائمًا
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  // «نتعارفو» — يحفظ الاسم/المدينة + القدرات (متعدّدة)، ويوجّه حسب ما يهمّ المستخدم.
  const finishMeet = () => {
    const capsArr = ['find', ...[...caps].filter(c => c !== 'find')];
    const wantsBusiness = capsArr.some(c => c === 'provide' || c === 'sell' || c === 'shop');
    const b = settings.brand as any;
    updateSettings('brand', { ...b, name: meet.name.trim() || b?.name || '', city: meet.city || b?.city || '', phone: meet.phone.trim() || b?.phone || '' } as any);
    updateSettings('capabilities' as any, capsArr);
    // دورٌ أساسيّ للتوافق فقط (القدرات هي المصدر الحقيقيّ).
    updateSettings('role' as any, capsArr.includes('provide') ? 'provider' : capsArr.includes('sell') || capsArr.includes('shop') ? 'merchant' : 'needer');
    updateSettings('onboardingDone', true as any);
    setOnboardingCompleted(true);
    setPage(wantsBusiness ? 'dashboard' : 'assistant');
  };

  // «تخطّي» يبقى مكتوبًا: من دخل ليشتري لا يُجبَر على التعريف بنفسه.
  const skip = () => {
    updateSettings('onboardingDone', true as any);
    setOnboardingCompleted(true);
    setPage('dashboard');
  };

  return (
    <div dir="rtl" style={{
      minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px 16px', position: 'relative', overflow: 'hidden', zIndex: 1,
    }}>
      {/* Background image — branded, professional */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(/brand/amanzine-logo.png)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.10, filter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'linear-gradient(180deg, rgba(10,22,40,.88), rgba(10,22,40,.96))' }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: 440 }}>
        {/* Simple progress bar (no busy step circles) */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            {/* كانت «الخطوة ١ من ١»: `ORDER.length - 2` على ثلاثِ خطواتٍ
                إحداها ميّتة. لا عدَّ الآن — شاشتان، والعدُّ ثرثرةٌ فيهما. */}
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink2)' }}>
              {step === 'welcome' ? 'لنبدأ 👋' : 'نتعارفو'}
            </span>
            {step !== 'welcome' && (
              <button onClick={skip} style={{ fontSize: 12, color: 'var(--ink3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>تخطي</button>
            )}
          </div>
          <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #FF6A00, #FF8533)', borderRadius: 99, transition: 'width .4s cubic-bezier(.4,0,.2,1)' }} />
          </div>
        </div>

        {/* Card */}
        <div className="card card-lg anim-scale-in" key={step} style={{ padding: '30px 26px' }}>

          {/* WELCOME */}
          {step === 'welcome' && (
            <div style={{ textAlign: 'center' }}>
              {/* اللوغو شفّافٌ، وخلفيّةُ `transparent` كانت تكشف رقعةَ الشطرنج
                  خلفه على بعض المتصفّحات. خلفيّةٌ صريحةٌ تُنهي ذلك. */}
              <div style={{ width: 84, height: 84, margin: '0 auto 16px', borderRadius: 22, overflow: 'hidden', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                <img src="/brand/amanzine-logo.png" alt="AMANZINE" style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.parentElement as HTMLElement).innerHTML = '<span style="font-size:34px;font-weight:900;color:#006233">A</span>'; }} />
              </div>
              {/* فيديو ترحيبي — يعمل صامتًا تلقائيًا، مع أزرار تحكّم لتشغيل الصوت */}
              <div style={{ position: 'relative', width: '100%', margin: '0 auto 18px', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,.18)', background: '#000' }}>
                <video
                  autoPlay muted playsInline controls preload="metadata"
                  ref={el => { if (el) el.muted = true; }}
                  style={{ display: 'block', width: '100%', height: 'auto' }}
                >
                  <source src="/amanzine-intro.mp4" type="video/mp4" />
                </video>
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 10, color: 'var(--ink1)' }}>
                مرحباً في <span style={{ color: '#1FA565' }}>AMAN<span style={{ color: '#E0524C' }}>Z</span>INE</span>
              </h1>
              <p style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.8, marginBottom: 24 }}>
                باش نجهّزو ليك أشمن تجربة — نسولوك سؤال ولا جوج بسّاح. تقدر تبدّل كلشي من بعد.
              </p>
              <button onClick={next} className="btn btn-primary btn-xl" style={{ width: '100%', justifyContent: 'center' }}>
                لنبدأ
              </button>
              <button onClick={skip} style={{ marginTop: 12, color: 'var(--ink3)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', display: 'block', width: '100%', fontFamily: 'inherit' }}>
                تخطي والدخول مباشرة
              </button>
            </div>
          )}

          {/* MEET — «نتعارفو» : شاشةٌ واحدة، محادثةٌ خفيفة. ملفٌّ واحد بعدّة قدرات. */}
          {step === 'meet' && (
            <div>
              <div style={{ marginBottom: 16, textAlign: 'center' }}>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink1)' }}>نتعارفو 👋 بغيت نعرفك</h2>
                <p style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 6 }}>سؤال ولا جوج بسّاح — وتقدر تبدّل كلشي من بعد.</p>
              </div>

              <label style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink2)' }}>شنو سميتك؟</label>
              <input value={meet.name} onChange={e => setMeet(m => ({ ...m, name: e.target.value }))} placeholder="مثلاً: عبد اللطيف"
                style={{ width: '100%', margin: '6px 0 14px', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface,#fff1)', color: 'var(--ink1)', fontSize: 15, fontFamily: 'inherit' }} />

              <label style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink2)' }}>منين نتا؟</label>
              <select value={meet.city} onChange={e => setMeet(m => ({ ...m, city: e.target.value }))}
                style={{ width: '100%', margin: '6px 0 14px', padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface,#fff1)', color: 'var(--ink1)', fontSize: 15, fontFamily: 'inherit' }}>
                <option value="">اختر المدينة</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <label style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink2)' }}>آش يهمّك؟ <span style={{ color: 'var(--ink3)', fontWeight: 600 }}>(تقدر تختار كثر من وحدة)</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '8px 0 6px' }}>
                {INTERESTS.map(it => {
                  const on = caps.has(it.id) || it.id === 'find';
                  return (
                    <button key={it.id} onClick={() => toggleCap(it.id)} disabled={it.id === 'find'}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 13px', borderRadius: 999, cursor: it.id === 'find' ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                        border: `1.5px solid ${on ? '#0a8f6f' : 'var(--border)'}`, background: on ? '#0a8f6f22' : 'transparent', color: on ? 'var(--ink1)' : 'var(--ink3)' }}>
                      <span>{it.icon}</span>{it.label}{on && it.id !== 'find' ? ' ✓' : ''}
                    </button>
                  );
                })}
              </div>

              <button onClick={finishMeet} className="btn btn-primary btn-xl" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
                يالله نبداو
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
