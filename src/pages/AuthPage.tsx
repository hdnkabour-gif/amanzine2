import { useState, useEffect } from 'react';
import { useStore } from '../store';
import { Eye, EyeOff, User, Mail, Lock, ArrowLeft } from 'lucide-react';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('script load failed'));
    document.head.appendChild(s);
  });
}

const DS = {
  bg: '#0A0A14',
  emerald: '#0A8F6F',
  emeraldLight: '#12A150',
  emeraldGlow: 'rgba(10,143,111,0.22)',
  orange: '#D4A017',
  orangeLight: '#E8C25A',
  orangeGlow: 'rgba(212,160,23,0.2)',
  text: '#FAFAFA',
  text2: 'rgba(255,255,255,0.55)',
  text3: 'rgba(255,255,255,0.3)',
  border: 'rgba(255,255,255,0.06)',
  borderFocus: 'rgba(10,143,111,0.45)',
  glass: 'rgba(255,255,255,0.03)',
  glassHover: 'rgba(255,255,255,0.06)',
  radius: 16,
  radiusSm: 12,
  radiusFull: 9999,
};

export default function AuthPage() {
  const { login, register } = useStore();
  const [isLogin, setIsLogin]   = useState(true);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [logoErr, setLogoErr]   = useState(false);
  const [form, setForm] = useState({ name:'', email:'', password:'', storeName:'' });
  const [socialCfg, setSocialCfg] = useState<{ googleClientId: string; facebookAppId: string }>({ googleClientId: '', facebookAppId: '' });
  const [googleReady, setGoogleReady] = useState(false);
  const [socialBusy, setSocialBusy] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  // الحاجة القادمة من صفحة الهبوط — تُكمل الرحلة بدل نموذجٍ مقطوعٍ عمّا سبقه.
  const [need] = useState<{ text: string; service?: string; city?: string } | null>(() => {
    try {
      const raw = sessionStorage.getItem('amanzine_need');
      if (!raw) return null;
      const n = JSON.parse(raw);
      if (!n?.text || (Date.now() - (n.at || 0)) > 30 * 60 * 1000) return null;  // تنتهي بعد نصف ساعة
      return n;
    } catch { return null; }
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch('/api/auth/config').then(r => r.json()).then(c =>
      setSocialCfg({ googleClientId: c.googleClientId || '', facebookAppId: c.facebookAppId || '' })
    ).catch(() => {});
  }, []);

  // تحميلُ مكتبة Google **مسبقًا** لا عند النقر. كان `await loadScript(...)`
  // داخل معالِج النقر يفصل الفتح عن نقرة المستخدم، فيعتبره المتصفّح نافذةً
  // تلقائيّة ويحجبها: «Failed to open popup window. Maybe blocked by the
  // browser?». التحميل هنا يجعل النقرة لاحقًا متزامنةً فتمرّ.
  useEffect(() => {
    if (!socialCfg.googleClientId) return;
    let dead = false;
    loadScript('https://accounts.google.com/gsi/client')
      .then(() => {
        if (dead) return;
        const g = (window as any).google;
        if (!g?.accounts?.id) return;
        g.accounts.id.initialize({
          client_id: socialCfg.googleClientId,
          callback: (resp: any) => {
            if (resp?.credential) finishSocial('google', { credential: resp.credential });
            else setSocialBusy(false);
          },
        });
        setGoogleReady(true);
      })
      .catch(() => { /* بلا شبكة/محجوب ⇒ يبقى الزرّ يشرح نفسه عند النقر */ });
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socialCfg.googleClientId]);

  const finishSocial = async (provider: string, payload: Record<string, string>) => {
    try {
      const r = await fetch('/api/auth/social', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, ...payload }),
      });
      const j = await r.json();
      if (j.token) {
        // C-3: الجلسة محمولة في كوكي HttpOnly ضبطه الخادم — لا توكن في localStorage.
        // نخزّن المستخدم فقط (غير سرّي) ليستعيد الإقلاع الجلسة فوراً بعد التحويل.
        localStorage.setItem('ai_commerce_user', JSON.stringify(j.user));
        if (!resumeNeed()) window.location.href = '/home';
      } else {
        setError(j.error || 'فشل تسجيل الدخول');
      }
    } catch { setError('تعذّر الاتصال بالخادم'); }
    setSocialBusy(false);
  };

  const googleLogin = () => {
    if (!socialCfg.googleClientId) { setError('تسجيل الدخول بـ Google يتطلب إعداد GOOGLE_CLIENT_ID في الخادم'); return; }
    const g = (window as any).google;
    if (!googleReady || !g?.accounts?.id) { setError('Google مازال كيتحمّل — عاود بعد ثانية'); return; }
    setError(''); setSocialBusy(true);
    try {
      // بلا await هنا: النقرةُ نفسها هي ما يفتح النافذة.
      // وإن لم تُعرَض (حجبُ نوافذ · عزلُ الكوكيز في فايرفوكس) نقول السبب بدل
      // دوّارةٍ لا تنتهي — الصمت هنا هو ما ضيّع الوقت.
      g.accounts.id.prompt((n: any) => {
        const skipped = n?.isNotDisplayed?.() || n?.isSkippedMoment?.();
        if (!skipped) return;
        const why = n?.getNotDisplayedReason?.() || n?.getSkippedReason?.() || '';
        setSocialBusy(false);
        setError(
          why === 'opt_out_or_no_session' ? 'ما كاين حتّى حساب Google مسجّل فهاد المتصفّح — دخل لـ Google أوّلًا'
            : why === 'suppressed_by_user' ? 'سبق وسدّيتي نافذة Google — حيّد الحجب من إعدادات المتصفّح'
              : 'المتصفّح حجب نافذة Google — سمح بالنوافذ المنبثقة لهاد الموقع وعاود'
        );
      });
    } catch { setError('تعذّر فتح Google'); setSocialBusy(false); }
  };

  const facebookLogin = async () => {
    if (!socialCfg.facebookAppId) { setError('تسجيل الدخول بـ Facebook يتطلب إعداد FACEBOOK_APP_ID في الخادم'); return; }
    setError(''); setSocialBusy(true);
    try {
      await loadScript('https://connect.facebook.net/en_US/sdk.js');
      const FB = (window as any).FB;
      FB.init({ appId: socialCfg.facebookAppId, version: 'v19.0', cookie: true, xfbml: false });
      FB.login((resp: any) => {
        if (resp?.authResponse?.accessToken) finishSocial('facebook', { accessToken: resp.authResponse.accessToken });
        else setSocialBusy(false);
      }, { scope: 'email,public_profile' });
    } catch { setError('تعذّر تحميل Facebook'); setSocialBusy(false); }
  };

  // بعد الدخول: أكمِل الحاجة التي جاء بها بدل صفحةٍ عامّة — الرحلة واحدة.
  const resumeNeed = (): boolean => {
    if (!need?.text) return false;
    try { sessionStorage.removeItem('amanzine_need'); } catch { /* noop */ }
    const city = need.city ? `&city=${encodeURIComponent(need.city)}` : '';
    try { window.location.assign(`/market?q=${encodeURIComponent(need.text)}${city}`); return true; }
    catch { return false; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (isLogin) {
        await login(form.email, form.password);
        if (resumeNeed()) return;
      } else {
        if (!form.name) { setError('الاسم مطلوب'); setLoading(false); return; }
        // لا نسأل عن «متجر» ولا عن دور — الحساب Entity، ونوعه (بائع/زبون/مزوّد)
        // يُستنتَج لاحقًا من أوّل حاجة يكتبها (parseNeed) لا من سؤال عند التسجيل.
        await register(form.name, form.email, form.password);
        if (resumeNeed()) return;
      }
    } catch (err: any) {
      setError(err.message || (isLogin ? 'بيانات الدخول غير صحيحة' : 'حدث خطأ'));
    }
    setLoading(false);
  };

  const inputStyle = (fieldName: string): React.CSSProperties => ({
    width: '100%',
    padding: '14px 44px 14px 16px',
    borderRadius: DS.radiusSm,
    background: focusedField === fieldName ? 'rgba(10,143,111,0.07)' : DS.glass,
    border: focusedField === fieldName ? `1.5px solid ${DS.borderFocus}` : `1px solid ${DS.border}`,
    color: DS.text,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Tajawal, sans-serif',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: focusedField === fieldName ? `0 0 20px ${DS.emeraldGlow}` : 'none',
  });

  return (
    <div dir="rtl" style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative', overflow: 'hidden',
      background: DS.bg,
      fontFamily: 'Tajawal, system-ui, sans-serif',
    }}>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ambientGlow { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      `}</style>

      {/* Ambient Background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <div style={{
          position: 'absolute', top: '-15%', right: '-10%',
          width: '50vw', height: '50vw', maxWidth: 500, maxHeight: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(10,143,111,0.14) 0%, transparent 70%)',
          animation: 'ambientGlow 6s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-5%',
          width: '40vw', height: '40vw', maxWidth: 400, maxHeight: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,160,23,0.08) 0%, transparent 70%)',
          animation: 'ambientGlow 8s ease-in-out infinite 1s',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '60vw', height: '60vw', maxWidth: 600, maxHeight: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(10,143,111,0.05) 0%, transparent 60%)',
        }} />
        {/* Grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.02,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Main Card */}
      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: 420,
        animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}>

        {/* Logo Section */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 88, height: 88, margin: '0 auto 16px', borderRadius: 22, overflow: 'hidden',
            background: 'transparent',
            boxShadow: `0 12px 40px rgba(0,98,51,0.22)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            {/* Ring glow */}
            <div style={{
              position: 'absolute', inset: -3, borderRadius: 25,
              border: '1.5px solid transparent',
              borderTopColor: 'rgba(0,98,51,0.5)',
              borderRightColor: 'rgba(193,39,45,0.4)',
              animation: 'float 4s ease-in-out infinite',
            }} />
            {/* الشعار SVG (2.2KB، حادٌّ على كلّ الشاشات) بدل PNG 235KB الضبابيّ عند
                التكبير. <picture> يُسقط تلقائيًّا إلى PNG لو تعذّر الـSVG، ثمّ للحرف. */}
            {logoErr
              ? <span style={{ fontSize: 40, fontWeight: 900, color: '#006233' }}>A</span>
              : <picture style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <source srcSet="/amanzine-logo.svg" type="image/svg+xml" />
                  <img src="/brand/amanzine-mark-512.png" alt="AMANZINE" width={88} height={88}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative' }}
                    onError={() => setLogoErr(true)}
                  />
                </picture>
            }
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: DS.text, marginBottom: 4, letterSpacing: '-0.02em' }}>
            <span style={{ color: '#1FA565' }}>AMAN<span style={{ color: '#E0524C' }}>Z</span>INE</span>
          </h1>
          <p style={{ color: DS.text3, fontSize: 11, letterSpacing: 'normal', fontWeight: 600 }}>
            كل كلمة عندها طريق
          </p>

          {/* الحاجة محمولةٌ من الهبوط: الصفحة تُكمل الحوار، لا تبدأ من الصفر. */}
          {need && (
            <div style={{
              marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 9,
              padding: '9px 15px', borderRadius: DS.radiusFull,
              background: 'rgba(10,143,111,0.10)', border: `1px solid ${DS.borderFocus}`,
              animation: 'fadeInUp .5s cubic-bezier(.16,1,.3,1) both .15s', maxWidth: '100%',
            }}>
              <span style={{ fontSize: 11.5, color: DS.text2, fontWeight: 700, flexShrink: 0 }}>فهمت أنّك بغيتي</span>
              <span style={{ fontSize: 13, color: DS.emeraldLight, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {need.service || need.text}{need.city ? ` · ${need.city}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Form Card */}
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: `1px solid ${DS.border}`,
          borderRadius: DS.radius * 1.2,
          padding: '28px 24px',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}>

          {/* Tabs */}
          <div style={{
            display: 'flex', background: 'rgba(255,255,255,0.03)',
            borderRadius: DS.radiusSm, padding: 4, marginBottom: 24, gap: 4,
          }}>
            {[['true', 'تسجيل الدخول'], ['false', 'إنشاء حساب']].map(([v, label]) => (
              <button key={v} onClick={() => { setIsLogin(v === 'true'); setError(''); }}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: String(isLogin) === v
                    ? 'linear-gradient(135deg, #0A8F6F, #12A150)'
                    : 'transparent',
                  color: String(isLogin) === v ? '#fff' : DS.text2,
                  boxShadow: String(isLogin) === v
                    ? `0 4px 16px ${DS.emeraldGlow}`
                    : 'none',
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {!isLogin && (
              <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: focusedField === 'name' ? DS.emeraldLight : DS.text3, pointerEvents: 'none', transition: 'color 0.2s' }} />
                <input type="text" placeholder="اسمك" required value={form.name}
                  onChange={e => set('name', e.target.value)}
                  onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField('')}
                  style={inputStyle('name')}
                />
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: focusedField === 'email' ? DS.emeraldLight : DS.text3, pointerEvents: 'none', transition: 'color 0.2s' }} />
              <input type="email" placeholder="البريد الإلكتروني" required value={form.email}
                onChange={e => set('email', e.target.value)}
                onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField('')}
                style={{ ...inputStyle('email'), direction: 'ltr' }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: focusedField === 'password' ? DS.emeraldLight : DS.text3, pointerEvents: 'none', transition: 'color 0.2s' }} />
              <input type={showPwd ? 'text' : 'password'} placeholder="كلمة المرور" required value={form.password}
                onChange={e => set('password', e.target.value)}
                onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField('')}
                style={{ ...inputStyle('password'), paddingLeft: 44, direction: 'ltr' }}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: DS.text3, padding: 0, display: 'flex' }}>
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {isLogin && (
              <div style={{ textAlign: 'left', marginTop: -4 }}>
                <button type="button"
                  onClick={() => {
                    const email = form.email.trim();
                    if (!email) { setError('أدخل بريدك الإلكتروني أولاً'); return; }
                    setError('');
                    fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
                      .then(r => r.json())
                      .then(() => setError('✅ تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني'))
                      .catch(() => setError('✅ إذا كان البريد مسجلاً سيصلك رابط إعادة التعيين'));
                  }}
                  style={{ background: 'none', border: 'none', color: 'rgba(18,161,80,0.85)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', padding: 0, textDecoration: 'underline' }}>
                  نسيت كلمة المرور؟
                </button>
              </div>
            )}

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 10, padding: '11px 16px', fontSize: 13,
                color: '#EF4444', textAlign: 'center', fontWeight: 500,
                animation: 'fadeInUp 0.3s ease',
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '15px', borderRadius: DS.radiusSm,
                background: loading ? 'rgba(10,143,111,0.45)' : 'linear-gradient(135deg, #0A8F6F, #12A150)',
                border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8,
                boxShadow: loading ? 'none' : `0 8px 28px ${DS.emeraldGlow}`,
                transition: 'all 0.25s',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  جارٍ...
                </span>
              ) : isLogin ? (
                <>🔑 دخول</>
              ) : (
                <>🚀 إنشاء الحساب</>
              )}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0 4px' }}>
              <div style={{ flex: 1, height: 1, background: DS.border }} />
              <span style={{ fontSize: 11, color: DS.text3, fontWeight: 500 }}>أو</span>
              <div style={{ flex: 1, height: 1, background: DS.border }} />
            </div>

            {/* Social Login */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={googleLogin} disabled={socialBusy}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px', borderRadius: DS.radiusSm,
                  background: '#fff', border: 'none', color: '#3c4043',
                  fontSize: 13, fontWeight: 700,
                  cursor: socialBusy ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  opacity: socialBusy ? 0.6 : 1,
                }}>
                <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.6 2.4 30.2 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.9 6.1C12.3 13.2 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-4 6.8-9.9 6.8-17.4z"/><path fill="#FBBC05" d="M10.4 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.5-2 15.3-5.5l-7.3-5.7c-2 1.4-4.7 2.3-8 2.3-6.3 0-11.7-3.7-13.6-9.4l-7.9 6.1C6.4 42.6 14.6 48 24 48z"/></svg>
                Google
              </button>
              <button type="button" onClick={facebookLogin} disabled={socialBusy}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px', borderRadius: DS.radiusSm,
                  background: '#1877f2', border: 'none', color: '#fff',
                  fontSize: 13, fontWeight: 700,
                  cursor: socialBusy ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  opacity: socialBusy ? 0.6 : 1,
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>
                Facebook
              </button>
            </div>

            {/* Demo + Home */}
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button type="button"
                onClick={() => { localStorage.setItem('ai_commerce_token', 'demo-token-local'); window.location.href = '/home'; }}
                style={{
                  flex: 1, padding: '11px', borderRadius: DS.radiusSm,
                  background: 'rgba(255,122,0,0.06)', border: '1px solid rgba(255,122,0,0.15)',
                  color: '#E8C25A', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                  fontFamily: 'inherit', transition: 'all 0.2s',
                }}>
                👨‍💼 تاجر Demo
              </button>
              <a href="/"
                style={{
                  flex: 1, padding: '11px', borderRadius: DS.radiusSm,
                  background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
                  color: '#10B981', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                  textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'inherit',
                }}>
                🛍️ للزبائن
              </a>
            </div>
          </form>

          {/* Back to home */}
          <a href="/"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              marginTop: 18, color: DS.text3, fontSize: 12, textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = DS.emeraldLight)}
            onMouseLeave={e => (e.currentTarget.style.color = DS.text3)}>
            <ArrowLeft size={13} /> الصففحة الرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}