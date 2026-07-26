import { useState } from 'react';
import { useStore } from '../store';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Step = 'welcome' | 'role' | 'brand' | 'type' | 'category' | 'ai' | 'done';
const ORDER: Step[] = ['welcome', 'role', 'brand', 'type', 'category', 'ai', 'done'];

// الدور — «القانون يختلف»: المحتاج يبحث ويطلب، التاجر يبيع، المزوّد يقدّم خدمة.
type Role = 'needer' | 'merchant' | 'provider';
const ROLES: { id: Role; icon: string; title: string; sub: string; color: string }[] = [
  { id: 'needer',   icon: '🙋', title: 'باغي نلقى حاجة', sub: 'خدمة، مختصّ، ولا منتج — أمانزين يوجّهك',   color: '#0a8f6f' },
  { id: 'provider', icon: '🔧', title: 'عندي خدمة نقدّمها', sub: 'حرفيّ/مختصّ — يوصلوك الزبناء',            color: '#8B5CF6' },
  { id: 'merchant', icon: '🏪', title: 'باغي نبيع منتجات', sub: 'متجر، سلع، طلبات — أدوات التاجر كاملة',   color: '#FF6A00' },
];

const BTYPE_OPTIONS = [
  { id: 'products', icon: '📦', title: 'منتجات', sub: 'ملابس، أحذية، إلكترونيات...' , color: '#FF6A00' },
  { id: 'services', icon: '🔧', title: 'خدمات',  sub: 'سباك، كهربائي، مصمم...'      , color: '#8B5CF6' },
  { id: 'digital',  icon: '💻', title: 'رقمية',  sub: 'دورات، كتب، اشتراكات...'     , color: '#0EA5E9' },
  { id: 'mixed',    icon: '🏪', title: 'الكل',   sub: 'منتجات + خدمات معاً'         , color: '#00D2B3' },
];

const CATS: Record<string, string[]> = {
  products: ['ملابس رجال', 'ملابس نساء', 'ملابس أطفال', 'أحذية', 'إكسسوارات', 'إلكترونيات', 'منزل وديكور', 'تجميل', 'أخرى'],
  services: ['كهربائي', 'سباك', 'نجار', 'صباغ', 'تكييف', 'كاميرات', 'تنظيف', 'تصميم', 'برمجة', 'تصوير', 'نقل', 'أخرى'],
  digital:  ['دورات', 'كتب', 'اشتراكات', 'تصاميم', 'برامج', 'أخرى'],
  mixed:    ['ملابس', 'أحذية', 'إكسسوارات', 'إلكترونيات', 'خدمات منزلية', 'تصميم وبرمجة', 'أخرى'],
};

const CITIES = ['الدار البيضاء', 'الرباط', 'مراكش', 'فاس', 'طنجة', 'أكادير', 'مكناس', 'وجدة', 'القنيطرة', 'تطوان', 'سلا', 'الجديدة', 'أخرى'];

