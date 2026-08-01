// ================================================================
// API Client — يتصل بالـ backend عند توفره، وإلا يعمل offline
// ================================================================

const BASE_URL = (() => {
  if (typeof window !== 'undefined') {
    // Auto-detect: same origin or localhost:3001
    if (window.location.port === '5173' || window.location.port === '4173') {
      return 'http://localhost:3001/api';
    }
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:3001/api';
})();

// C-3: التوكنات الحقيقية لم تعد تُخزَّن في localStorage (حماية من XSS).
// المصادر: ذاكرة الجلسة (هذا التبويب) + كوكي HttpOnly (يستعيد الجلسة بعد التحديث).
// الاستثناء الوحيد: رمز الديمو الثابت — ليس سراً ويُبقي تجربة الديمو تعمل بلا خادم.
const DEMO_TOKEN = 'demo-token-local';

let _token: string | null = null;
let _refreshToken: string | null = null;
let _isOnline = false;
let _refreshing = false;

// هجرة لمرة واحدة: توكن قديم في localStorage يُحمَّل للذاكرة ثم يُحذف من التخزين
// (الجلسات الحديثة تحمل كوكي HttpOnly أصلاً، فلا يفقد أحد جلسته فجأة)
try {
  const legacy = localStorage.getItem('ai_commerce_token');
  if (legacy) { _token = legacy; if (legacy !== DEMO_TOKEN) localStorage.removeItem('ai_commerce_token'); }
} catch {}
try {
  const legacyR = localStorage.getItem('ai_commerce_refresh');
  if (legacyR) { _refreshToken = legacyR; localStorage.removeItem('ai_commerce_refresh'); }
} catch {}

export function getToken()  { return _token; }
export function isOnline()  { return _isOnline; }

export function setToken(t: string | null) {
  _token = t;
  try {
    if (t === DEMO_TOKEN) localStorage.setItem('ai_commerce_token', t);
    else localStorage.removeItem('ai_commerce_token');
  } catch {}
}

export function setRefreshToken(t: string | null) {
  _refreshToken = t;
  try { localStorage.removeItem('ai_commerce_refresh'); } catch {}
}

// ── Health check ──────────────────────────────────────────────
export const healthCheck = () => checkBackend();
export async function checkBackend(): Promise<boolean> {
  try {
    const r = await fetch(`${BASE_URL}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    _isOnline = r.ok;
  } catch {
    _isOnline = false;
  }
  return _isOnline;
}

// ── Raw fetch helper ─────────────────────────────────────────
async function _doFetch(method: string, path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  return fetch(`${BASE_URL}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined,
    // C-3: إرسال كوكي HttpOnly كمصادقة دفاعية (تمهيداً للتخلي عن localStorage)
    credentials: 'include',
    signal: AbortSignal.timeout(10000),
  });
}

// ── Refresh access token ──────────────────────────────────────
// C-3: المسار الأساسي هو كوكي HttpOnly `refreshToken` (يُرسل تلقائياً عبر
// credentials:'include')؛ توكن الذاكرة يُرسل في الجسم إن وُجد (توافق رجعي).
async function _tryRefresh(): Promise<boolean> {
  if (_refreshing || _token === 'demo-token-local') return false;
  _refreshing = true;
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(_refreshToken ? { refreshToken: _refreshToken } : {}),
      credentials: 'include',
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) { setRefreshToken(null); return false; }
    const data = await res.json();
    setToken(data.token);
    setRefreshToken(data.refreshToken);
    return true;
  } catch { return false; }
  finally { _refreshing = false; }
}

