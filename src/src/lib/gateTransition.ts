// ============================================================
// gateTransition — «البوّابة الحيّة». عند كلّ توجيه من نيّة («بغيت بيع/شراء/طلب…»)
// تنفتح بوّابةٌ ذهبيّة لوهلة ثمّ تأخذ المستخدم لوجهته. استعارة أمانزين نفسها.
// مساعد DOM صرف (بلا React state) ليُستدعى من أيّ مكان بأمان.
// سريع (~800ms)، يحترم تقليل الحركة، لا يحبس المستخدم أبدًا (يُنفّذ الوجهة دائمًا).
// ============================================================

let busy = false;

function reduced(): boolean {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

// يُشغّل مشهد فتح البوّابة، وينفّذ الوجهة (onMid) عند اكتمال الفتح.
export function playGate(onMid: () => void): void {
  // تقليل الحركة أو استدعاء متزامن ثانٍ: نفّذ الوجهة فورًا بلا مشهد.
  if (busy || reduced() || typeof document === 'undefined') { onMid(); return; }
  busy = true;

  const root = document.createElement('div');
  root.setAttribute('data-amz-gate', '1');
  root.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:99998', 'overflow:hidden',
    'pointer-events:none', 'opacity:1', 'transition:opacity .28s ease .5s',
  ].join(';');

  const doorCss = (side: 'left' | 'right') => [
    'position:absolute', 'top:0', 'bottom:0', `${side}:0`, 'width:50.6%',
    'background:linear-gradient(' + (side === 'left' ? '105deg' : '255deg') + ',#0a4327,#0c5735 60%,#0a4327)',
    'box-shadow:inset ' + (side === 'left' ? '-2px' : '2px') + ' 0 0 #d4af37, 0 0 60px rgba(0,0,0,.5)',
    'transform:translateX(0)', 'transition:transform .62s cubic-bezier(.7,0,.2,1)',
    'will-change:transform',
  ].join(';');

  const left = document.createElement('div'); left.style.cssText = doorCss('left');
  const right = document.createElement('div'); right.style.cssText = doorCss('right');
  // وهج ذهبيّ يظهر من شقّ البوّابة
  const glow = document.createElement('div');
  glow.style.cssText = [
    'position:absolute', 'inset:0',
    'background:radial-gradient(closest-side at 50% 50%, rgba(255,214,120,.9), rgba(255,214,120,.15) 40%, transparent 70%)',
    'opacity:0', 'transition:opacity .4s ease',
  ].join(';');

  root.appendChild(glow); root.appendChild(left); root.appendChild(right);
  document.body.appendChild(root);

  // إطار واحد ثمّ نبدأ الفتح (لضمان انتقال CSS).
  requestAnimationFrame(() => {
    glow.style.opacity = '1';
    left.style.transform = 'translateX(-101%)';
    right.style.transform = 'translateX(101%)';
  });

  let done = false;
  const finish = () => {
    if (done) return; done = true;
    root.style.opacity = '0';
    window.setTimeout(() => { root.remove(); busy = false; }, 850);
  };

  // عند اكتمال الفتح ننفّذ الوجهة (تظهر الصفحة الجديدة خلف البوّابة المفتوحة).
  window.setTimeout(() => { try { onMid(); } finally { finish(); } }, 430);
  // حدّ أقصى صارم: مهما حدث نظّف نفسك.
  window.setTimeout(finish, 1600);
}
