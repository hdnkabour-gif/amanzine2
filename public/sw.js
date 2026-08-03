// ============================================================
// Service Worker — AMANZINE
//
//   **العطبُ الذي وُلد منه هذا الملفُّ بشكله الحاليّ:** كانت الاستراتيجيّةُ
//   «الذاكرةُ أوّلًا» لكلِّ شيءٍ من نطاقنا — بما فيه `index.html`. وهو الملفُّ
//   الوحيد الذي **يُشير إلى حِزَم JS ذاتِ البصمات**. فمن زار الموقعَ مرّةً
//   بقي محبوسًا في تلك النسخة إلى الأبد: كلُّ نشرٍ جديدٍ لا يصله، لأنّ
//   المتصفّحَ لا يرى `index.html` جديدًا فلا يعرف أنّ هناك حِزَمًا جديدة.
//   («التصفّحُ الخاصّ» يعرض الحقيقةَ لأنّه بلا عاملِ خدمةٍ أصلًا.)
//
//   القاعدةُ الصحيحة — وهي فرقٌ في **نوع الملفّ** لا في التفضيل:
//   • صفحاتُ التنقّل (`index.html`): **الشبكةُ أوّلًا**. لا يجوز أن تَقدُم،
//     لأنّها الفهرسُ. الذاكرةُ ملاذُها عند انقطاع الشبكة فقط.
//   • الأصولُ ذاتُ البصمة (`/assets/x-a1b2c3.js`): **الذاكرةُ أوّلًا** — صحيحٌ
//     تمامًا، لأنّ الاسمَ يتغيّر مع المحتوى فلا تكون النسخةُ المخزّنة خاطئةً أبدًا.
//
//   واسمُ الذاكرة يحمل رقمًا: تغييرُه يمسح القديمَ عند التفعيل.
// ============================================================
const CACHE = 'amanzine-v2';
const OFFLINE = ['/'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(OFFLINE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return; // Don't cache API calls

  // نتدخّل في نطاقنا فقط. كان العامل يعترض طلبات النطاقات الأخرى أيضًا
  // (fonts.gstatic.com · accounts.google.com)، فيكسر CORS ويمنع تحميل الخطّ
  // العربيّ. المتصفّح يعرف كيف يجلبها — يكفي ألّا نقف في طريقها.
  let sameOrigin = false;
  try { sameOrigin = new URL(e.request.url).origin === self.location.origin; } catch { sameOrigin = false; }
  if (!sameOrigin) return;

  // ① صفحةُ تنقّل ⇒ الشبكةُ أوّلًا. الفهرسُ لا يُخزَّن قبل أن يُطلَب.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put('/', clone)).catch(() => {});
        }
        return res;
      }).catch(async () => {
        const shell = await caches.match('/');
        return shell || new Response('', { status: 504, statusText: 'Offline' });
      })
    );
    return;
  }

  // ② الباقي ⇒ الذاكرةُ أوّلًا. الأصولُ ذاتُ البصمة لا تتغيّر تحت اسمها.
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      // كان هنا `.catch(() => cached)` و`cached` قد يكون undefined، فيصل إلى
      // respondWith وعدٌ يُحلّ إلى undefined — ويُسقط الطلب بدل أن يمرّره.
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
        }
        return res;
      }).catch(() => new Response('', { status: 504, statusText: 'Offline' }));
    })
  );
});

// Push notifications
self.addEventListener('push', e => {
  if (!e.data) return;
  let data;
  try { data = e.data.json(); }
  catch { data = { title: 'AI Commerce OS', body: e.data.text() }; }
  e.waitUntil(
    self.registration.showNotification(data.title || 'AI Commerce OS', {
      body: data.body || '',
      icon: '/amanzine-logo.svg',
      badge: '/amanzine-logo.svg',
      tag: data.tag || 'default',
      data: data.url || '/',
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const rawUrl = e.notification.data;
  let safeUrl = '/';
  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl, self.location.origin);
      if (parsed.origin === self.location.origin) {
        safeUrl = parsed.pathname + parsed.search + parsed.hash;
      }
    } catch {}
  }
  e.waitUntil(clients.openWindow(safeUrl));
});