// ── Generic request ───────────────────────────────────────────
async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  // C-3: /auth/me يُسمح له بمحاولة refresh (استعادة جلسة الكوكي بعد انتهاء
  // توكن الوصول) لكن فشله لا يعيد التوجيه — الزائر غير المسجّل يبقى مكانه.
  const isMeRoute   = path === '/auth/me';
  const isAuthRoute = path.startsWith('/auth/') && !isMeRoute;
  let res = await _doFetch(method, path, body);

  if (res.status === 401 && !isAuthRoute && _token !== 'demo-token-local') {
    const refreshed = await _tryRefresh();
    if (refreshed) {
      res = await _doFetch(method, path, body);
    } else if (!isMeRoute) {
      try { localStorage.removeItem('ai_commerce_token'); localStorage.removeItem('ai_commerce_refresh'); } catch {}
      window.location.href = '/login';
      throw new Error('Session expired — please log in again');
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as T;
}

// ── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  register: (data: { name: string; email: string; password: string; storeName?: string }) =>
    request<{ token: string; refreshToken: string; user: any }>('POST', '/auth/register', data),

  login: (data: { email: string; password: string }) =>
    request<{ token: string; refreshToken: string; user: any }>('POST', '/auth/login', data),

  me: () => request<{ user: any }>('GET', '/auth/me'),

  logout: (refreshToken?: string) =>
    request<{ ok: boolean }>('POST', '/auth/logout', { refreshToken: refreshToken || _refreshToken }),

  refresh: () => _tryRefresh(),

  changePassword: (data: { current: string; next: string }) =>
    request<{ success: boolean }>('POST', '/auth/change-password', data),

  forgotPassword: (email: string) =>
    request<{ sent: boolean; email?: string }>('POST', '/auth/forgot-password', { email }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    request<{ success: boolean; message: string }>('POST', '/auth/reset-password', { email, code, newPassword }),
};

// ── Products ──────────────────────────────────────────────────
// data may include: offer_type, duration, service_area alongside standard fields
export const productsAPI = {
  list:   ()              => request<any[]>('GET', '/products'),
  create: (data: any)     => request<any>('POST', '/products', data),
  update: (id: string, d: any) => request<any>('PUT', `/products/${id}`, d),
  remove: (id: string)    => request<any>('DELETE', `/products/${id}`),
};

// ── Orders ────────────────────────────────────────────────────
export const ordersAPI = {
  list:    ()            => request<any[]>('GET', '/orders'),
  create:  (data: any)   => request<any>('POST', '/orders', data),
  approve: (id: string)  => request<any>('PUT', `/orders/${id}/approve`),
  reject:  (id: string)  => request<any>('PUT', `/orders/${id}/reject`),
  ship:    (id: string, data?: any) => request<any>('PUT', `/orders/${id}/ship`, data),
  deliver: (id: string)  => request<any>('PUT', `/orders/${id}/deliver`),
  update:  (id: string, d: any) => request<any>('PUT', `/orders/${id}`, d),
};

// ── Customers ─────────────────────────────────────────────────
export interface CustomerPage {
  data:    any[];
  total:   number;
  limit:   number;
  offset:  number;
  hasMore: boolean;
}
export const customersAPI = {
  list: (params?: { limit?: number; offset?: number; q?: string }) => {
    const qs = new URLSearchParams();
    if (params?.limit  != null) qs.set('limit',  String(params.limit));
    if (params?.offset != null) qs.set('offset', String(params.offset));
    if (params?.q)               qs.set('q',      params.q);
    const query = qs.toString();
    return request<CustomerPage>('GET', `/customers${query ? '?' + query : ''}`);
  },
  create: (data: any)    => request<any>('POST', '/customers', data),
  update: (id: string, d: any) => request<any>('PUT', `/customers/${id}`, d),
  remove: (id: string)   => request<any>('DELETE', `/customers/${id}`),
};

// ── Conversations ─────────────────────────────────────────────
export const conversationsAPI = {
  list:         ()              => request<any[]>('GET', '/conversations'),
  create:       (data: any)     => request<any>('POST', '/conversations', data),
  update:       (id: string, d: any) => request<any>('PUT', `/conversations/${id}`, d),
  remove:       (id: string)    => request<any>('DELETE', `/conversations/${id}`),
  sendMessage:  (id: string, d: any) => request<any>('POST', `/conversations/${id}/messages`, d),
};

// ── Coupons ───────────────────────────────────────────────────
export const couponsAPI = {
  list:     ()              => request<any[]>('GET', '/coupons'),
  create:   (data: any)     => request<any>('POST', '/coupons', data),
  update:   (id: string, d: any) => request<any>('PUT', `/coupons/${id}`, d),
  remove:   (id: string)    => request<any>('DELETE', `/coupons/${id}`),
  validate: (code: string, userId: string, total: number) =>
    request<{ valid: boolean; discount: number; message?: string; couponId?: string }>(
      'GET', `/coupons/validate?code=${encodeURIComponent(code)}&userId=${userId}&total=${total}`
    ),
};

// ── Settings ──────────────────────────────────────────────────
export const settingsAPI = {
  get:           ()       => request<any>('GET', '/settings'),
  save:          (d: any) => request<any>('PUT', '/settings', d),
  getLogs:       ()       => request<any[]>('GET', '/settings/logs'),
  getNotifs:     ()       => request<any[]>('GET', '/settings/notifications'),
  markRead:      ()       => request<any>('POST', '/settings/notifications/read'),
  clearNotifs:   ()       => request<any>('DELETE', '/settings/notifications'),
  getTemplates:  ()       => request<any[]>('GET', '/settings/templates'),
  saveTemplates: (t: any) => request<any>('PUT', '/settings/templates', t),
};

// ── Analytics ─────────────────────────────────────────────────
export const analyticsAPI = {
  get:    () => request<any>('GET', '/analytics'),
  funnel: () => request<any>('GET', '/analytics/funnel'),
  store:  (days = 30) => request<any>('GET', `/analytics/store?days=${days}`),
};

// ── Broadcast ─────────────────────────────────────────────────
export const broadcastAPI = {
  send:    (data: any) => request<any>('POST', '/broadcast', data),
  history: ()          => request<any[]>('GET', '/broadcast/history'),
};

// ── Media ─────────────────────────────────────────────────────
export const mediaAPI = {
  uploadBase64: (data: string, ext = 'jpg') =>
    request<{ url: string; filename: string }>('POST', '/media/upload-base64', { data, ext }),
};

// ── Delivery ──────────────────────────────────────────────────
export const deliveryAPI = {
  list:     ()           => request<any[]>('GET', '/delivery'),
  save:     (data: any)  => request<any>('POST', '/delivery', data),
  remove:   (id: string) => request<any>('DELETE', `/delivery/${id}`),
  simulate: (orderId: string) => request<any>('POST', `/delivery/simulate/${orderId}`),
  // `data.provider` (اسمٌ أو api_type) أو `data.providerId` — الخادم يحترمه الآن
  // بعد أن كان يفرض Livo بالقوّة ويتجاهل الجسمَ كلّه.
  create:   (orderId: string, data?: any) => request<any>('POST', `/delivery/create/${orderId}`, data),
  // مدنُ المزوّد المفعّل الذي يُعلن cities:'api' — مُطبَّعةً إلى {id,name}
  cities:   () => request<{ success: boolean; provider: string; cities: { id: string; name: string }[] }>('GET', '/delivery/cities'),
  // عروضُ سعرٍ موحَّدة من كلّ مزوّدٍ مفعّل (DeliveryQuote)
  quote:    (city: string, total?: number) =>
    request<{ success: boolean; city: string; quotes: any[] }>('GET', `/delivery/quote?city=${encodeURIComponent(city)}${total != null ? `&total=${total}` : ''}`),
  // المزوّدون المتاحون وقدراتُهم — تبني الواجهةُ نفسَها منها لا من أسماء الشركات
  registry: () => request<{ providers: any[]; rejected: any[] }>('GET', '/delivery/registry'),
  track:    (orderId: string) => request<{ success: boolean; status: string; history: any[]; trackingNumber: string }>('POST', `/delivery/track/${orderId}`),
};

// ── AI chat via backend ───────────────────────────────────────
export const aiAPI = {
  reply: (data: {
    message: string;
    history: any[];
    products: any[];
    settings: any;
  }) => request<{ reply: string; model: string }>('POST', '/ai/reply', data),

  extractOrder: (history: any[]) =>
    request<{ phone?: string; city?: string; name?: string; size?: string; color?: string }>(
      'POST', '/ai/extract-order', { history }
    ),
};

// ── Loyalty ──────────────────────────────────────────────────
export const loyaltyAPI = {
  get: (customerId: string) => request<any>('GET', `/loyalty/${customerId}`),
  add: (data: { customerId: string; amount: number }) => request<any>('POST', '/loyalty/add', data),
};

// ── Services Marketplace (alloservix) ─────────────────────────
export interface Provider {
  id: string; userId?: string; name: string; bio?: string; phone?: string; city?: string;
  avatarUrl?: string; latitude?: number | null; longitude?: number | null;
  status?: 'pending' | 'approved' | 'rejected' | 'suspended'; isVerified?: boolean;
  ratingAvg?: number; ratingCount?: number; adminNote?: string;
  services?: ProviderService[]; availability?: AvailabilityTemplate[];
}
export interface ProviderService {
  id?: string; providerId?: string; serviceKey: string; serviceLabel: string;
  skillLevel?: 'beginner' | 'intermediate' | 'expert'; priceMin?: number; priceMax?: number;
  durationMin?: number; description?: string;
}
export interface AvailabilityTemplate { id?: string; weekday: number; startTime: string; endTime: string; }
export interface Booking {
  id: string; providerId: string; serviceId?: string | null; customerName: string; customerPhone: string;
  scheduledAt: string; durationMin?: number; status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price?: number; notes?: string; createdAt?: string;
}

export interface FieldVisitInput {
  shop: { name: string; phone: string; email?: string; city?: string; bio?: string; latitude?: number; longitude?: number };
  servicesRaw?: string;
  concepts?: { conceptId: string; isPrimary?: boolean }[];
  customerLines?: string[];
  pricingAsks?: string[];
  words?: { term: string; conceptId: string }[];
  notes?: string;
  // الزيارةُ كيانٌ يُعاد ويُقارَن: الإحداثيّاتُ والمدّةُ تجعلها قابلةً للمراجعة.
  gpsLat?: number; gpsLng?: number; durationSec?: number;
}
export interface FieldVisitResult {
  provider: { id: string; name: string; status?: 'verified' | 'vouched'; vouchedBy?: string | null };
  loginCode: string | null;      // يُعرَض مرّةً واحدة. null ⇒ للحساب مالكٌ من قبل
  email: string;
  learned: { concepts: number; words: number; needsReview: number; customerLines: number; pricingAsks: number };
  words: { term: string; conceptId: string; status: string; reason?: string }[];
  visitId: string;
}
export interface ProviderVerification {
  kind: 'business' | 'identity' | 'location' | 'phone';
  verified_by: string | null; verified_at: string; note: string | null;
}
export interface FieldHarvest { visits: number; lines: number; asks: number; words: number; links: number }
export interface MyVouches {
  canVouch: boolean; reason?: string;
  me?: { id: string; name: string; verified: boolean; depth: number };
  quota?: number; used?: number; left?: number;
  vouched: { id: string; name: string; city: string; is_verified: boolean; depth: number; created_at: string }[];
}

export const providersAPI = {
  list:   (params?: { status?: string; q?: string }) => {
    const qs = new URLSearchParams(); if (params?.status) qs.set('status', params.status); if (params?.q) qs.set('q', params.q);
    return request<Provider[]>('GET', `/providers${qs.toString() ? '?' + qs : ''}`);
  },
  get:    (id: string)          => request<Provider>('GET', `/providers/${id}`),
  create: (data: Partial<Provider>) => request<Provider>('POST', '/providers', data),
  update: (id: string, d: Partial<Provider>) => request<Provider>('PUT', `/providers/${id}`, d),
  setStatus: (id: string, status: string, adminNote?: string) =>
    request<Provider>('PUT', `/providers/${id}/status`, { status, adminNote }),
  remove: (id: string)          => request<{ ok: boolean }>('DELETE', `/providers/${id}`),
  addService:    (id: string, s: ProviderService) => request<{ id: string }>('POST', `/providers/${id}/services`, s),
  removeService: (id: string, sid: string)        => request<{ ok: boolean }>('DELETE', `/providers/${id}/services/${sid}`),
  setAvailability: (id: string, templates: AvailabilityTemplate[]) =>
    request<{ ok: boolean }>('PUT', `/providers/${id}/availability`, { templates }),
  // Public storefront discovery — approved providers of a store
  discover: (storeUserId: string, q?: string) =>
    request<Provider[]>('GET', `/providers/public/${storeUserId}${q ? '?q=' + encodeURIComponent(q) : ''}`),

  // ── الجسر: مزوّدٌ ⇄ مفهوم ──
  // المحرّك كان يفهم «بغيت نشري ورد» ثمّ يقف: يفهم ولا يصل إلى إنسان.
  // متعدّدٌ لا واحد — المخبزةُ تبيع خبزًا وقهوةً وحلويّات.
  setConcepts: (id: string, concepts: { conceptId: string; isPrimary?: boolean }[]) =>
    request<{ concepts: { concept_id: string; is_primary: boolean }[] }>('PUT', `/providers/${id}/concepts`, { concepts }),
  // ── الزيارة الميدانيّة ──
  // عمليّةٌ واحدة: حساب + محلّ + روابط + كلمات + أسئلة تسعير. والردّ يحمل
  // `learned` — فلا تقول الشاشةُ «تعلَّمنا» إلّا بما تعلَّمه الخادمُ فعلًا،
  // و`needsReview` تُعلن ما رُدّ بسبب تعارضٍ بدل أن يُبتلَع صامتًا.
  fieldVisit: (v: FieldVisitInput) => request<FieldVisitResult>('POST', '/providers/field-visit', v),
  fieldVisits: () => request<{ harvest: FieldHarvest; visits: any[] }>('GET', '/providers/field-visits'),
  // «شكون سجّلت؟» — المزكِّي يرى سلسلته وحصّته. التزكيةُ اسمٌ يتحمّل.
  myVouches: () => request<MyVouches>('GET', '/providers/my-vouches'),
  // التحقّقُ **وقائعُ** لا صفةٌ واحدة: business | identity | location | phone.
  verify: (id: string, kind: string, opts?: { note?: string; remove?: boolean }) =>
    request<{ verifications: ProviderVerification[] }>('POST', `/providers/${id}/verify`, { kind, ...opts }),
  visits: (id: string) => request<{ visits: any[]; verifications: ProviderVerification[] }>('GET', `/providers/${id}/visits`),

  // عامّ: «شكون كيبيع الورد فالدار البيضاء؟» — البحثُ يخصّ الناس لا الأدمن.
  byConcept: (conceptId: string, opts?: { city?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (opts?.city) qs.set('city', opts.city);
    if (opts?.limit) qs.set('limit', String(opts.limit));
    return request<{ providers: Provider[] }>('GET',
      `/providers/by-concept/${encodeURIComponent(conceptId)}${qs.toString() ? '?' + qs : ''}`);
  },
};

export const bookingsAPI = {
  list:   (params?: { providerId?: string; status?: string }) => {
    const qs = new URLSearchParams(); if (params?.providerId) qs.set('providerId', params.providerId); if (params?.status) qs.set('status', params.status);
    return request<Booking[]>('GET', `/bookings${qs.toString() ? '?' + qs : ''}`);
  },
  create:    (data: Partial<Booking>) => request<Booking>('POST', '/bookings', data),
  setStatus: (id: string, status: string) => request<Booking>('PUT', `/bookings/${id}/status`, { status }),
  // Public booking from storefront
  book: (data: { userId: string } & Partial<Booking>) =>
    request<{ id: string; status: string; statusAr: string; scheduledAt: string }>('POST', '/bookings/public', data),
};

// ── Universal Business Engine — API Contract ──────────────────
// العقد الوحيد الذي تعتمد عليه كل الواجهة (Profile / Discover / Search / Map / AI).
// عند الهجرة لاحقاً إلى جدول `businesses` لن تتغيّر مكوّنات React — العقد ثابت.
export type Capability = 'products' | 'services' | 'booking' | 'delivery' | 'offers' | 'chat' | 'appointments' | 'marketplace';
export type BusinessSource = 'store' | 'provider' | 'listing';

export interface Business {
  source: BusinessSource; id: string; type: string; ownerId: string;
  name: string; description: string; city: string;
  location: { lat: number; lng: number } | null;
  image: string; gallery: string[];
  verified: boolean; rating: { avg: number; count: number };
  contact: { phone: string; whatsapp: string };
  categories: string[];
  capabilities: Record<Capability, boolean>;
  status: { code: string; label: string; color: string } | null;       // Live Status
  availability: { code: string; label: string } | null;                 // Smart Availability
  href: string;
  productCount?: number; price?: number; distanceKm?: number;
}
export interface BusinessProfileData {
  business: Business;
  sections: string[]; // أقسام مرتّبة يقرّرها الخادم حسب القدرات
  data: {
    products?: { id: string; name: string; price: number; imageUrl: string; emoji: string; type: string }[];
    providers?: Business[];
    services?: ProviderService[];
    availability?: AvailabilityTemplate[];
    openingHours?: { start: string; end: string };
    price?: number; images?: string[];
  };
}

export interface SearchFilters {
  city?: string; q?: string; type?: 'store' | 'service'; category?: string;
  verified?: boolean; ratingMin?: number; delivery?: boolean; booking?: boolean;
  offers?: boolean; openNow?: boolean; availableToday?: boolean; priceMin?: number; priceMax?: number;
  lat?: number; lng?: number; radiusKm?: number; view?: 'list' | 'map'; limit?: number;
}
export interface SearchResult {
  intent: { kind: string; nearby: boolean; cleaned: string; matched: string[] };
  filters: Record<string, any>;
  weights: Record<string, number>;
  businesses: Business[];
  products: any[];
  markers?: { id: string; source: string; name: string; lat: number; lng: number; type: string; verified: boolean; rating: number; href: string; distanceKm?: number }[];
  viewport?: { center: { lat: number; lng: number } | null; radiusKm: number; count: number };
}

export const businessAPI = {
  // المحرّك الموحّد الوحيد: Discover = search بلا q · Map = view:'map'
  search: (params: SearchFilters = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '' || v === false) continue;
      qs.set(k, String(v));
    }
    return request<SearchResult>('GET', `/search?${qs}`);
  },
  searchNearby: (params: { lat: number; lng: number; radiusKm?: number; city?: string; q?: string; type?: 'store' | 'service' }) => {
    const qs = new URLSearchParams();
    qs.set('lat', String(params.lat)); qs.set('lng', String(params.lng));
    if (params.radiusKm) qs.set('radiusKm', String(params.radiusKm));
    if (params.city) qs.set('city', params.city);
    if (params.q) qs.set('q', params.q);
    if (params.type) qs.set('type', params.type);
    return request<{ businesses: Business[] }>('GET', `/business/nearby?${qs}`);
  },
  getProfile: (source: BusinessSource, id: string) =>
    request<BusinessProfileData>('GET', `/business/${source}/${id}`),
  find: (params: { city?: string; q?: string; type?: 'store' | 'service' } = {}) =>
    businessAPI.search(params), // مرادف تعتمد عليه طبقة الـ AI لاحقاً
};

