// Service Worker — AI Commerce OS
const CACHE = 'ai-commerce-v1';
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

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      // كان هنا `.catch(() => cached)` و`cached` قد يكون undefined، فيصل إلى
      // respondWith وعدٌ يُحلّ إلى undefined — وهو نصُّ الخطأ الذي ظهر في
      // الكونسول، ويُسقط الطلب بدل أن يمرّره. الآن: استجابةٌ دائمًا.
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
        }
        return res;
      }).catch(async () => {
        // شبكةٌ مقطوعة: صفحةُ تنقّلٍ ⇒ الجذر المخزَّن؛ وإلّا خطأٌ صريح
        // (لا undefined) حتّى يعرف المتصفّح أنّ الطلب فشل فعلًا.
        if (e.request.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        return new Response('', { status: 504, statusText: 'Offline' });
      });
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
