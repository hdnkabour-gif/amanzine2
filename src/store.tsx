import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  defaultSettings, seedProducts, seedCustomers, seedOrders,
  seedConversations, seedAuditLogs,
  type AppSettings, type Product, type Customer, type Order,
  type Conversation, type ConvMessage, type AuditLog, type AppNotification, type Template,
  type Page, type UserRole, type LogType, type LogSeverity, type NotifType, type OrderStatus,
  type DeliveryProviderConfig,
  PAGE_IDS,
} from './types';
import * as api from './services/api';
import { registerRuntimeConcepts } from './lib/akg/kb/knowledge';
import { syncMemory } from './lib/userMemory';
import { loadLearnedPlaces } from './lib/akg/kb/places';
import { validateImport } from './utils/importSchema';
import { Sounds } from './utils/sounds';

// C-3: نسخة من الإعدادات بدون أسرار الطرف الثالث — لمنع بقاء المفاتيح في localStorage
function stripSecrets(settings: any): any {
  try {
    const s = JSON.parse(JSON.stringify(settings));
    const blank = (o: any, keys: string[]) => { if (o && typeof o === 'object') keys.forEach(k => { if (typeof o[k] === 'string' && o[k]) o[k] = ''; }); };
    blank(s, ['cloudinaryApiKey', 'cloudinaryApiSecret', 'supabaseKey']);
    blank(s.ai, ['apiKey', 'geminiKey', 'claudeKey', 'deepseekKey', 'grokKey', 'mistralKey']);
    blank(s.security, ['hcaptchaSecret']);
    blank(s.marketing, ['brevoApiKey']);
    if (s.social && typeof s.social === 'object') {
      for (const k of Object.keys(s.social)) blank(s.social[k], ['accessToken', 'apiKey']);
    }
    return s;
  } catch { return settings; }
}

// نتيجة الشحن الصادقة — كل خطوة فيها تقابل حدثاً وقع فعلاً على الخادم
export interface ShipResult {
  real: boolean;
  tracking: string;
  provider: string;
  via?: string;
  apiError?: string;
  openUrl?: string;
  steps?: { label: string; ok: boolean; detail?: string; error?: string }[];
  manualCopy?: string;
  /** إعادةُ محاولةٍ مجدوَلة بعد عطبٍ عابرٍ لدى الشركة — لا عملَ على التاجر. */
  retryAt?: string | null;
  /** هل يلزم إدخالٌ يدويّ؟ فشلٌ دائمٌ وحدَه يوجبه. */
  needsManual?: boolean;
}

interface StoreValue {
  token: string | null;
  user: any;
  settings: AppSettings;
  products: Product[];
  customers: Customer[];
  orders: Order[];
  conversations: Conversation[];
  auditLogs: AuditLog[];
  /** المصدرُ الوحيد لشركات التوصيل — مرآةُ جدول delivery_providers. */
  deliveryProviders: DeliveryProviderConfig[];
  notifications: AppNotification[];
  currentPage: Page;
  currentRole: UserRole;
  isLoading: boolean;
  isOnline: boolean;
  sidebarOpen: boolean;
  onboardingCompleted: boolean;

  // Delivery providers — كلّ كتابةٍ تمرّ بالخادم ثمّ تُعاد القائمةُ منه
  saveDeliveryProvider: (p: Partial<DeliveryProviderConfig>) => Promise<DeliveryProviderConfig[]>;
  refreshDeliveryProviders: () => Promise<DeliveryProviderConfig[]>;
  removeDeliveryProvider: (id: string) => Promise<void>;