// Recommendation Engine
export const recommendAPI = {
  forBusiness: (source: BusinessSource, id: string) =>
    request<{ businesses: Business[]; edges?: any }>('GET', `/recommend?source=${source}&id=${encodeURIComponent(id)}`),
  forQuery: (q: string, city?: string) =>
    request<{ basedOn?: any[]; businesses: Business[] }>('GET', `/recommend?q=${encodeURIComponent(q)}${city ? '&city=' + encodeURIComponent(city) : ''}`),
};

// Tracking — أحداث view/click (fire-and-forget، لا تعطّل الواجهة أبداً)
export const trackAPI = {
  event: (data: { kind: 'business' | 'product' | 'service'; action: 'viewed' | 'clicked' | 'contact'; businessId?: string; name?: string; productId?: string; serviceId?: string; source?: string; city?: string }) => {
    try {
      fetch(`${BASE_URL}/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), keepalive: true }).catch(() => {});
    } catch {}
  },
  // تجربة نيّة → الخادم (توحيد العقلين): يُرسل الطلب/النتيجة/الرضا ليتعلّم الخادم.
  need: (action: 'searched' | 'resolved' | 'satisfied' | 'unsatisfied', data: { raw?: string; intent?: string; city?: string }) => {
    try {
      fetch(`${BASE_URL}/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ kind: 'need', action, name: (data.raw || '').slice(0, 120), source: data.intent, city: data.city }) }).catch(() => {});
    } catch {}
  },
};