export default function Onboarding() {
  const { settings, updateSettings, setOnboardingCompleted, setPage } = useStore();
  const [step, setStep] = useState<Step>('welcome');
  const [role, setRole] = useState<Role | ''>('');
  const [brand, setBrand] = useState({ name: '', currency: 'MAD', phone: '', city: '' });
  const [ai, setAi] = useState({ personality: 'Moroccan Seller', language: 'Darija', tone: 'Friendly' });
  const [businessType, setBusinessType] = useState('products');
  const [category, setCategory] = useState('');

  const idx = ORDER.indexOf(step);
  const pct = (idx / (ORDER.length - 1)) * 100;
  const next = () => { if (idx < ORDER.length - 1) setStep(ORDER[idx + 1]); };
  const prev = () => { if (idx > 0) setStep(ORDER[idx - 1]); };

  // اختيار الدور — يحسم «قانون» التجربة. المحتاج يدخل مباشرةً للحوار (لا إعداد متجر).
  const chooseRole = (r: Role) => {
    setRole(r);
    try { updateSettings('role' as any, r); } catch { /* noop */ }
    if (r === 'needer') {
      updateSettings('brand', { ...settings.brand, role: r } as any);
      updateSettings('onboardingDone', true as any);
      setOnboardingCompleted(true);
      setPage('assistant');   // «قول ليا شنو محتاج… ونوجّهك»
      return;
    }
    if (r === 'provider') setBusinessType('services');
    next();
  };

  const enteredBrand = () => {
    const b: Record<string, string> = {};
    if (brand.name.trim()) b.name = brand.name.trim();
    if (brand.phone.trim()) b.phone = brand.phone.trim();
    if (brand.city.trim()) b.city = brand.city.trim();
    if (brand.currency) b.currency = brand.currency;
    if (!settings.brand?.name || settings.brand.name === 'متجري') b.name = b.name || 'متجري';
    return b;
  };

  const finish = () => {
    const b = enteredBrand();
    updateSettings('brand', { ...settings.brand, ...b, role: role || 'merchant' } as any);
    updateSettings('ai', { ...settings.ai, ...ai });
    updateSettings('businessType' as any, businessType);
    updateSettings('businessCategory' as any, category);
    updateSettings('onboardingDone', true as any);
    setOnboardingCompleted(true);
    setPage('dashboard');
  };

  const skip = () => {
    const b = enteredBrand();
    if (Object.keys(b).length) updateSettings('brand', { ...settings.brand, ...b });
    updateSettings('onboardingDone', true as any);
    setOnboardingCompleted(true);
    setPage('dashboard');
  };

  const cats = CATS[businessType] || CATS.products;

  return (
    <div dir="rtl" style={{
      minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px 16px', position: 'relative', overflow: 'hidden', zIndex: 1,
    }}>
      {/* Background image — branded, professional */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'url(/amanzine-logo.svg)', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.10, filter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'linear-gradient(180deg, rgba(10,22,40,.88), rgba(10,22,40,.96))' }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: 440 }}>
        {/* Simple progress bar (no busy step circles) */}
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink2)' }}>
              {step === 'welcome' ? 'لنبدأ 👋' : `الخطوة ${idx} من ${ORDER.length - 2}`}
            </span>
            {step !== 'welcome' && step !== 'done' && (
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
              <div style={{ width: 84, height: 84, margin: '0 auto 16px', borderRadius: 22, overflow: 'hidden', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/amanzine-logo.svg" alt="AMANZINE" style={{ width: '100%', height: '100%', objectFit: 'contain' }}
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

          {/* ROLE — «القانون يختلف»: من أنت؟ */}
          {step === 'role' && (
            <div>
              <div style={{ marginBottom: 18, textAlign: 'center' }}>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink1)' }}>شنو جاي دير فأمانزين؟</h2>
                <p style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 6 }}>اختر باش نوجّهو ليك التجربة المناسبة — تقدر تبدّل من بعد.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {ROLES.map(r => (
                  <button key={r.id} onClick={() => chooseRole(r.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'right', padding: '16px 16px', borderRadius: 16, border: `1.5px solid ${r.color}55`, background: `${r.color}12`, cursor: 'pointer', fontFamily: 'inherit', transition: 'transform .15s' }}
                    onMouseDown={e => (e.currentTarget.style.transform = 'scale(.98)')}
                    onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                    <span style={{ fontSize: 30, flexShrink: 0 }}>{r.icon}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 16, fontWeight: 900, color: 'var(--ink1)' }}>{r.title}</span>
                      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink3)', marginTop: 2 }}>{r.sub}</span>
                    </span>
                    <ChevronLeft size={18} style={{ color: r.color, flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* BRAND — store identity */}
          {step === 'brand' && (
            <div>
              <div style={{ marginBottom: 22 }}>
                <h2 style={{ fontSize: 21, fontWeight: 900, color: 'var(--ink1)' }}>ما اسم نشاطك؟</h2>
                <p style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 4 }}>سيظهر هذا الاسم لزبائنك في متجرك</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div>
                  <label className="label">اسم المتجر / النشاط *</label>
                  <input className="input" placeholder="مثال: متجر الأناقة" value={brand.name}
                    onChange={e => setBrand(p => ({ ...p, name: e.target.value }))} autoFocus />
                </div>
                <div>
                  <label className="label">رقم الهاتف (واتساب)</label>
                  <input className="input" placeholder="+212 6XX XXX XXX" value={brand.phone}
                    onChange={e => setBrand(p => ({ ...p, phone: e.target.value }))} dir="ltr" />
                </div>
                <div>
                  <label className="label">المدينة</label>
                  <select className="input" value={brand.city} onChange={e => setBrand(p => ({ ...p, city: e.target.value }))}>
                    <option value="">اختر مدينتك</option>
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={prev} className="btn btn-ghost" style={{ paddingInline: 14 }}><ChevronRight size={18} /></button>
                <button onClick={next} disabled={!brand.name.trim()} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  التالي <ChevronLeft size={16} />
                </button>
              </div>
            </div>
          )}

          {/* TYPE — what do you sell */}
          {step === 'type' && (
            <div>
              <div style={{ marginBottom: 22 }}>
                <h2 style={{ fontSize: 21, fontWeight: 900, color: 'var(--ink1)' }}>ماذا تبيع؟</h2>
                <p style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 4 }}>سنضبط الحقول والصفحات حسب اختيارك</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                {BTYPE_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => { setBusinessType(opt.id); setCategory(''); }}
                    style={{
                      padding: '18px 12px', borderRadius: 16, textAlign: 'center', cursor: 'pointer',
                      border: `2px solid ${businessType === opt.id ? opt.color : 'var(--border)'}`,
                      background: businessType === opt.id ? `${opt.color}15` : 'rgba(255,255,255,0.04)',
                      transition: 'all .18s', fontFamily: 'inherit',
                    }}>
                    <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>{opt.icon}</span>
                    <p style={{ fontSize: 14, fontWeight: 900, color: businessType === opt.id ? opt.color : 'var(--ink1)', marginBottom: 3 }}>{opt.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--ink3)', lineHeight: 1.4 }}>{opt.sub}</p>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={prev} className="btn btn-ghost" style={{ paddingInline: 14 }}><ChevronRight size={18} /></button>
                <button onClick={next} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  التالي <ChevronLeft size={16} />
                </button>
              </div>
            </div>
          )}

          {/* CATEGORY — Moroccan categories per type */}
          {step === 'category' && (
            <div>
              <div style={{ marginBottom: 22 }}>
                <h2 style={{ fontSize: 21, fontWeight: 900, color: 'var(--ink1)' }}>ما مجال نشاطك؟</h2>
                <p style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 4 }}>اختر الأقرب لنشاطك (اختياري)</p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {cats.map(c => (
                  <button key={c} onClick={() => setCategory(c)}
                    style={{
                      padding: '10px 16px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      border: `1.5px solid ${category === c ? '#FF6A00' : 'var(--border)'}`,
                      background: category === c ? 'rgba(255,106,0,.12)' : 'rgba(255,255,255,0.04)',
                      color: category === c ? '#FF6A00' : 'var(--ink2)', transition: 'all .15s', fontFamily: 'inherit',
                    }}>
                    {c}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={prev} className="btn btn-ghost" style={{ paddingInline: 14 }}><ChevronRight size={18} /></button>
                <button onClick={next} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  التالي <ChevronLeft size={16} />
                </button>
              </div>
            </div>
          )}

          {/* AI — personality + language */}
          {step === 'ai' && (
            <div>
              <div style={{ marginBottom: 22 }}>
                <h2 style={{ fontSize: 21, fontWeight: 900, color: 'var(--ink1)' }}>كيف يتحدث مساعدك الذكي؟</h2>
                <p style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 4 }}>سيرد على زبائنك بهذا الأسلوب</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div>
                  <label className="label">الأسلوب</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {[
                      { val: 'Moroccan Seller', label: '🇲🇦 بائع مغربي', sub: 'دارجة + محلي' },
                      { val: 'Professional', label: '💼 احترافي', sub: 'رسمي وموثوق' },
                      { val: 'Friendly', label: '😊 ودود', sub: 'بسيط وقريب' },
                      { val: 'Luxury', label: '💎 فاخر', sub: 'راقٍ وأنيق' },
                    ].map(opt => (
                      <button key={opt.val} onClick={() => setAi(p => ({ ...p, personality: opt.val }))}
                        style={{
                          padding: '12px 10px', borderRadius: 12, textAlign: 'right',
                          border: `1.5px solid ${ai.personality === opt.val ? 'rgba(255,106,0,.45)' : 'var(--border)'}`,
                          background: ai.personality === opt.val ? 'rgba(255,106,0,.12)' : 'rgba(255,255,255,0.04)',
                          cursor: 'pointer', transition: 'all .18s', fontFamily: 'inherit',
                        }}>
                        <p style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink1)' }}>{opt.label}</p>
                        <p style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>{opt.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">لغة الردود</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[['Darija', '🇲🇦 دارجة'], ['Arabic', '🌙 عربية'], ['French', '🇫🇷 فرنسية']].map(([val, label]) => (
                      <button key={val} onClick={() => setAi(p => ({ ...p, language: val }))}
                        style={{
                          padding: '10px 6px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                          border: `1.5px solid ${ai.language === val ? 'rgba(255,106,0,.4)' : 'var(--border)'}`,
                          background: ai.language === val ? 'rgba(255,106,0,.12)' : 'rgba(255,255,255,0.04)',
                          color: ai.language === val ? '#FF6A00' : 'var(--ink3)',
                          cursor: 'pointer', transition: 'all .18s', fontFamily: 'inherit',
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={prev} className="btn btn-ghost" style={{ paddingInline: 14 }}><ChevronRight size={18} /></button>
                <button onClick={next} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  التالي <ChevronLeft size={16} />
                </button>
              </div>
            </div>
          )}

          {/* DONE */}
          {step === 'done' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 88, height: 88, borderRadius: '50%',
                background: 'linear-gradient(135deg,#FF6A00,#FF8533)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', fontSize: 36,
                boxShadow: '0 0 40px rgba(255,106,0,0.3)',
              }}>🚀</div>
              <h2 style={{ fontSize: 25, fontWeight: 900, color: 'var(--ink1)', marginBottom: 8 }}>كل شيء جاهز!</h2>
              <p style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.8, marginBottom: 22 }}>
                متجر <strong style={{ color: 'var(--ink1)' }}>{brand.name || 'متجرك'}</strong> جاهز. ابدأ بإضافة أول منتج أو خدمة.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22, textAlign: 'right' }}>
                {[
                  `✅ ${BTYPE_OPTIONS.find(o => o.id === businessType)?.title || ''}${category ? ' · ' + category : ''}`,
                  `✅ ${brand.name || 'متجري'}${brand.city ? ' · ' + brand.city : ''}`,
                  `✅ مساعد ذكي: ${ai.language === 'Darija' ? 'دارجة' : ai.language === 'Arabic' ? 'عربية' : 'فرنسية'}`,
                  `💡 اربط واتساب والذكاء الاصطناعي والسحابة لاحقاً من الإعدادات`,
                ].map((item, i) => (
                  <div key={i} className="card card-sm" style={{ padding: '10px 14px', fontSize: 13, color: 'var(--ink2)' }}>{item}</div>
                ))}
              </div>
              <button onClick={finish} className="btn btn-primary btn-xl" style={{ width: '100%', justifyContent: 'center' }}>
                ادخل للوحة التحكم 🎉
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}