  // Auth
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, storeName?: string) => Promise<void>;
  logout: () => void;

  setPage: (p: Page) => void;
  setSidebarOpen: (v: boolean) => void;
  updateSettings: (key: keyof AppSettings, val: any) => Promise<void>;

  // Products
  addProduct: (p: any) => Promise<void>;
  updateProduct: (id: string, u: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (id: string, delta: number) => Promise<void>;

  // Customers
  addCustomer: (c: any) => Promise<void>;
  updateCustomer: (id: string, u: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  // Orders
  addOrder: (o: any) => Promise<string>;
  updateOrder: (id: string, u: Partial<Order>) => Promise<void>;
  approveOrder: (id: string) => Promise<void>;
  rejectOrder: (id: string, reason?: string) => Promise<void>;
  shipOrder: (id: string, provider?: string, tracking?: string) => Promise<ShipResult | void>;
  deliverOrder: (id: string) => Promise<void>;
  trackOrder: (id: string) => Promise<void>;

  // Conversations
  sendMessage: (convId: string, content: string, role: 'customer' | 'agent' | 'ai') => Promise<void>;
  addConversation: (c: any) => Promise<string>;
  updateConversation: (id: string, u: Partial<Conversation>) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;

  // Templates
  addTemplate: (t: any) => Promise<void>;
  updateTemplate: (id: string, u: Partial<Template>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  // System
  notify: (type: NotifType, message: string) => void;
  clearNotifications: () => void;
  markNotifRead: (id: string) => void;
  log: (user: string, action: string, details: string, type: LogType, severity: LogSeverity) => void;
  exportData: () => void;
  importData: (json: string) => { ok: boolean; errors?: string[]; stats?: { products: number; orders: number; customers: number } };
  resetToDemo: () => void;
  refreshData: () => Promise<void>;
  setOnboardingCompleted: (val: boolean) => void;
}

const StoreCtx = createContext<StoreValue | null>(null);
const uid = () => Math.random().toString(36).slice(2, 9);
const nowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};


// URL → Page mapping for initial load
const URL_TO_PAGE: Record<string, string> = {
  '/home': 'home',
  '/dashboard': 'dashboard', '/products': 'products', '/orders': 'orders',
  '/messages': 'conversations', '/customers': 'customers', '/analytics': 'analytics',
  '/connections': 'connections', '/delivery': 'delivery', '/notifications': 'notifications',
  '/settings': 'settings', '/studio': 'banner', '/editor': 'editor',
  '/knowledge-studio': 'knowledge',
  '/wallet': 'wallet', '/profile': 'profile', '/assistant': 'assistant', '/publish': 'publish',
};

function getInitialPage(): Page {
  // ?page=… يسمح بالوصول المباشر إلى صفحةٍ داخليّة بعد الدخول. تستعمله صفحةُ
  // التسجيل لتُكمل نيّةَ مَن جاء ليعرض نشاطَه بدل إنزاله في صفحةٍ عامّة.
  try {
    const wanted = new URLSearchParams(window.location.search).get('page');
    if (wanted && (PAGE_IDS as readonly string[]).includes(wanted)) return wanted as Page;
  } catch { /* noop */ }
  const path = window.location.pathname;
  return (URL_TO_PAGE[path] as Page) || 'home';
}

// C-3 (مكتمل): التوكن يعيش في كوكي HttpOnly + ذاكرة التبويب — لا localStorage.
// api.ts يحمّل توكن الديمو/التوكن القديم (هجرة لمرة واحدة) عند تحميل الوحدة.
// وجود مستخدم مخزّن (غير سرّي) يعني "جلسة كوكي على الأرجح" — نتحقق منها عبر
// /auth/me عند الإقلاع بدل تسجيل خروج فوري عند كل تحديث للصفحة.
const storedToken = (() => {
  const t = api.getToken();
  if (t) return t;
  try { return localStorage.getItem('ai_commerce_user') ? 'cookie-session' : null; } catch { return null; }
})();

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Demo token: keep seed data so the demo experience works without a backend.
  // Real login: start with empty arrays — real data loads from backend via refreshData().
  const isDemo = storedToken === 'demo-token-local';

  const [state, setState] = useState({
    token: storedToken,
    user: (() => { try { const u = localStorage.getItem('ai_commerce_user'); return u ? JSON.parse(u) : null; } catch { return null; } })(),
    settings: (() => {
      try {
        const t = localStorage.getItem('ai_commerce_theme');
        if (t === 'light' || t === 'dark') return { ...defaultSettings, design: { ...defaultSettings.design, theme: t as 'dark' | 'light' } };
      } catch {}
      return defaultSettings;
    })(),
    products:      isDemo ? seedProducts      : [] as typeof seedProducts,
    customers:     isDemo ? seedCustomers     : [] as typeof seedCustomers,
    orders:        isDemo ? seedOrders        : [] as typeof seedOrders,
    conversations: isDemo ? seedConversations : [] as typeof seedConversations,
    auditLogs:     isDemo ? seedAuditLogs     : [] as typeof seedAuditLogs,
    // شركاتُ التوصيل تُقرأ من الخادم وحده (delivery_providers). كانت تُخزَّن أيضًا
    // في settings.delivery.providers فينشأ مصدرا حقيقةٍ يتباعدان بصمت.
    deliveryProviders: [] as DeliveryProviderConfig[],
    notifications: [] as AppNotification[],
    currentPage: (storedToken ? getInitialPage() : 'home') as Page,
    currentRole: 'admin' as UserRole,
    isOnline: false,
    isLoading: !!storedToken && !isDemo, // true only for real logged-in users pending first fetch
    hydrated: false, // true بعد أول جلب ناجح للإعدادات من الخادم
    sidebarOpen: false,
    onboardingCompleted: (() => { try { const u = localStorage.getItem('ai_commerce_user'); return u ? JSON.parse(u).onboardingCompleted === true : false; } catch { return false; } })(),
  });

  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const notify = useCallback((type: NotifType, message: string) => {
    setState(s => ({ ...s, notifications: [{ id: uid(), type, message, timestamp: Date.now(), read: false }, ...s.notifications].slice(0, 50) }));
  }, []);

  // ── السمةُ تصل إلى الصفحة ────────────────────────────────
  //
  //   **الحلقةُ التي لم تكن موجودة.** السمةُ كانت تُحفَظ في الإعدادات وفي
  //   `localStorage`، ويُحدَّث الحقلُ في الحالة… ولا تصل إلى DOM أبدًا: لا
  //   `data-theme` على الجذر، ولا قاعدةَ CSS واحدةً للفاتح. فالمبدّلُ يعمل
  //   والشاشةُ لا تتغيّر — وهو أسوأُ من زرٍّ معطَّل، لأنّ المستخدمَ يظنّ أنّه
  //   ضغط خطأً فيُعيد المحاولةَ مرّاتٍ ثمّ يستسلم.
  //
  //   ويُكتَب هنا لا في كلّ صفحة: مصدرٌ واحدٌ للحقيقة، ويتبع الحالةَ مهما
  //   تغيّرت (تبديلٌ يدويٌّ · تحميلٌ من الخادم · استرجاعٌ من التخزين).
  const theme = state.settings.design?.theme === 'light' ? 'light' : 'dark';
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      // شريطُ المتصفّح يتبع السمةَ أيضًا — وإلّا بقي شريطٌ أسودُ فوق صفحةٍ بيضاء.
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', theme === 'light' ? '#FAF7F2' : '#060B14');
    } catch { /* بيئةٌ بلا DOM (اختبار) — لا نكسر شيئًا */ }
  }, [theme]);

  const log = useCallback((user: string, action: string, details: string, type: LogType, severity: LogSeverity) => {
    setState(s => ({ ...s, auditLogs: [{ id: Date.now(), timestamp: nowStr(), user, action, details, type, severity }, ...s.auditLogs].slice(0, 300) }));
  }, []);

  const setOnboardingCompleted = useCallback((val: boolean) => {
    setState(s => ({ ...s, onboardingCompleted: val }));
    try {
      const u = localStorage.getItem('ai_commerce_user');
      if (u) { const parsed = JSON.parse(u); localStorage.setItem('ai_commerce_user', JSON.stringify({ ...parsed, onboardingCompleted: val })); }
    } catch {}
  }, []);

  // Full data sync from backend
  const refreshData = useCallback(async () => {
    // Demo mode: skip backend calls, seed data already in state
    if (api.getToken() === 'demo-token-local') {
      setState(s => ({ ...s, isOnline: false, isLoading: false }));
      return;
    }
    const online = await api.checkBackend();
    if (!online) {
      try {
        const saved = localStorage.getItem('ai_commerce_os_state');
        if (saved) {
          const parsed = JSON.parse(saved);
          setState(s => ({ ...s, ...parsed, isOnline: false, isLoading: false, token: s.token, user: s.user }));
        } else {
          setState(s => ({ ...s, isLoading: false }));
        }
      } catch { setState(s => ({ ...s, isLoading: false })); }
      return;
    }

    try {
      // C-3: ‏/auth/me يصادق عبر كوكي HttpOnly حتى بدون توكن في الذاكرة —
      // (وعند انتهاء توكن الوصول يجدّده تلقائياً من كوكي refresh داخل api.ts)
      const meData = await api.authAPI.me().catch(() => null);

      // الأماكنُ التي اعتمدها الإنسانُ في مركز المعرفة — تدخل الفهرسَ قبل
      // أيّ فهمٍ أو إكمال. بلا هذا السطرِ يعيش المكانُ المعتمَدُ في التخزين
      // وحدَه، فلا يعرفه المحرّكُ ولا يظهر في خانة المدينة بعد إعادة التحميل.
      loadLearnedPlaces();

      // المفاهيم المنشورة تُحمَّل عند الإقلاع وتُسجَّل في محرّك الفهم.
      // **مسارٌ عامّ** لا محميّ: الفهم يخصّ كلّ الناس، والمحميُّ كان يرجع 401
      // للزائر فيدفعه العميلُ إلى /login في حلقةِ إعادة تحميلٍ لا نهائيّة.
      api.knowledgeAPI.publicConcepts()
        .then(r => {
          const list = (r.concepts || []).map((c: any) => ({
            id: c.id, category: c.category || '', concept: c.concept || {}, variants: c.variants || {},
            stance: c.stance, asks: c.asks, links: c.links,
            services: c.services || [], examples: c.examples || [],
          }));
          if (list.length) registerRuntimeConcepts(list as any);
        })
        .catch(() => { /* زائرٌ أو غير أدمن ⇒ المعرفة المدمجة تكفي */ });
      const currentUser = meData?.user || null;

      if (!currentUser) {
        // لا جلسة صالحة (زائر، أو كوكي منتهٍ) — حالة الزائر، بلا إعادة توجيه
        if (!api.getToken()) { try { localStorage.removeItem('ai_commerce_user'); } catch {} }
        setState(s => ({ ...s, token: api.getToken(), user: api.getToken() ? s.user : null, isOnline: true, isLoading: false }));
        return;
      }

      try { localStorage.setItem('ai_commerce_user', JSON.stringify(currentUser)); } catch {}

      // ذاكرةُ المستخدم: تُرفَع وتُستقبَل في جولةٍ واحدة. كان ما يتعلّمه
      // التطبيقُ عن شخصٍ بعينه يعيش في `localStorage` وحدَه — فمَن يبدّل
      // هاتفَه يجده لا يعرفه. لا انتظارَ هنا: الإقلاعُ لا يقف على الشبكة،
      // والذاكرةُ المحلّيّة تعمل حتى تصل النسخةُ المدموجة.
      void syncMemory();
      // جلسة كوكي مستعادة بلا توكن في الذاكرة: جدّد للحصول على توكن وصول
      // (تحتاجه الصفحات التي ترسل Bearer مباشرة + مصافحة WS)
      if (!api.getToken()) await api.authAPI.refresh();

      // Flush settings queued while the server was unreachable — must land
      // BEFORE we fetch settings back, or the server copy wipes local edits.
      try {
        const pendingRaw = localStorage.getItem('ai_commerce_pending_settings');
        if (pendingRaw) {
          const pending = JSON.parse(pendingRaw);
          if (pending && Object.keys(pending).length) await api.settingsAPI.save(pending);
          localStorage.removeItem('ai_commerce_pending_settings');
        }
      } catch {}

      // allSettled بدل all: فشل طلب واحد (مهلة شبكة مثلاً) لا يجب أن يُسقط
      // كل البيانات ويُظهر اللوحة فارغة رغم أن الخادم يحتوي كل شيء
      const [productsR, ordersR, customersR, settingsR, convsR, deliveryR, logsR] = await Promise.allSettled([
        api.productsAPI.list(),
        api.ordersAPI.list(),
        api.customersAPI.list(),
        api.settingsAPI.get(),
        api.conversationsAPI.list(),
        api.deliveryAPI.list(),
        // السجلُّ يعيش في `audit_logs` على الخادم، ويُكتب من ١٣ مسارًا. كان
        // `auditLogs` ذاكرةَ تبويبٍ وحدَها ⇒ «لا نشاط بعد» بعد كلّ تحديثِ صفحة
        // مهما عمل التاجر. الحقيقةُ كانت موجودةً ولا تُقرأ.
        api.settingsAPI.getLogs(),
      ]);
      const val = <T,>(r: PromiseSettledResult<T>): T | null => r.status === 'fulfilled' ? r.value : null;
      const products = val(productsR);
      const orders = val(ordersR);
      const customers = val(customersR) as any;
      const convs = val(convsR);
      const deliveryProviders = val(deliveryR) as DeliveryProviderConfig[] | null;
      const serverLogs = val(logsR) as AuditLog[] | null;
      const settingsOk = settingsR.status === 'fulfilled';
      const settings = settingsOk ? (settingsR as PromiseFulfilledResult<any>).value : null;

      setState(s => ({
        ...s,
        token: api.getToken() || s.token, // C-3: توكن الذاكرة بعد استعادة جلسة الكوكي
        user: currentUser || s.user,
        products: products ?? s.products,
        orders: orders ?? s.orders,
        customers: customers?.data ?? customers ?? s.customers,
        settings: (settings && settings.brand) ? (() => {
            const localTheme = (() => { try { return localStorage.getItem('ai_commerce_theme'); } catch { return null; } })();
            const merged = { ...s.settings, ...settings };
            if (localTheme === 'light' || localTheme === 'dark') {
              merged.design = { ...merged.design, theme: localTheme as 'light' | 'dark' };
            } else if (settings.design?.theme) {
              try { localStorage.setItem('ai_commerce_theme', settings.design.theme); } catch {}
            }
            return merged;
          })() : s.settings,
        conversations: convs ?? s.conversations,
        deliveryProviders: deliveryProviders ?? s.deliveryProviders,
        auditLogs: serverLogs ?? s.auditLogs,
        // قرار الإعداد الأولي يُتخذ فقط عند نجاح جلب الإعدادات:
        // إعدادات فارغة = حساب جديد فعلاً → onboarding
        // فشل الطلب = لا نغير شيئاً (حتى لا يُعاد onboarding ويمسح الإعدادات)
        onboardingCompleted: settingsOk
          ? (settings ? settings.onboardingDone === true : false)
          : s.onboardingCompleted,
        hydrated: s.hydrated || settingsOk,
        isOnline: true,
        isLoading: false,
      }));
      if (!settingsOk) {
        notify('warning', '⚠️ تعذّر تحميل بيانات متجرك من الخادم — قد تكون الجلسة منتهية. أعد تحميل الصفحة، وإن استمرّ سجّل الخروج ثم الدخول من جديد.');
      }
    } catch (e: any) {
      setState(s => ({ ...s, isOnline: false, isLoading: false }));
    }
  }, [notify]);

  useEffect(() => { refreshData(); }, [refreshData]);

  // Persist state backup — فقط بعد تحميل البيانات الحقيقية من الخادم،
  // حتى لا تُكتب القيم الافتراضية الفارغة فوق النسخة الاحتياطية الجيدة
  useEffect(() => {
    if (state.token && state.hydrated) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try {
          const { token, user, notifications, currentPage, sidebarOpen, isLoading, isOnline, hydrated, ...toSave } = state as any;
          // C-3: لا تُحفظ أسرار الطرف الثالث (مفاتيح AI/سوشيال/كلاودينري...) في localStorage
          if (toSave.settings) toSave.settings = stripSecrets(toSave.settings);
          localStorage.setItem('ai_commerce_os_state', JSON.stringify(toSave));
        } catch {}
      }, 1000);
    }
  }, [state]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!state.isOnline || !state.user?.id) return;
    api.connectWS(state.user.id);
    const offOrder = api.onWS('order_created', (data) => {
      setState(s => {
        // Auto-create conversation if customer doesn't exist
        const existsConv = s.conversations.some((cv: any) => cv.customerPhone === data.customerPhone);
        const newConvs = (!existsConv && data.customerPhone)
          ? [{
              id: `CONV-${Date.now()}`,
              customerId: `C${Date.now()}`,
              customerName: data.customerName,
              customerPhone: data.customerPhone,
              source: 'WhatsApp' as const,
              status: 'active' as const,
              lastMessage: `🛒 طلب جديد: ${data.id}`,
              unread: 1,
              priority: 'medium' as const,
              mood: 'neutral' as const,
              pinned: false,
              messages: [],
              createdAt: new Date().toISOString(),
            }]
          : [];
        return { ...s, orders: [data, ...s.orders.filter(o => o.id !== data.id)], conversations: [...newConvs, ...s.conversations] };
      });
      notify('info', `🛒 طلب جديد من ${data.customerName}`);
      try { Sounds.newOrder(); } catch {}
    });
    const offUpdated = api.onWS('order_updated', (data) => {
      setState(s => ({ ...s, orders: s.orders.map(o => o.id === data.id ? data : o) }));
    });
    const offMsg = api.onWS('new_message', ({ convId, data: msg }) => {
      setState(s => ({
        ...s,
        conversations: s.conversations.map(c => c.id === convId
          ? { ...c, messages: [...(c.messages||[]), msg], lastMessage: msg.content, unread: msg.role !== 'ai' ? (c.unread||0)+1 : c.unread }
          : c)
      }));
    });
    // مزامنة المنتجات الحية (كان الخادم يبثّها ولا أحد يستمع) — عبر الأجهزة/التبويبات
    const offProdAdd = api.onWS('product_added',   (data) => setState(s => ({ ...s, products: [data, ...s.products.filter(p => p.id !== data.id)] })));
    const offProdUpd = api.onWS('product_updated', (data) => setState(s => ({ ...s, products: s.products.map(p => p.id === data.id ? data : p) })));
    const offProdDel = api.onWS('product_deleted', (data) => setState(s => ({ ...s, products: s.products.filter(p => p.id !== data.id) })));
    return () => { offOrder(); offUpdated(); offMsg(); offProdAdd(); offProdUpd(); offProdDel(); };
  }, [state.isOnline, state.user?.id, notify]);

  // ── AUTH ──────────────────────────────────────────────────
  const login = async (email: string, password: string) => {
    const { token, refreshToken, user } = await api.authAPI.login({ email, password });
    api.setToken(token);
    api.setRefreshToken(refreshToken);
    try { localStorage.setItem('ai_commerce_user', JSON.stringify(user)); } catch {}
    // isLoading حتى وصول الإعدادات — يمنع وميض Onboarding على جهاز جديد
    setState(s => ({ ...s, token, user, currentPage: 'home', isLoading: true }));
    setTimeout(() => refreshData(), 100);
    // Redirect to the new home (Need Screen)
    if (window.location.pathname === '/' || window.location.pathname === '/login' || window.location.pathname === '/register') {
      window.history.pushState({}, '', '/home');
    }
  };

  const register = async (name: string, email: string, password: string, storeName?: string) => {
    const { token, refreshToken, user } = await api.authAPI.register({ name, email, password, storeName });
    api.setToken(token);
    api.setRefreshToken(refreshToken);
    try { localStorage.setItem('ai_commerce_user', JSON.stringify(user)); } catch {}
    setState(s => ({ ...s, token, user, currentPage: 'home', settings: { ...s.settings, onboardingDone: false as any }, onboardingCompleted: false }));
    setTimeout(() => refreshData(), 100);
    if (window.location.pathname === '/' || window.location.pathname === '/login' || window.location.pathname === '/register') {
      window.history.pushState({}, '', '/home');
    }
  };

  const logout = async () => {
    // C-3: ننتظر الخادم يمسح كوكيز HttpOnly ويبطل توكن التجديد قبل مغادرة
    // الصفحة — وإلا بقي الكوكي صالحاً واستعاد الإقلاع الجلسة "بعد الخروج"
    try { await api.authAPI.logout(); } catch {}
    api.setToken(null);
    api.setRefreshToken(null);
    api.disconnectWS();
    try { localStorage.removeItem('ai_commerce_user'); } catch {}
    setState(s => ({ ...s, token: null, user: null, currentPage: 'dashboard', products: seedProducts, orders: seedOrders, customers: seedCustomers, conversations: seedConversations }));
    window.location.href = '/login';
  };

  // ── SETTINGS ──────────────────────────────────────────────
  const updateSettings = async (key: keyof AppSettings, val: any) => {
    setState(s => ({ ...s, settings: { ...s.settings, [key]: val } }));
    if (key === 'design' && (val as any)?.theme) {
      try { localStorage.setItem('ai_commerce_theme', (val as any).theme); } catch {}
    }
    const tok = api.getToken();
    if (tok === 'demo-token-local') return; // demo: local-only by design
    // C-3: جلسة كوكي بلا توكن في الذاكرة تُحفظ عبر الكوكي؛ لا جلسة إطلاقاً = محلي فقط
    const hasCookieSession = (() => { try { return !!localStorage.getItem('ai_commerce_user'); } catch { return false; } })();
    if (!tok && !hasCookieSession) return;
    try {
      await api.settingsAPI.save({ [key]: val });
      // saved OK — drop any stale pending copy of this key
      try {
        const raw = localStorage.getItem('ai_commerce_pending_settings');
        if (raw) {
          const pending = JSON.parse(raw);
          delete pending[key];
          if (Object.keys(pending).length) localStorage.setItem('ai_commerce_pending_settings', JSON.stringify(pending));
          else localStorage.removeItem('ai_commerce_pending_settings');
        }
      } catch {}
    } catch {
      // server unreachable or rejected — queue for retry on next refreshData
      try {
        const pending = JSON.parse(localStorage.getItem('ai_commerce_pending_settings') || '{}');
        pending[key] = val;
        localStorage.setItem('ai_commerce_pending_settings', JSON.stringify(pending));
      } catch {}
      notify('warning', '⚠️ تعذر حفظ الإعدادات على الخادم — سيُعاد الحفظ تلقائياً عند عودة الاتصال');
    }
  };

  // ── PRODUCTS ─────────────────────────────────────────────
  const addProduct = async (p: any) => {
    let np: Product;
    if (state.isOnline && api.getToken()) {
      np = await api.productsAPI.create(p);
    } else {
      np = { ...p, id: 'L'+Date.now(), sku: 'PRD-'+uid(), createdAt: new Date().toISOString().split('T')[0], views: 0, sales: 0 };
    }
    setState(s => ({ ...s, products: [np, ...s.products] }));
    log('المدير', `أضاف منتج: ${np.name}`, `${np.price} ${state.settings.brand.currency}`, 'product', 'success');
  };

  // رسائل حقيقية: فشل الحفظ على الخادم يظهر للمستخدم بدل تجاهله بصمت
  const updateProduct = async (id: string, u: Partial<Product>) => {
    setState(s => ({ ...s, products: s.products.map(p => p.id === id ? { ...p, ...u } : p) }));
    if (state.isOnline && api.getToken()) {
      try { await api.productsAPI.update(id, u); }
      catch (e: any) { notify('error', `❌ لم يُحفظ التعديل على الخادم: ${e?.message || 'تحقق من الاتصال'}`); }
    }
  };

  const deleteProduct = async (id: string) => {
    const p = state.products.find(x => x.id === id);
    setState(s => ({ ...s, products: s.products.filter(p => p.id !== id) }));
    if (state.isOnline && api.getToken()) {
      try { await api.productsAPI.remove(id); notify('success', `✅ حُذف "${p?.name || 'المنتج'}" نهائياً من الخادم`); }
      catch (e: any) { notify('error', `❌ لم يُحذف من الخادم: ${e?.message || 'تحقق من الاتصال'}`); }
    }
    if (p) log('المدير', `حذف منتج: ${p.name}`, '', 'product', 'warning');
  };

  const adjustStock = async (id: string, delta: number) => {
    const p = state.products.find(x => x.id === id);
    if (!p) return;
    const newStock = Math.max(0, p.stock + delta);
    setState(s => ({ ...s, products: s.products.map(x => x.id === id ? { ...x, stock: newStock } : x) }));
    if (state.isOnline && api.getToken()) {
      try { await api.productsAPI.update(id, { stock: newStock }); }
      catch (e: any) { notify('error', `❌ لم يُحفظ المخزون على الخادم: ${e?.message || 'تحقق من الاتصال'}`); }
    }
  };

  // ── CUSTOMERS ────────────────────────────────────────────
  const addCustomer = async (c: any) => {
    let nc: Customer;
    if (state.isOnline && api.getToken()) {
      nc = await api.customersAPI.create(c);
    } else {
      nc = { ...c, id: 'C'+uid(), totalOrders: 0, totalSpent: 0, lastOrderDate: nowStr(), vip: false, trustScore: 80, buyerScore: 50 };
    }
    setState(s => ({ ...s, customers: [nc, ...s.customers] }));
  };

  const updateCustomer = async (id: string, u: Partial<Customer>) => {
    setState(s => ({ ...s, customers: s.customers.map(c => c.id === id ? { ...c, ...u } : c) }));
    if (state.isOnline && api.getToken()) {
      try { await api.customersAPI.update(id, u); }
      catch (e: any) { notify('error', `❌ لم يُحفظ تعديل الزبون على الخادم: ${e?.message || 'تحقق من الاتصال'}`); }
    }
  };

  const deleteCustomer = async (id: string) => {
    setState(s => ({ ...s, customers: s.customers.filter(c => c.id !== id) }));
    if (state.isOnline && api.getToken()) {
      try { await api.customersAPI.remove(id); notify('success', '✅ حُذف الزبون من الخادم'); }
      catch (e: any) { notify('error', `❌ لم يُحذف الزبون من الخادم: ${e?.message || 'تحقق من الاتصال'}`); }
    }
  };

  // ── ORDERS ───────────────────────────────────────────────
  const addOrder = async (o: any) => {
    let order: any;
    if (state.isOnline && api.getToken()) {
      order = await api.ordersAPI.create(o);
    } else {
      order = { ...o, id: 'ORD-'+uid().toUpperCase(), createdAt: new Date().toISOString() };
    }
    setState(s => ({ ...s, orders: [order, ...s.orders] }));
    notify('info', `🛒 طلب جديد من ${order.customerName}`);
    return order.id;
  };

  const updateOrder = async (id: string, u: Partial<Order>) => {
    setState(s => ({ ...s, orders: s.orders.map(o => o.id === id ? { ...o, ...u } : o) }));
    if (state.isOnline && api.getToken()) {
      try { await api.ordersAPI.update(id, u); }
      catch (e: any) { notify('error', `❌ لم يُحفظ تعديل الطلب على الخادم: ${e?.message || 'تحقق من الاتصال'}`); }
    }
  };

  const approveOrder = async (id: string) => {
    setState(s => ({ ...s, orders: s.orders.map(o => o.id === id ? { ...o, status: 'approved' as OrderStatus } : o) }));
    if (state.isOnline && api.getToken()) {
      try {
        const updated = await api.ordersAPI.approve(id);
        setState(s => ({ ...s, orders: s.orders.map(o => o.id === id ? updated : o) }));
      } catch (e: any) { notify('warning', `تحذير: ${e.message}`); }
    }
    notify('success', '✅ تم تأكيد الطلب');
    try { Sounds.approved(); } catch {}
    log('المدير', `وافق على طلب: ${id}`, '', 'order', 'success');
  };

  const rejectOrder = async (id: string, reason?: string) => {
    setState(s => ({ ...s, orders: s.orders.map(o => o.id === id ? { ...o, status: 'cancelled' as OrderStatus } : o) }));
    if (state.isOnline && api.getToken()) {
      try { await api.ordersAPI.reject(id); }
      catch (e: any) { notify('error', `⚠️ الرفض لم يُسجل على الخادم: ${e?.message || 'تحقق من الاتصال'}`); return; }
    }
    notify('info', '❌ تم رفض الطلب');
    log('المدير', `رفض طلب: ${id}`, reason||'', 'order', 'warning');
  };

  const shipOrder = async (id: string, provider?: string, tracking?: string): Promise<ShipResult | void> => {
    // ── لا رقمَ تتبّعٍ مُخترَع ──────────────────────────────────────
    //   كان يُولَّد `TRK-XXXXXX` هنا **قبل** سؤال الخادم، ويُكتَب في نفس حقل
    //   الرقم الحقيقيّ، ويُوسَم الطلبُ `shipped` ولو قال الخادمُ إنّه لم يُرسل.
    //   الخادمُ كان قد تخلّص من هذه الكذبة، وبقيت في المتصفّح — فبقيت.
    //
    //   وهي تُبطل إعادةَ المحاولة تمامًا: الطابورُ يشترط رقمَ تتبّعٍ فارغًا
    //   (وإلّا أُنشئت شحنتان لزبون)، ورقمٌ مخترَعٌ يعني ألّا يُعاد الطلبُ أبدًا.
    let trk = tracking || '';
    // لا اسمَ شركةٍ افتراضيًّا: «Amana» هنا كانت تنسب الشحنةَ لشركةٍ قد لا
    // يتعامل معها التاجر. الخادمُ يُعيد الاسمَ الحقيقيَّ بعد الإنشاء.
    let prov = provider || state.settings.delivery?.defaultProvider || '';
    // shipMsg: الرسالة الصادقة الوحيدة التي يراها التاجر عن مصير الشحنة
    let shipMsg: { type: NotifType; text: string } = { type: 'success', text: '' };
    // النتيجة الصادقة تُعاد لواجهة الطلبات لعرض الخطوات الحقيقية
    let result: ShipResult = { real: false, tracking: trk, provider: prov };

    if (state.isOnline && api.getToken()) {
      if (tracking) {
        // التاجر أدخل رقم تتبع حقيقياً بنفسه (أنشأ الشحنة يدوياً في موقع الشركة)
        // — لا نستدعي قناة الربط، الرقم حقيقي من مصدره
        result = { real: true, tracking: trk, provider: prov, via: 'manual',
          steps: [{ label: 'رقم تتبع حقيقي أُدخل يدوياً (أنشأت الشحنة بنفسك لدى الشركة)', ok: true, detail: trk }] };
        shipMsg = { type: 'success', text: `🚚 شُحن الطلب — ✅ برقم التتبع الحقيقي الذي أدخلته: ${trk}` };
      } else {
        // الخطوة 1: محاولة إنشاء شحنة فعلية لدى شركة التوصيل (API/Webhook)
        try {
          const d = await api.deliveryAPI.create(id);
          if (d?.tracking) trk = d.tracking;
          if (d?.provider) prov = d.provider;
          result = { real: !!d?.real, tracking: trk, provider: prov, via: d?.via,
            apiError: d?.apiError, openUrl: d?.openUrl || d?.manual?.openUrl,
            steps: d?.steps, manualCopy: d?.manual?.copyText,
            retryAt: d?.retryAt || null, needsManual: !!d?.needsManual };
          if (d?.real) {
            shipMsg = { type: 'success', text: `🚚 شُحن الطلب — ✅ شحنة حقيقية لدى ${prov} (تتبع: ${trk})` };
          } else if (d?.retryAt) {
            const at = new Date(d.retryAt).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' });
            shipMsg = { type: 'info', text: `🔁 ${prov} ما جاوباتش دابا — غانعاودو بوحدنا على ${at}. ما تدير والو.` };
          } else {
            shipMsg = { type: 'warning', text: `⚠️ لم يُرسَل الطلبُ لـ${prov} — سجّله في موقع الشركة وألصق رقمَ التتبّع هنا${d?.apiError ? ` · السبب: ${d.apiError}` : ''}` };
          }
        } catch (e: any) {
          // لا شركة مهيأة أو فشل المسار — نكمل الشحن برقم داخلي مع توضيح
          const noProv = /provider/i.test(e?.message || '');
          result = { real: false, tracking: trk, provider: prov,
            apiError: noProv ? 'لا توجد شركة توصيل مفعّلة' : (e?.message || 'تعذر الاتصال'),
            steps: [{ label: 'إنشاء شحنة لدى شركة التوصيل', ok: false, error: noProv ? 'لا توجد شركة توصيل مفعّلة — أضف واحدة من صفحة التوصيل' : (e?.message || '') }] };
          shipMsg = { type: 'info', text: `🚚 شُحن الطلب برقم تتبع داخلي ${trk} — ${noProv ? 'لا توجد شركة توصيل مفعّلة (أضف واحدة من صفحة التوصيل)' : `تعذر إنشاء الشحنة لدى الشركة: ${e?.message || ''}`}` };
        }
      }
      // ── الخطوة ٢: «مشحون» تُقال حين يُشحَن ─────────────────────
      //   كان الطلبُ يُوسَم `shipped` في كلّ الحالات — حتّى حين يقول الخادمُ
      //   صراحةً إنّه لم يُرسِل. فيرى التاجرُ «مشحون» ولا شحنةَ عند الشركة.
      //   الآن: نجاحٌ حقيقيٌّ ⇒ مشحون. وما عداه يبقى على ما كتبه الخادمُ
      //   (`processing` + سببٌ ظاهر)، وحالتُه تُقرأ منه لا تُخمَّن هنا.
      if (result.real) {
        setState(s => ({ ...s, orders: s.orders.map(o => o.id === id ? { ...o, status: 'shipped' as OrderStatus, trackingNumber: trk, deliveryProvider: prov } : o) }));
        try {
          const updated = await api.ordersAPI.ship(id, { trackingNumber: trk, provider: prov });
          setState(s => ({ ...s, orders: s.orders.map(o => o.id === id ? updated : o) }));
        } catch (e: any) { notify('error', `⚠️ الشحن لم يُسجل على الخادم: ${e?.message || 'تحقق من الاتصال'}`); return; }
      } else {
        // نقرأ الطلبَ كما كتبه الخادمُ: `retry_scheduled` أو `manual_required`.
        try {
          const all = await api.ordersAPI.list();
          const fresh = Array.isArray(all) ? all.find((o: any) => o.id === id) : null;
          if (fresh) setState(s => ({ ...s, orders: s.orders.map(o => o.id === id ? fresh : o) }));
        } catch { /* العرضُ يبقى على ما هو، والرسالةُ قالت الحقيقة */ }
      }
    } else {
      setState(s => ({ ...s, orders: s.orders.map(o => o.id === id ? { ...o, status: 'shipped' as OrderStatus, trackingNumber: trk, deliveryProvider: prov } : o) }));
      shipMsg = { type: 'info', text: `🚚 شُحن محلياً (بدون اتصال) — تتبع: ${trk}` };
      result = { real: false, tracking: trk, provider: prov, apiError: 'بدون اتصال' };
    }

    notify(shipMsg.type, shipMsg.text || `🚚 تم الشحن — رقم التتبع: ${trk}`);
    try { Sounds.shipped(); } catch {}
    log('النظام', `شحن طلب: ${id}`, trk, 'delivery', 'success');
    result.tracking = trk; result.provider = prov;
    return result;
  };

  const deliverOrder = async (id: string) => {
    setState(s => ({ ...s, orders: s.orders.map(o => o.id === id ? { ...o, status: 'delivered' as OrderStatus } : o) }));
    if (state.isOnline && api.getToken()) {
      try { await api.ordersAPI.deliver(id); }
      catch (e: any) { notify('error', `⚠️ التوصيل لم يُسجل على الخادم: ${e?.message || 'تحقق من الاتصال'}`); return; }
    }
    notify('success', '📦 تم التوصيل بنجاح! 🎉');
    try { Sounds.delivered(); } catch {}
    log('النظام', `تم توصيل طلب: ${id}`, '', 'order', 'success');
  };

  // تحديث حالة الشحنة يدوياً من Livo (لا يوجد polling تلقائي بعد — طلبٌ صريح من التاجر فقط)
  const trackOrder = async (id: string) => {
    if (!(state.isOnline && api.getToken())) { notify('warning', '⚠️ تحديث الحالة يتطلّب اتصالاً بالإنترنت'); return; }
    try {
      const d = await api.deliveryAPI.track(id);
      setState(s => ({
        ...s,
        orders: s.orders.map(o => o.id === id
          ? { ...o, deliveryStatus: d.status || o.deliveryStatus, deliverySyncedAt: new Date().toISOString() }
          : o)
      }));
      notify('success', `🔄 حالة الشحنة الآن: ${d.status || 'بدون تحديث جديد'}`);
      log('النظام', `تحديث حالة شحنة: ${id}`, d.status || '', 'delivery', 'success');
    } catch (e: any) {
      notify('error', `⚠️ تعذّر تحديث الحالة: ${e?.message || 'تحقق من الاتصال'}`);
    }
  };

  // ── CONVERSATIONS + AI ────────────────────────────────────
  const sendMessage = async (convId: string, content: string, role: 'customer' | 'agent' | 'ai') => {
    const ts = new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    const msg: ConvMessage = { id: uid(), content, role: role as any, timestamp: ts };

    setState(s => ({
      ...s,
      conversations: s.conversations.map(c => c.id === convId
        ? { ...c, messages: [...(c.messages||[]), msg], lastMessage: content, unread: role === 'customer' ? (c.unread||0) + 1 : 0 }
        : c)
    }));

    // If online and customer message → call backend AI
    if (role === 'customer' && state.isOnline && api.getToken()) {
      try {
        await api.conversationsAPI.sendMessage(convId, { content, role: 'customer' });
        // AI reply will come via WebSocket from server
      } catch {
        // Fallback: local AI if backend fails
        _localAIReply(convId, content);
      }
    } else if (role === 'customer' && !state.isOnline) {
      _localAIReply(convId, content);
    }
  };

  // Local AI fallback — answers as if the merchant is talking
  const _localAIReply = (convId: string, userMsg: string) => {
    const conv = state.conversations.find(c => c.id === convId);
    if (!conv) return;
    const delay = (state.settings.ai.replyDelay || 2) * 1000;
    const lo = userMsg.toLowerCase();
    const products = state.products.filter(p => p.status === 'published' && p.stock > 0);
    const cur = state.settings.brand.currency || 'MAD';
    const storeName = state.settings.brand.name || 'متجرنا';
    const deliveryCost = state.settings.delivery?.defaultCost || '20-40';
    const deliveryTime = '24-48 ساعة';
    let reply = '';

    // Product search in message
    const found = products.filter(p =>
      p.name.toLowerCase().includes(lo) ||
      (p.description||'').toLowerCase().includes(lo) ||
      (p.category||'').toLowerCase().includes(lo) ||
      (p as any).sku?.toLowerCase().includes(lo)
    );

    if (found.length > 0 && /(عندكم|كاين|بغيت|سعر|ثمن|بكام|هاد|فين|وين)/i.test(lo)) {
      const p = found[0];
      const sizes = (p.sizes||[]).join(' · ') || '—';
      const colors = (p.colors||[]).join(' · ') || '—';
      reply = `آه كاين! 😊\n\n${p.emoji} *${p.name}*\n💰 ${p.price} ${cur}\n📏 المقاسات: ${sizes}\n🎨 الألوان: ${colors}\n📦 المخزون: ${p.stock} قطعة متوفرة\n\n${p.description ? p.description + '\n\n' : ''}واش بغيتيه؟ اعطيني اسمك وهاتفك نكمّلو الطلب! 👌`;
    } else if (found.length > 0) {
      const p = found[0];
      reply = `عندنا ${p.emoji} *${p.name}* بـ ${p.price} ${cur}. واش هاد اللي كتقلب عليه؟`;
    } else if (/(سلام|صباح|مساء|مرحبا|hello|هاي|آلو|labas|lbas)/i.test(lo)) {
      const hour = new Date().getHours();
      const greet = hour < 12 ? 'صباح النور' : hour < 18 ? 'مرحباً' : 'مساء النور';
      reply = `${greet}! 👋 أهلاً بك في ${storeName} 🏪\nعندنا ${products.length} منتج متوفر. واش بغيتي تشوف شي محدد؟`;
    } else if (/(ثمن|سعر|بكام|شحال|أسعار|prix|combien)/i.test(lo)) {
      if (products.length > 0) {
        const sample = products.slice(0, 3);
        const list = sample.map(p => `${p.emoji} ${p.name}: ${p.price} ${cur}`).join('\n');
        reply = `هاهي بعض الأسعار ديالنا:\n\n${list}\n\nواش بغيتي تعرف أكثر على منتج محدد؟`;
      } else {
        reply = `الأسعار ديالنا مناسبة جداً! راسلنا وغادي نعطيك كل التفاصيل 😊`;
      }
    } else if (/(توصيل|livraison|delivery|وين توصلو|كيفاش توصلو)/i.test(lo)) {
      reply = `التوصيل لجميع مدن المغرب 🇲🇦\n⏱️ ${deliveryTime}\n💰 ${deliveryCost} ${cur} حسب المدينة\nنبداو منذ تأكيد الطلب مباشرة 🚚\n\nواش بغيتي تطلب شي؟`;
    } else if (/(طلب|نطلب|بغيت نشري|شرا|commande|acheter)/i.test(lo)) {
      reply = `ممتاز! 🎉 باش نكملو الطلب محتاجين:\n1️⃣ الاسم الكامل\n2️⃣ رقم الهاتف 📱\n3️⃣ المدينة والعنوان 🏠\n4️⃣ المقاس واللون (إذا كاين)\n\nأبدأ بالاسم الكامل 😊`;
    } else if (/(غالي|خصم|discount|promo|cher|réduction|تخفيض)/i.test(lo)) {
      const max = state.settings.ai.maxDiscount || 15;
      const d = Math.round(max * 0.7);
      reply = state.settings.ai.autoDiscount
        ? `فاهمك! 😊 نقدر نعطيك خصم *${d}%* إذا طلبت أكثر من قطعة 🎁\nواش كاين شي منتج بغيتيه؟`
        : `الأثمان ديالنا مناسبة مقارنة بالجودة 💎 كلشي أصلي ومضمون!\nواش بغيتي تشوف شي محدد؟`;
    } else if (/(ضمان|مضمون|أصلي|garantie|original)/i.test(lo)) {
      reply = `آه، كلشي في ${storeName} مضمون 100% ✅\nعندنا ضمان على جميع المنتجات وإذا كان فيه مشكل نحلّو مع بعض 💪`;
    } else if (/(مخزون|متوفر|كاين|stock|disponible)/i.test(lo)) {
      const avail = products.length;
      reply = avail > 0
        ? `عندنا ${avail} منتج متوفر دابا! 📦\nواش بغيتي تشوف قائمة كاملة؟`
        : `ماعندناش منتجات متوفرة دابا، ولكن قريباً غادي يجيو. تابعنا! 🔜`;
    } else if (/(شكرا|merci|مرسي|بارك الله)/i.test(lo)) {
      reply = `وفيك البركة! 🙏 يسعدنا نخدمك في ${storeName}. واش كاين حاجة أخرى؟`;
    } else {
      const generics = [
        `فاهمت! 😊 واش عندك سؤال آخر على منتجاتنا أو التوصيل؟`,
        `أكيد! كيف نقدر نعاونك؟ 🤝`,
        `شكراً على تواصلك مع ${storeName}! واش بغيتي تشوف منتجاتنا؟ 🛍️`,
      ];
      reply = generics[Math.floor(Math.random() * generics.length)];
    }

    setTimeout(() => {
      const ts = new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
      const aiMsg: ConvMessage = { id: uid(), content: reply, role: 'ai', timestamp: ts };
      setState(s => ({
        ...s,
        conversations: s.conversations.map(c => c.id === convId
          ? { ...c, messages: [...(c.messages||[]), aiMsg], lastMessage: reply }
          : c)
      }));
    }, delay);
  };

  const addConversation = async (c: any) => {
    let conv: any;
    if (state.isOnline && api.getToken()) {
      try { conv = await api.conversationsAPI.create(c); } catch { conv = null; }
    }
    if (!conv) {
      conv = { ...c, id: 'conv-'+Date.now(), messages: [], unread: 0, createdAt: new Date().toISOString() };
    }
    setState(s => ({ ...s, conversations: [conv, ...s.conversations] }));
    return conv.id;
  };

  // ── **المحادثةُ تُحفَظ فعلًا، والفشلُ يُقال** ─────────────────────
  //
  //   عطبان قِيسا في جردِ المستودع، وكلاهما يقع على مستخدمٍ حقيقيٍّ في أوّل
  //   جلسة — وكلاهما **صامت**، وهو أسوأُ أنواع العطب:
  //
  //   ① `updateConversation` كانت تُبدّل الحالةَ المحلّيّةَ **ولا تنادي
  //      الخادمَ أصلًا**. و`conversationsAPI.update` مبنيّةٌ والمسارُ
  //      `PUT /conversations/:id` مبنيٌّ — طبقةٌ كاملةٌ لا يبلغها أحد. فمن
  //      أرشف محادثةً أو علّمها مقروءةً وجدها كما كانت بعد أوّل تحديث.
  //
  //   ② `deleteConversation` تنادي الخادمَ ثمّ تبتلع فشلَه في `catch {}`
  //      فارغ. تختفي المحادثةُ من الشاشة، ويفشل الحذفُ، وتعود عند التحديث.
  //
  //   والأثرُ الإنسانيُّ واحدٌ في الحالتَين: **الإنسانُ يظنّ التطبيقَ كاذبًا.**
  //   ولا يبحث عن سببٍ ولا يبلّغ عن عطب — يكفّ عن الثقة ويخرج.
  //
  //   ── والعلاجُ نمطٌ قائمٌ في هذا الملفّ لا اختراعٌ جديد ──
  //   المنتجاتُ والزبناءُ يفعلونه منذ زمن: تفاؤلٌ في الشاشة · نداءٌ للخادم ·
  //   **رجوعٌ عن التفاؤل إن فشل** · ورسالةٌ تقول ما جرى. والمحادثاتُ وحدَها
  //   كانت خارجه.
  const updateConversation = async (id: string, u: Partial<Conversation>) => {
    const before = state.conversations.find(c => c.id === id);
    setState(s => ({ ...s, conversations: s.conversations.map(c => c.id === id ? { ...c, ...u } : c) }));
    if (!state.isOnline || !api.getToken()) return;
    try { await api.conversationsAPI.update(id, u); }
    catch (e: any) {
      // الرجوعُ شرطُ الصدق: رسالةُ خطأٍ فوق شاشةٍ تعرض التغييرَ محفوظًا
      //   تناقضُ نفسِها، ويصدّق الإنسانُ عينَه لا الرسالة.
      if (before) setState(s => ({ ...s, conversations: s.conversations.map(c => c.id === id ? before : c) }));
      notify('error', `❌ لم يُحفظ التعديل على المحادثة: ${e?.message || 'تحقق من الاتصال'}`);
    }
  };

  const deleteConversation = async (id: string) => {
    const before = state.conversations;
    setState(s => ({ ...s, conversations: s.conversations.filter(c => c.id !== id) }));
    if (!state.isOnline || !api.getToken()) return;
    try { await api.conversationsAPI.remove(id); }
    catch (e: any) {
      setState(s => ({ ...s, conversations: before }));
      notify('error', `❌ لم تُحذف المحادثة من الخادم: ${e?.message || 'تحقق من الاتصال'}`);
    }
  };

  // ── TEMPLATES ────────────────────────────────────────────
  const addTemplate = async (t: any) => {
    setState(s => ({ ...s, settings: { ...s.settings, templates: [{ ...t, id: 'T'+uid(), usageCount: 0 }, ...s.settings.templates] } }));
  };
  const updateTemplate = async (id: string, u: Partial<Template>) => {
    setState(s => ({ ...s, settings: { ...s.settings, templates: s.settings.templates.map(t => t.id === id ? { ...t, ...u } : t) } }));
  };
  const deleteTemplate = async (id: string) => {
    setState(s => ({ ...s, settings: { ...s.settings, templates: s.settings.templates.filter(t => t.id !== id) } }));
  };

  // ── SYSTEM ───────────────────────────────────────────────
  const setPage = (p: Page) => setState(s => ({ ...s, currentPage: p }));
  const setSidebarOpen = (v: boolean) => setState(s => ({ ...s, sidebarOpen: v }));
  const clearNotifications = () => setState(s => ({ ...s, notifications: [] }));
  const markNotifRead = (id: string) => setState(s => ({ ...s, notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) }));

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ products: state.products, orders: state.orders, customers: state.customers, settings: state.settings }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importData = (json: string) => {
    const result = validateImport(json);

    if (!result.ok || !result.data) {
      const summary = result.errors?.slice(0, 3).join(' | ') ?? 'خطأ غير معروف';
      notify('error', `❌ فشل الاستيراد: ${summary}`);
      return result;
    }

    const { data: data0, stats } = result;
    const data: any = data0; // import payload (runtime-validated by validateImport)

    // Fusion sécurisée : uniquement les clés validées, jamais token/user/etc.
    setState(s => ({
      ...s,
      ...(data.products  ? { products:  data.products  } : {}),
      ...(data.orders    ? { orders:    data.orders    } : {}),
      ...(data.customers ? { customers: data.customers } : {}),
      ...(data.settings  ? {
        settings: {
          ...s.settings,
          ...(data.settings.brand    ? { brand:    { ...s.settings.brand,    ...data.settings.brand    } } : {}),
          ...(data.settings.products ? { products: { ...s.settings.products, ...data.settings.products } } : {}),
          ...(data.settings.goals    ? { goals:    { ...s.settings.goals,    ...data.settings.goals    } } : {}),
        },
      } : {}),
    }));

    const msg = [
      (stats!.products  > 0) ? `${stats!.products} منتج`  : '',
      (stats!.orders    > 0) ? `${stats!.orders} طلب`     : '',
      (stats!.customers > 0) ? `${stats!.customers} زبون` : '',
    ].filter(Boolean).join(' · ');

    notify('success', `✅ تم الاستيراد — ${msg || 'الإعدادات'}`);
    log('المدير', 'استيراد بيانات', msg || 'إعدادات فقط', 'settings', 'success');

    return result;
  };

  const resetToDemo = () => {
    setState(s => ({ ...s, products: seedProducts, orders: seedOrders, conversations: seedConversations, customers: seedCustomers }));
  };

  // ── شركات التوصيل — الخادمُ هو المصدر، والحالةُ هنا مرآةٌ له ────────────────
  // كلّ كتابةٍ تمرّ بالخادم أوّلًا ثم تُعاد القائمةُ منه؛ لا نُحدِّث محلّيًّا ثم
  // «نأمل» أن يتوافق الطرفان — ذاك بالضبط ما أنتج الانقسامَ السابق.
  const saveDeliveryProvider = async (p: Partial<DeliveryProviderConfig>): Promise<DeliveryProviderConfig[]> => {
    const r = await api.deliveryAPI.save(p);
    const list = (r?.providers ?? []) as DeliveryProviderConfig[];
    setState(s => ({ ...s, deliveryProviders: list }));
    return list;
  };

  // الخادمُ قد يُصحّح صفًّا من تلقاء نفسه (تعريفُ المزوّد من نطاقه مثلًا)،
  // فالواجهةُ تحتاج قراءةً جديدةً بلا كتابة.
  const refreshDeliveryProviders = async (): Promise<DeliveryProviderConfig[]> => {
    const list = await api.deliveryAPI.list() as DeliveryProviderConfig[];
    setState(s => ({ ...s, deliveryProviders: list }));
    return list;
  };

  const removeDeliveryProvider = async (id: string): Promise<void> => {
    await api.deliveryAPI.remove(id);
    const list = await api.deliveryAPI.list() as DeliveryProviderConfig[];
    setState(s => ({ ...s, deliveryProviders: list }));
  };

  return (
    <StoreCtx.Provider value={{
      ...state, login, register, logout, setPage, setSidebarOpen, updateSettings,
      addProduct, updateProduct, deleteProduct, adjustStock,
      addCustomer, updateCustomer, deleteCustomer,
      addOrder, updateOrder, approveOrder, rejectOrder, shipOrder, deliverOrder, trackOrder,
      sendMessage, addConversation, updateConversation,
      addTemplate, updateTemplate, deleteTemplate,
      notify, clearNotifications, markNotifRead, log,
      resetToDemo, exportData, importData, refreshData,
      deleteConversation, setOnboardingCompleted,
      saveDeliveryProvider, refreshDeliveryProviders, removeDeliveryProvider,
    }}>
      {children}
    </StoreCtx.Provider>
  );
}

export const useStore = () => {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('useStore must be inside StoreProvider');
  return c;
};

export function useRole() {
  const { currentRole } = useStore();
  return {
    role: currentRole,
    can: (perm: string) => {
      const perms: Record<string, string[]> = {
        admin: ['*'],
        seller: ['view_dashboard','manage_products','view_orders','update_order_status','view_customers','view_conversations','view_analytics'],
        support: ['view_dashboard','view_orders','update_order_status','view_customers','manage_conversations'],
        delivery: ['view_dashboard','view_orders','update_order_status'],
      };
      const p = perms[currentRole] || [];
      return p.includes('*') || p.includes(perm);
    },
    isAdmin: currentRole === 'admin',
  };
}