// المحرّك الموحّد على الخادم (/api/search) — يفهم النيّة، يبحث، ويُسجّل
// الاستعلام/الـ miss (Experience Graph: المعرفة التي تبني نفسها). يُستدعى من
// تدفّق «شنو محتاج اليوم؟» فيتعلّم الخادم من كل طلب حقيقيّ عبر كل المستخدمين.
export const searchAPI = {
  query: (q: string, opts?: { city?: string; type?: string; lat?: number; lng?: number; limit?: number }) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (opts?.city) p.set('city', opts.city);
    if (opts?.type) p.set('type', opts.type);
    if (opts?.lat != null) p.set('lat', String(opts.lat));
    if (opts?.lng != null) p.set('lng', String(opts.lng));
    if (opts?.limit) p.set('limit', String(opts.limit));
    return request<any>('GET', `/search?${p.toString()}`);
  },
};

// AI Engine — بحث بلغة طبيعية → نيّة + نتائج
export interface AskUnderstood { category?: string | null; city?: string | null; availableToday?: boolean; wantTrust?: boolean; kind?: string; nearby?: boolean; }
export interface AskResult { understood: AskUnderstood; filters: SearchFilters; businesses: Business[]; products: any[]; suggestions: string[]; }
export const aiSearchAPI = {
  ask: (q: string, coords?: { lat: number; lng: number }) =>
    request<AskResult>('POST', '/ai/ask', { q, ...(coords || {}) }),
};

// Merchant insights (لوحة التاجر)
export interface MerchantInsights { businessId: string; views: number; clicks: number; contacts: number; bookings: number; ctr: number; contactRate: number; topItems: { key: string; count: number }[]; }
export const insightsAPI = {
  me: () => request<MerchantInsights>('GET', '/insights/me'),
};

// Knowledge Studio (أدمن) — عقل AMANZINE: ما تعلّمه + ما لم يفهمه (misses)،
// مع اعتماد/رفض. يوسّع القاموس من الاستخدام الحقيقيّ، لا من إدخال يدويّ.
export interface KnowledgeMiss { id: string; raw?: string; normalized?: string; term?: string; count?: number; city?: string; }
export interface FreshCounts { days: number; users: number; products: number; services: number; listings: number; providers: number; orders: number; bookings: number }
export interface TopCity { city: string; total: number; hits: number; misses: number }
export interface TopTerm { term: string; total: number; hits: number }
export interface BrainStats {
  days: number; searches: number;
  quality?: { total?: number; hits?: number; misses?: number; successRate?: number };
  score?: { searchSuccess?: number };
  funnel?: Record<string, number>;
  topMisses?: KnowledgeMiss[];
  topCities?: TopCity[];   // أفضل مدينة (من search_daily)
  topTerms?: TopTerm[];    // أفضل خدمة (من search_terms_daily)
  fresh?: FreshCounts | null;  // الجديد خلال المدّة (مستخدمون · منتجات · خدمات…)
}
// `candidate` = اقتُرح ولم يُراجَع بعد. بدونها يكون اقتراحُ الذكاء الاصطناعيّ
// إمّا منشورًا (خطر) أو مسوّدةً (لا يُفرَّق عن عملِ إنسانٍ لم يُكمِله).
export type ConceptStatus = 'draft' | 'candidate' | 'published';
// المصدرُ يجعل دفعةً آليّةً سيّئةً قابلةً للتمييز — ومن ثَمّ للتراجع.
export type ConceptSource = 'system' | 'admin' | 'ai' | 'community';

export interface CustomConcept {
  id: string; category: string; status: ConceptStatus; source?: ConceptSource;
  concept: Record<string, string>; variants: Record<string, string[]>;
  stance?: any; asks?: any; links?: any; services?: string[]; examples?: string[];
}
export interface ConceptVersion {
  id: number; concept_id: string; reason: string | null;
  changed_by: string | null; created_at: string;
}
export interface ConceptCoverage {
  concept_id: string; label: string;
  providers: number; variants: number; asks: number; unmet: number;
  maturity: number;                  // 0..5 — مشتقٌّ من الخام، لا وسمٌ يُكتب
  gap: 'urgent' | 'thin' | null;     // urgent = طلبٌ بلا محلّ
}
export interface ConceptAlias {
  from_id: string; to_id: string; reason: string | null;
  merged_by: string | null; created_at: string;
}

export const knowledgeAPI = {
  // مفاهيمُ الأدمن — تُضاف من الواجهة بدل CSV
  listConcepts: (status?: ConceptStatus) =>
    request<{ concepts: CustomConcept[] }>('GET', `/knowledge/concepts${status ? `?status=${status}` : ''}`),
  // المنشورةُ فقط، بلا حساب — يستدعيها الإقلاع لكلّ زائر. استدعاءُ المسار
  // المحميّ هنا كان يرجع 401 فيدفع العميلُ إلى /login في حلقةٍ لا نهائيّة.
  publicConcepts: () => request<{ concepts: CustomConcept[] }>('GET', '/knowledge/concepts/public'),
  saveConcept: (c: any) => request<{ concept: CustomConcept }>('POST', '/knowledge/concepts', c),
  updateConcept: (id: string, c: any) => request<{ concept: CustomConcept }>('PUT', `/knowledge/concepts/${encodeURIComponent(id)}`, c),
  deleteConcept: (id: string) => request<{ ok: boolean }>('DELETE', `/knowledge/concepts/${encodeURIComponent(id)}`),
  brain:  (days = 30) => request<BrainStats>('GET', `/knowledge/brain?days=${days}`),
  misses: (status = 'open', limit = 100) => request<{ misses: KnowledgeMiss[] }>('GET', `/knowledge/misses?status=${status}&limit=${limit}`),
  // «حلّ» كان يكتب وسمَ فئةٍ ثمّ ينتهي — فيكتبها إنسانٌ آخر غدًا ولا نفهمها.
  // الآن الحلُّ **تعلُّم**: يُضاف المرادفُ إلى مفهوم. الردّ يحمل `learned`،
  // فلا تقول الواجهةُ «تعلَّم» إلّا إذا تعلَّم فعلًا (القاعدة ①).
  learn: (id: string, body: { conceptId?: string; id?: string; concept?: Record<string, string>;
    category?: string; variants?: string[]; lang?: string }) =>
    request<{ miss: KnowledgeMiss; learned: { id: string; variants: string[]; lang: string } | null }>(
      'POST', `/knowledge/misses/${encodeURIComponent(id)}/resolve`, body),
  ignore:  (id: string) => request<{ miss: KnowledgeMiss; learned: null }>('POST', `/knowledge/misses/${encodeURIComponent(id)}/resolve`, { status: 'ignored' }),

  // ── نواةُ المفهوم: نسخٌ · تراجع · دمج ──
  // «لماذا تغيّر هذا المفهوم؟» و«رُدَّه كما كان» سؤالان بلا جوابٍ قبل هذا.
  // و`reason` يُملأ آليًّا (miss:… · merge:… · revert:…) فيُجيب الأوّلَ بنفسه.
  versions: (id: string) => request<{ versions: ConceptVersion[] }>('GET', `/knowledge/concepts/${encodeURIComponent(id)}/versions`),
  revert: (id: string, versionId: number) =>
    request<{ concept: CustomConcept }>('POST', `/knowledge/concepts/${encodeURIComponent(id)}/revert/${versionId}`),
  // الدمجُ غيرُ مُتلِف: مزوّدو الخاسر يُحوَّلون، وصفُّه يُحفَظ، ويُسجَّل اسمٌ بديل.
  merge: (fromId: string, toId: string, reason?: string) =>
    request<{ merged: { from: string; to: string } }>('POST', '/knowledge/concepts/merge', { fromId, toId, reason }),
  aliases: () => request<{ aliases: ConceptAlias[] }>('GET', '/knowledge/aliases'),
  // «وين نمشي غدًا؟» — محسوبٌ من الخام لا مُخترَع. `empty` صدقُ الصفر.
  coverage: (limit = 40) => request<{ coverage: ConceptCoverage[]; gaps: ConceptCoverage[]; empty: boolean }>(
    'GET', `/knowledge/coverage?limit=${limit}`),
};

// ── Demand Capture — «ما لقيناش» تصير طلبًا مؤكّدًا ───────────
export interface NeedDemandRow { concept: string; city: string; count: number; reachable: number; last_at: string; }
export const needsAPI = {
  create: (n: { raw: string; city?: string; concept?: string; contact?: string }) =>
    request<{ id: string; ok: boolean; reachable: boolean }>('POST', '/needs', n),
  demand: (days = 30) => request<{ demand: NeedDemandRow[] }>('GET', `/needs/demand?days=${days}`),
  list: (status = 'open') => request<{ requests: any[] }>('GET', `/needs?status=${status}`),
  update: (id: string, d: { status?: string; matchedBusiness?: string }) =>
    request<{ request: any }>('PATCH', `/needs/${encodeURIComponent(id)}`, d),
};

// Activity Feed
export interface Activity { id: string; businessId: string; actor: string; type: string; category: string; city: string | null; createdAt: string; payload: any; }
export const feedAPI = {
  get: (params: { type?: 'latest' | 'local' | 'category' | 'trending' | 'following'; city?: string; category?: string; ids?: string; limit?: number } = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, String(v));
    return request<{ type: string; items: Activity[]; trending?: { category: string; count: number }[] }>('GET', `/feed?${qs}`);
  },
};

// ── WebSocket real-time ───────────────────────────────────────
// WSK-01/02: مصادقة WS تتم بالكوكي HttpOnly تلقائياً عند المصافحة (الخادم
// يقرأها)، مع إرسال توكن الذاكرة إن وُجد. إعادة الاتصال بتراجع أسّي،
// وتتوقف نهائياً بعد الخروج المتعمّد (لا تكسر تسجيل الخروج).
let _ws: WebSocket | null = null;
let _wsClosedByUs = false;
let _wsRetryMs = 5000;
const _handlers = new Map<string, Set<(data: any) => void>>();

export function connectWS(userId: string) {
  if (_ws && _ws.readyState < 2) return;
  _wsClosedByUs = false;
  try {
    const wsBase = BASE_URL.replace(/^http/, 'ws').replace('/api', '');
    _ws = new WebSocket(`${wsBase}/ws?userId=${userId}`);
    _ws.onopen = () => {
      _wsRetryMs = 5000; // نجح الاتصال — صفّر التراجع
      if (_token && _ws) _ws.send(JSON.stringify({ type: 'auth', token: _token }));
    };
    _ws.onmessage = (e) => {
      try {
        const { event, data } = JSON.parse(e.data);
        _handlers.get(event)?.forEach(fn => fn(data));
      } catch {}
    };
    _ws.onerror = () => {};
    _ws.onclose = () => {
      if (_wsClosedByUs) return; // WSK-02: خروج متعمّد — لا إعادة اتصال
      const delay = _wsRetryMs;
      _wsRetryMs = Math.min(_wsRetryMs * 2, 60000);
      setTimeout(() => connectWS(userId), delay);
    };
  } catch {}
}

export function onWS(event: string, handler: (data: any) => void) {
  if (!_handlers.has(event)) _handlers.set(event, new Set());
  _handlers.get(event)!.add(handler);
  return () => _handlers.get(event)?.delete(handler);
}

export function disconnectWS() {
  _wsClosedByUs = true;
  _ws?.close();
  _ws = null;
}
