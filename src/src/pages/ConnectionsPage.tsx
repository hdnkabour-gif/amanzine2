import { useState, useCallback, useEffect } from 'react';
import { getToken as getAuthToken } from '../services/api';
import { useStore } from '../store';
import { Wifi, CheckCircle, Loader2, Eye, EyeOff, AlertTriangle, ExternalLink, RefreshCw, Zap } from 'lucide-react';
import { IconWhatsApp, IconFacebook, IconInstagram, IconTikTok } from '../components/icons';

// What each connection enables throughout the app
const ENABLES: Record<string, string[]> = {
  whatsapp: ['إشعار تأكيد الطلب للزبون', 'إشعار الشحن تلقائياً', 'رسائل تسويقية', 'ربط المحادثات'],
  facebook: ['نشر المنتجات على الصفحة', 'نشر العروض والمحتوى', 'متابعة التعليقات'],
  instagram: ['نشر الصور والستوري', 'Reels تلقائي', 'رسائل Instagram Direct'],
  openai: ['ردود AI حقيقية على الزبائن', 'توليد أوصاف المنتجات', 'هاشتاق AI', 'تصميم صور بـ DALL-E 3'],
  gemini: ['ردود AI مجانية على الزبائن', 'توليد أوصاف المنتجات', 'هاشتاق AI', 'مجاني 15 طلب/دقيقة'],
  claude: ['تحليل عميق ومحادثات راقية', 'كتابة أوصاف وسياسات المتجر', 'تلخيص المحادثات الطويلة', 'بديل تلقائي عند فشل غيره'],
  deepseek: ['الأفضل للعربية والدارجة', 'رخيص جداً (أقل من سنت للمحادثة)', 'ردود سريعة على الزبائن', 'بديل تلقائي'],
  grok: ['ردود ذكية على الزبائن', 'تحليل مشاعر واتجاهات', 'بديل تلقائي عند فشل غيره'],
  mistral: ['بديل احتياطي أوروبي', 'ردود سريعة', 'خطة مجانية محدودة للتجربة'],
  brevo: ['إيميل فوري لك مع كل طلب جديد', 'إيميل تأكيد تلقائي للزبون', '300 إيميل يومياً مجاناً'],
  hcaptcha: ['حماية نموذج الطلب من البوتات', 'تحقق إجباري قبل كل طلب', 'مليون تحقق شهرياً مجاناً'],
  tiktok: ['إعلانات TikTok', 'نشر الفيديوهات'],
  supabase: ['نسخ احتياطي تلقائي', 'مزامنة البيانات السحابية', 'حماية ضد فقدان البيانات'],
  cloudinary: ['رفع الصور تلقائياً', 'CDN عالمي سريع', 'لا تفقد صورك عند التحديث'],
};

// شرح مبسط بلغة غير تقنية: ما هذه الخدمة؟ وما هو "المفتاح" المطلوب؟
const WHAT_IS: Record<string, string> = {
  whatsapp: 'المفتاح هنا هو "رمز سري" تحصل عليه مجاناً من فيسبوك (Meta) يسمح للتطبيق بإرسال رسائل واتساب من رقمك التجاري تلقائياً. تحتاج حساب فيسبوك فقط — اتبع الخطوات بالأسفل وستحصل عليه في حوالي 10 دقائق.',
  facebook: 'رمز يسمح للتطبيق بالنشر على صفحتك في فيسبوك نيابة عنك. تحصل عليه من موقع فيسبوك للمطورين بحسابك العادي — بدون أي تكلفة.',
  instagram: 'نفس فكرة فيسبوك: رمز يسمح بالنشر على حساب Instagram التجاري. شرطه الوحيد أن يكون حسابك Instagram مربوطاً بصفحة فيسبوك.',
  openai: 'OpenAI هي الشركة صاحبة ChatGPT. "المفتاح" هو رمز يبدأ بـ sk- تشتريه من موقعهم (يحتاج بطاقة بنكية) ليرد الذكاء الاصطناعي على زبائنك ويكتب أوصاف منتجاتك.',
  gemini: 'الخيار الأسهل والمجاني 100% للبدء! Gemini هو الذكاء الاصطناعي من Google. تدخل الموقع بحساب Google العادي وتضغط زراً واحداً وتنسخ المفتاح — دقيقتان فقط وبدون بطاقة بنكية.',
  claude: 'Claude هو الذكاء الاصطناعي من شركة Anthropic — الأقوى في التحليل العميق والكتابة الراقية وفهم نوايا الزبائن. المفتاح رمز يبدأ بـ sk-ant- من موقعهم (يحتاج بطاقة بنكية، لكن نموذج Haiku رخيص جداً للمحادثات اليومية).',
  deepseek: 'DeepSeek ذكاء اصطناعي صيني ممتاز جداً في العربية والدارجة المغربية وبسعر رمزي (أرخص الجميع). سجل في موقعهم وأنشئ مفتاحاً — تكلفة 1000 محادثة أقل من دولار.',
  grok: 'Grok هو الذكاء الاصطناعي من شركة xAI (إيلون ماسك). جيد في التحليل والمحادثة. مدفوع حسب الاستخدام — راجع أسعارهم في console.x.ai قبل الربط (لا توجد خطة مجانية دائمة).',
  mistral: 'Mistral شركة فرنسية بنماذج سريعة وبخطة تجريبية مجانية محدودة. مفيد كبديل احتياطي يتدخل تلقائياً عند فشل مزودك الأساسي.',
  brevo: 'Brevo منصة إيميلات مجانية (300 يومياً). بعد الربط: يصلك إيميل تلقائي مع كل طلب جديد، والزبون الذي يترك بريده يستلم تأكيداً أنيقاً بطلبه وكود التتبع — كل ذلك تلقائياً.',
  hcaptcha: 'hCaptcha مربع "أنا لست روبوتاً" يظهر للزبون قبل تأكيد الطلب، فيمنع الطلبات الوهمية الآلية. مجاني حتى مليون تحقق شهرياً. تحتاج مفتاحين من لوحتهم: مفتاح الموقع (عام) والمفتاح السري.',
  tiktok: 'رمز من منصة إعلانات TikTok يسمح بنشر الفيديوهات وإدارة الإعلانات. مخصص لمن لديه حساب TikTok Ads — يمكنك تجاهله إن لم تعلن هناك.',
  supabase: 'قاعدة بيانات سحابية مجانية تحفظ نسخة احتياطية من بياناتك على الإنترنت. التسجيل مجاني بحساب Google أو GitHub.',
  cloudinary: 'خدمة مجانية لتخزين صور منتجاتك على الإنترنت بسرعة عالية، حتى لا تضيع الصور عند تحديث التطبيق. التسجيل مجاني.',
};

// ترشيح للمبتدئين: ما الذي يجب البدء به؟
const EASY_IDS = new Set(['gemini', 'cloudinary']);

const SERVICES = [
  {
    id: 'whatsapp', name: 'WhatsApp Business', Icon: IconWhatsApp, grad: 'linear-gradient(135deg,#25d366,#128C7E)', desc: 'استقبال وإرسال الرسائل تلقائياً',
    fields: [
      { key: 'phoneId', label: 'Phone Number ID', ph: '123456789012345', help: 'Meta for Developers → WhatsApp → Configuration' },
      { key: 'accessToken', label: 'Access Token', ph: 'EAAxxxxxxx...', help: 'Token الوصول الدائم من Meta Business Manager', secret: true },
    ],
    guide: ['اذهب لـ developers.facebook.com', 'أنشئ App من نوع Business', 'فعّل WhatsApp من المنتجات', 'انسخ Phone Number ID و Access Token'],
    url: 'https://business.whatsapp.com/products/business-platform',
  },
  {
    id: 'facebook', name: 'Facebook Page', Icon: IconFacebook, grad: 'linear-gradient(135deg,#1877f2,#0a4fa8)', desc: 'نشر المنتجات والرد على التعليقات',
    fields: [
      { key: 'pageId', label: 'Page ID', ph: '123456789', help: 'معرّف صفحتك من إعدادات الصفحة' },
      { key: 'accessToken', label: 'Page Access Token', ph: 'EAAxxxxxxx...', help: 'من Graph API Explorer باختيار الصفحة', secret: true },
    ],
    guide: ['اذهب لـ Graph API Explorer', 'اختر تطبيقك', 'اختر صفحتك', 'انسخ Page Access Token'],
    url: 'https://developers.facebook.com/tools/explorer',
  },
  {
    id: 'instagram', name: 'Instagram Business', Icon: IconInstagram, grad: 'linear-gradient(135deg,#e1306c,#833ab4)', desc: 'نشر Stories & Reels والرسائل المباشرة',
    fields: [
      { key: 'pageId', label: 'Instagram Account ID', ph: '17841400000000000', help: 'معرّف حساب Instagram Business' },
      { key: 'accessToken', label: 'Access Token', ph: 'EAAxxxxxxx...', help: 'نفس Token ديال Facebook', secret: true },
    ],
    guide: ['اربط Instagram بصفحة Facebook', 'اطلب Instagram Graph API', 'احصل على Account ID', 'نفس Token ديال Facebook'],
    url: 'https://developers.facebook.com/docs/instagram-api',
  },
  {
    id: 'openai', name: 'OpenAI (GPT)', icon: '🧠', grad: 'linear-gradient(135deg,#10b981,#059669)', desc: 'ردود ذكية حقيقية بدون محاكاة',
    fields: [
      { key: 'apiKey', label: 'API Key', ph: 'sk-proj-...', help: 'من platform.openai.com/api-keys', secret: true },
    ],
    guide: ['سجل على platform.openai.com', 'اذهب لـ API Keys', 'أنشئ مفتاحاً جديداً', 'انسخه هنا'],
    url: 'https://platform.openai.com/api-keys',
  },
  {
    id: 'gemini', name: 'Google Gemini (مجاني)', icon: '🤖', grad: 'linear-gradient(135deg,#4285f4,#ea4335)', desc: 'بديل مجاني — 15 طلب/دقيقة',
    fields: [
      { key: 'geminiKey', label: 'Gemini API Key', ph: 'AIzaSy...', help: 'من aistudio.google.com/app/apikey', secret: true },
    ],
    guide: ['اذهب لـ aistudio.google.com', 'سجل بحساب Google', 'اضغط Get API Key', 'انسخه هنا'],
    url: 'https://aistudio.google.com/app/apikey',
  },
  {
    id: 'claude', name: 'Claude (Anthropic)', icon: '🧠', grad: 'linear-gradient(135deg,#D97757,#8B4513)', desc: 'الأقوى في التحليل العميق والكتابة — أمان عالٍ',
    fields: [
      { key: 'claudeKey', label: 'API Key', ph: 'sk-ant-...', help: 'من console.anthropic.com → API Keys', secret: true },
    ],
    guide: ['سجل على console.anthropic.com', 'اذهب لـ Settings → API Keys', 'اضغط Create Key وانسخه', 'الصقه هنا — يُستخدم نموذج Haiku الاقتصادي تلقائياً'],
    url: 'https://console.anthropic.com/settings/keys',
  },
  {
    id: 'deepseek', name: 'DeepSeek (الأفضل للدارجة)', icon: '🔮', grad: 'linear-gradient(135deg,#4D6BFE,#1a2c8f)', desc: 'عربي ودارجة ممتازة — أرخص الجميع',
    fields: [
      { key: 'deepseekKey', label: 'API Key', ph: 'sk-...', help: 'من platform.deepseek.com/api_keys', secret: true },
    ],
    guide: ['سجل على platform.deepseek.com', 'اذهب لـ API Keys', 'أنشئ مفتاحاً جديداً', 'انسخه هنا'],
    url: 'https://platform.deepseek.com/api_keys',
  },
  {
    id: 'grok', name: 'Grok (xAI)', icon: '🚀', grad: 'linear-gradient(135deg,#1a1a1a,#444)', desc: 'تحليل ومحادثة — مدفوع حسب الاستخدام',
    fields: [
      { key: 'grokKey', label: 'API Key', ph: 'xai-...', help: 'من console.x.ai → API Keys', secret: true },
    ],
    guide: ['اذهب لـ console.x.ai', 'سجل بحساب X', 'اذهب لـ API Keys وأنشئ مفتاحاً', 'انسخه هنا'],
    url: 'https://console.x.ai',
  },
  {
    id: 'mistral', name: 'Mistral AI', icon: '🌬️', grad: 'linear-gradient(135deg,#F59E0B,#FBBF24)', desc: 'بديل احتياطي أوروبي — خطة تجريبية مجانية',
    fields: [
      { key: 'mistralKey', label: 'API Key', ph: '...', help: 'من console.mistral.ai/api-keys', secret: true },
    ],
    guide: ['اذهب لـ console.mistral.ai', 'سجل بحسابك', 'اذهب لـ API Keys وأنشئ مفتاحاً', 'انسخه هنا'],
    url: 'https://console.mistral.ai/api-keys',
  },
  {
    id: 'brevo', name: 'Brevo (إيميلات الطلبات)', icon: '📧', grad: 'linear-gradient(135deg,#0EA5E9,#38BDF8)', desc: 'إيميل لك ولزبونك مع كل طلب — 300/يوم مجاناً',
    fields: [
      { key: 'brevoApiKey', label: 'API Key', ph: 'xkeysib-...', help: 'من app.brevo.com → Settings → API Keys', secret: true },
    ],
    guide: ['سجل مجاناً على brevo.com', 'اذهب لـ Settings → SMTP & API → API Keys', 'أنشئ مفتاحاً وانسخه هنا'],
    url: 'https://app.brevo.com/settings/keys/api',
  },
  {
    id: 'hcaptcha', name: 'hCaptcha (حماية الطلبات)', icon: '🛡️', grad: 'linear-gradient(135deg,#8B5CF6,#A78BFA)', desc: 'يمنع الطلبات الوهمية الآلية — مجاني',
    fields: [
      { key: 'hcaptchaSiteKey', label: 'Site Key (عام)', ph: '10000000-ffff-...', help: 'من dashboard.hcaptcha.com — يظهر للزبون' },
      { key: 'hcaptchaSecret', label: 'Secret Key (سري)', ph: '0x...', help: 'يبقى في الخادم فقط', secret: true },
    ],
    guide: ['سجل على hcaptcha.com', 'أضف موقعك (نطاق متجرك)', 'انسخ Site Key من صفحة الموقع', 'انسخ Secret Key من Settings'],
    url: 'https://dashboard.hcaptcha.com',
  },
  {
    id: 'tiktok', name: 'TikTok for Business', Icon: IconTikTok, grad: 'linear-gradient(135deg,#000000,#25f4ee)', desc: 'نشر الفيديوهات وإدارة الإعلانات',
    fields: [
      { key: 'accessToken', label: 'Access Token', ph: 'act_xxxxx...', help: 'من TikTok Ads Manager', secret: true },
      { key: 'advertiserId', label: 'Advertiser ID', ph: '123456789', help: 'معرّف المعلن' },
    ],
    guide: ['اذهب لـ ads.tiktok.com', 'أنشئ حساب Ads Manager', 'اذهب إلى Tools > API', 'أنشئ Access Token'],
    url: 'https://ads.tiktok.com',
  },
  {
    id: 'supabase', name: 'Supabase', icon: '⚡', grad: 'linear-gradient(135deg,#3ecf8e,#1a7a4c)', desc: 'قاعدة بيانات سحابية — نسخة احتياطية تلقائية',
    fields: [
      { key: 'supabaseUrl', label: 'Project URL', ph: 'https://xxxx.supabase.co', help: 'من Settings → API في مشروعك', direct: true },
      { key: 'supabaseKey', label: 'Anon Key', ph: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', help: 'المفتاح العام (anon/public)', secret: true, direct: true },
    ],
    guide: ['اذهب لـ supabase.com وأنشئ مشروعاً', 'اذهب لـ Settings → API', 'انسخ Project URL', 'انسخ anon public key'],
    url: 'https://supabase.com',
  },
  {
    id: 'cloudinary', name: 'Cloudinary', icon: '☁️', grad: 'linear-gradient(135deg,#3448c5,#6875f5)', desc: 'رفع وتخزين الصور تلقائياً — CDN عالمي',
    fields: [
      { key: 'cloudinaryCloudName', label: 'Cloud Name', ph: 'my-store', help: 'من Dashboard → Cloud Name', direct: true },
      { key: 'cloudinaryApiKey', label: 'API Key', ph: '123456789012345', help: 'من Settings → Access Keys', direct: true },
      { key: 'cloudinaryApiSecret', label: 'API Secret', ph: 'xxxxxxxxxxxxxxxxxxxxxxxx', help: 'من Settings → Access Keys', secret: true, direct: true },
    ],
    guide: ['سجل على cloudinary.com', 'اذهب لـ Dashboard', 'انسخ Cloud Name', 'من Settings → Access Keys انسخ API Key و Secret'],
    url: 'https://cloudinary.com',
  },
];

export default function ConnectionsPage() {
  const { settings, updateSettings, notify } = useStore();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; info?: string } | null>>({});
  const [testingAll, setTestingAll] = useState(false);
  const [serverConfig, setServerConfig] = useState<Record<string, boolean>>({});
  const [waTestPhone, setWaTestPhone] = useState('');
  const [waTestLoading, setWaTestLoading] = useState(false);

  useEffect(() => {
    const token = getAuthToken() || '';
    fetch('/api/settings/server-config', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setServerConfig(d))
      .catch(() => {});
  }, []);

  const stored = (id: string, key: string): string => {
    if (id === 'openai') return settings.ai.apiKey || '';
    if (id === 'gemini') return settings.ai.geminiKey || '';
    if (id === 'claude') return settings.ai.claudeKey || '';
    if (id === 'deepseek') return settings.ai.deepseekKey || '';
    if (id === 'grok') return settings.ai.grokKey || '';
    if (id === 'mistral') return settings.ai.mistralKey || '';
    if (id === 'brevo') return (settings as any).marketing?.brevoApiKey || '';
    if (id === 'hcaptcha') return (settings.security as any)?.[key] || '';
    if (id === 'supabase') return (settings as any)[key] || '';
    if (id === 'cloudinary') return (settings as any)[key] || '';
    const s = settings.social[id as keyof typeof settings.social];
    return !s ? '' : key === 'pageId' || key === 'phoneId' ? (s.pageId || '') : key === 'advertiserId' ? ((s as any).advertiserId || '') : (s.accessToken || '');
  };

  const val = (id: string, k: string) => values[id]?.[k] ?? stored(id, k);
  const setVal = (id: string, k: string, v: string) => setValues(p => ({ ...p, [id]: { ...(p[id] || {}), [k]: v } }));

  const isConnected = (id: string) => {
    if (id === 'openai') return !!settings.ai.apiKey;
    if (id === 'gemini') return !!settings.ai.geminiKey;
    if (id === 'claude') return !!settings.ai.claudeKey;
    if (id === 'deepseek') return !!settings.ai.deepseekKey;
    if (id === 'grok') return !!settings.ai.grokKey;
    if (id === 'mistral') return !!settings.ai.mistralKey;
    if (id === 'brevo') return !!(settings as any).marketing?.brevoApiKey;
    if (id === 'hcaptcha') return !!(settings.security as any)?.hcaptchaSiteKey && !!(settings.security as any)?.hcaptchaSecret;
    if (id === 'supabase') return !!(settings as any).supabaseUrl && !!(settings as any).supabaseKey;
    if (id === 'cloudinary') return !!(settings as any).cloudinaryCloudName && !!(settings as any).cloudinaryApiKey;
    if (id === 'whatsapp') return !!(settings.social?.whatsapp?.connected);
    return settings.social[id as keyof typeof settings.social]?.connected || false;
  };

  const isServerManaged = (id: string) => {
    if (id === 'openai') return !!serverConfig.openai && !settings.ai.apiKey;
    if (id === 'gemini') return !!serverConfig.gemini && !settings.ai.geminiKey;
    if (id === 'claude') return !!serverConfig.claude && !settings.ai.claudeKey;
    if (id === 'deepseek') return !!serverConfig.deepseek && !settings.ai.deepseekKey;
    if (id === 'grok') return !!serverConfig.grok && !settings.ai.grokKey;
    if (id === 'mistral') return !!serverConfig.mistral && !settings.ai.mistralKey;
    if (id === 'supabase') return !!serverConfig.supabase && !(settings as any).supabaseUrl;
    if (id === 'cloudinary') return !!serverConfig.cloudinary && !(settings as any).cloudinaryCloudName;
    if (id === 'whatsapp') return !!serverConfig.whatsapp && !settings.social?.whatsapp?.connected;
    return false;
  };

  const getToken = () => getAuthToken() || '';

  const connect = useCallback(async (svc: typeof SERVICES[0]) => {
    const allFilled = svc.fields.every(f => val(svc.id, f.key).trim());
    if (!allFilled) { notify('error', 'يرجى ملء جميع الحقول'); return; }
    setLoading(p => ({ ...p, [svc.id]: true }));
    let ok = false;
    try {
      if (svc.id === 'openai') {
        const r = await fetch('/api/settings/verify-connection', {
          method: 'POST', signal: AbortSignal.timeout(12000),
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
          body: JSON.stringify({ service: 'openai', apiKey: val('openai', 'apiKey') }),
        });
        const d = await r.json();
        ok = d.ok;
        if (ok) { updateSettings('ai', { ...settings.ai, apiKey: val('openai', 'apiKey'), provider: 'openai' }); notify('success', `✅ OpenAI متصل! ${d.info || ''}`); }
        else notify('error', `❌ مفتاح OpenAI غير صحيح: ${d.error}`);

      } else if (svc.id === 'gemini') {
        const r = await fetch('/api/settings/verify-connection', {
          method: 'POST', signal: AbortSignal.timeout(12000),
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
          body: JSON.stringify({ service: 'gemini', apiKey: val('gemini', 'geminiKey') }),
        });
        const d = await r.json();
        ok = d.ok;
        if (ok) { updateSettings('ai', { ...settings.ai, geminiKey: val('gemini', 'geminiKey'), provider: 'gemini' }); notify('success', `✅ Gemini متصل! ${d.info || ''}`); }
        else notify('error', `❌ مفتاح Gemini غير صحيح: ${d.error}`);

      } else if (svc.id === 'claude') {
        const r = await fetch('/api/settings/verify-connection', {
          method: 'POST', signal: AbortSignal.timeout(12000),
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
          body: JSON.stringify({ service: 'claude', apiKey: val('claude', 'claudeKey') }),
        });
        const d = await r.json();
        ok = d.ok;
        if (ok) { updateSettings('ai', { ...settings.ai, claudeKey: val('claude', 'claudeKey'), claudeModel: settings.ai.claudeModel || 'claude-haiku-4-5' }); notify('success', `✅ Claude متصل! ${d.info || ''}`); }
        else notify('error', `❌ مفتاح Claude غير صحيح: ${d.error}`);

      } else if (svc.id === 'deepseek') {
        const r = await fetch('/api/settings/verify-connection', {
          method: 'POST', signal: AbortSignal.timeout(12000),
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
          body: JSON.stringify({ service: 'deepseek', apiKey: val('deepseek', 'deepseekKey') }),
        });
        const d = await r.json();
        ok = d.ok;
        if (ok) { updateSettings('ai', { ...settings.ai, deepseekKey: val('deepseek', 'deepseekKey') }); notify('success', `✅ DeepSeek متصل! ${d.info || ''}`); }
        else notify('error', `❌ مفتاح DeepSeek غير صحيح: ${d.error}`);

      } else if (svc.id === 'grok') {
        const r = await fetch('/api/settings/verify-connection', {
          method: 'POST', signal: AbortSignal.timeout(12000),
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
          body: JSON.stringify({ service: 'grok', apiKey: val('grok', 'grokKey') }),
        });
        const d = await r.json();
        ok = d.ok;
        if (ok) { updateSettings('ai', { ...settings.ai, grokKey: val('grok', 'grokKey') }); notify('success', `✅ Grok متصل! ${d.info || ''}`); }
        else notify('error', `❌ مفتاح Grok غير صحيح: ${d.error}`);

      } else if (svc.id === 'mistral') {
        const r = await fetch('/api/settings/verify-connection', {
          method: 'POST', signal: AbortSignal.timeout(12000),
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
          body: JSON.stringify({ service: 'mistral', apiKey: val('mistral', 'mistralKey') }),
        });
        const d = await r.json();
        ok = d.ok;
        if (ok) { updateSettings('ai', { ...settings.ai, mistralKey: val('mistral', 'mistralKey') }); notify('success', `✅ Mistral متصل! ${d.info || ''}`); }
        else notify('error', `❌ مفتاح Mistral غير صحيح: ${d.error}`);

      } else if (svc.id === 'brevo') {
        const r = await fetch('/api/settings/verify-connection', {
          method: 'POST', signal: AbortSignal.timeout(12000),
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
          body: JSON.stringify({ service: 'brevo', apiKey: val('brevo', 'brevoApiKey') }),
        });
        const d = await r.json();
        ok = d.ok;
        if (ok) { updateSettings('marketing' as any, { brevoApiKey: val('brevo', 'brevoApiKey') }); notify('success', `✅ Brevo متصل! ${d.info || ''} — ستصلك إيميلات الطلبات تلقائياً`); }
        else notify('error', `❌ مفتاح Brevo غير صحيح: ${d.error}`);

      } else if (svc.id === 'hcaptcha') {
        const r = await fetch('/api/settings/verify-connection', {
          method: 'POST', signal: AbortSignal.timeout(12000),
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
          body: JSON.stringify({ service: 'hcaptcha', secretKey: val('hcaptcha', 'hcaptchaSecret') }),
        });
        const d = await r.json();
        ok = d.ok;
        if (ok) { updateSettings('security', { ...settings.security, hcaptchaSiteKey: val('hcaptcha', 'hcaptchaSiteKey'), hcaptchaSecret: val('hcaptcha', 'hcaptchaSecret') } as any); notify('success', '✅ hCaptcha مفعّل! سيظهر التحقق للزبائن في صفحة الدفع'); }
        else notify('error', `❌ ${d.error || 'المفتاح السري غير صحيح'}`);

      } else if (svc.id === 'supabase') {
        const url = val('supabase', 'supabaseUrl');
        const key = val('supabase', 'supabaseKey');
        try {
          const r = await fetch(`${url}/rest/v1/`, { headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
          ok = r.status < 400;
        } catch { ok = false; }
        if (ok) {
          updateSettings('supabaseUrl' as any, url);
          updateSettings('supabaseKey' as any, key);
          updateSettings('cloudEnabled' as any, true);
          notify('success', '✅ Supabase متصل!');
        } else notify('error', '❌ URL أو Key غير صحيح');

      } else if (svc.id === 'cloudinary') {
        const cn = val('cloudinary', 'cloudinaryCloudName');
        const ak = val('cloudinary', 'cloudinaryApiKey');
        const as_ = val('cloudinary', 'cloudinaryApiSecret');
        try {
          const r = await fetch(`/api/settings/verify-connection`, {
            method: 'POST', signal: AbortSignal.timeout(10000),
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify({ service: 'cloudinary', cloudName: cn, apiKey: ak, apiSecret: as_ }),
          });
          const d = await r.json();
          ok = d.ok;
        } catch { ok = false; }
        if (ok) {
          updateSettings('cloudinaryCloudName' as any, cn);
          updateSettings('cloudinaryApiKey' as any, ak);
          updateSettings('cloudinaryApiSecret' as any, as_);
          notify('success', '✅ Cloudinary متصل!');
        } else notify('error', '❌ بيانات Cloudinary غير صحيحة');

      } else {
        const token2 = val(svc.id, 'accessToken');
        const pageId = val(svc.id, 'pageId') || val(svc.id, 'phoneId') || '';
        const r = await fetch('/api/settings/verify-connection', {
          method: 'POST', signal: AbortSignal.timeout(12000),
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
          body: JSON.stringify({ service: svc.id, token: token2, pageId }),
        });
        const d = await r.json();
        ok = d.ok;
        if (ok) {
          updateSettings('social', { ...settings.social, [svc.id]: { ...settings.social[svc.id as keyof typeof settings.social], connected: true, pageId, accessToken: token2, name: d.name || svc.name } });
          notify('success', `✅ ${svc.name} متصل${d.name ? ` — ${d.name}` : ''}!`);
        } else {
          notify('error', `❌ ${svc.name}: ${d.error || 'Token غير صحيح'}`);
        }
      }
    } catch (e: any) { notify('error', `❌ ${e.message || 'خطأ في الاتصال'}`); }
    setLoading(p => ({ ...p, [svc.id]: false }));
  }, [values, settings, updateSettings, notify]);

  const disconnect = (svc: typeof SERVICES[0]) => {
    if (svc.id === 'openai') updateSettings('ai', { ...settings.ai, apiKey: '' });
    else if (svc.id === 'gemini') updateSettings('ai', { ...settings.ai, geminiKey: '' });
    else if (svc.id === 'claude') updateSettings('ai', { ...settings.ai, claudeKey: '' });
    else if (svc.id === 'deepseek') updateSettings('ai', { ...settings.ai, deepseekKey: '' });
    else if (svc.id === 'grok') updateSettings('ai', { ...settings.ai, grokKey: '' });
    else if (svc.id === 'mistral') updateSettings('ai', { ...settings.ai, mistralKey: '' });
    else if (svc.id === 'brevo') updateSettings('marketing' as any, { brevoApiKey: '' });
    else if (svc.id === 'hcaptcha') updateSettings('security', { ...settings.security, hcaptchaSiteKey: '', hcaptchaSecret: '' } as any);
    else if (svc.id === 'supabase') { updateSettings('supabaseUrl' as any, ''); updateSettings('supabaseKey' as any, ''); }
    else if (svc.id === 'cloudinary') { updateSettings('cloudinaryCloudName' as any, ''); updateSettings('cloudinaryApiKey' as any, ''); updateSettings('cloudinaryApiSecret' as any, ''); }
    else updateSettings('social', { ...settings.social, [svc.id]: { ...settings.social[svc.id as keyof typeof settings.social], connected: false, pageId: '', accessToken: '' } });
    setTestResults(p => ({ ...p, [svc.id]: null }));
    notify('warning', `🔌 تم قطع الاتصال بـ ${svc.name}`);
  };

  const sendWhatsAppTest = async () => {
    if (!waTestPhone.trim()) { notify('error', 'أدخل رقم هاتف للاختبار'); return; }
    setWaTestLoading(true);
    try {
      const r = await fetch('/api/settings/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ to: waTestPhone.trim() }),
      });
      const d = await r.json();
      if (d.ok) notify('success', `✅ ${d.info || 'تم إرسال رسالة الاختبار!'}`);
      else notify('error', `❌ ${d.error || 'فشل الإرسال'}`);
    } catch (e: any) { notify('error', `❌ ${e.message}`); }
    setWaTestLoading(false);
  };

  const testAll = async () => {
    setTestingAll(true);
    try {
      const r = await fetch('/api/settings/verify-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
      });
      const results = await r.json();
      setTestResults(results);
      const ok = Object.values(results).filter((v: any) => v?.ok).length;
      const total = Object.keys(results).length;
      notify(ok === total ? 'success' : 'warning', `${ok === total ? '✅' : '⚠️'} ${ok}/${total} اتصالات تعمل`);
    } catch (e: any) {
      notify('error', `❌ خطأ في الاختبار: ${e.message}`);
    }
    setTestingAll(false);
  };

  const connected = SERVICES.filter(s => isConnected(s.id)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 className="page-title">ربط الخدمات</h1>
        <p className="page-sub">اربط حساباتك مرة واحدة — النظام يتكفل بالباقي</p>
      </div>

      {/* دليل المبتدئين: من أين أبدأ؟ */}
      <div style={{ padding: '14px 16px', borderRadius: 'var(--r)', background: 'rgba(0,210,179,0.07)', border: '1px solid rgba(0,210,179,0.2)', fontSize: 12.5, color: 'var(--ink2)', lineHeight: 1.8 }}>
        <b style={{ color: 'var(--mint)' }}>🧭 جديد هنا؟ لست مضطراً لربط كل شيء!</b><br/>
        ابدأ بخدمة واحدة فقط: <b style={{ color: 'var(--ink1)' }}>Google Gemini</b> — مجانية تماماً وتُفعّل الذكاء الاصطناعي كاملاً (الردود، الأوصاف، الهاشتاغ) في دقيقتين بحساب Google عادي.
        كل بطاقة بالأسفل فيها شرح <b style={{ color: 'var(--ink1)' }}>«ما هذه الخدمة؟»</b> وخطوات مرقمة ورابط مباشر للموقع الرسمي. الخدمات الأخرى أضفها لاحقاً عند الحاجة.
      </div>

      {/* Progress + Test All */}
      <div className="card" style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--txt-1)' }}>حالة الاتصالات</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: connected === SERVICES.length ? '#34d399' : 'var(--clr-warn)' }}>{connected}/{SERVICES.length}</span>
            <button onClick={testAll} disabled={testingAll || connected === 0} className="btn btn-ghost btn-sm" style={{ gap: 6, opacity: connected === 0 ? 0.4 : 1 }}>
              {testingAll ? <Loader2 size={13} className="spin" /> : <Zap size={13} />}
              اختبار جميع الاتصالات
            </button>
          </div>
        </div>
        <div className="progress-bar"><div className="progress-fill" style={{ width: `${(connected / SERVICES.length) * 100}%` }} /></div>
        {connected === 0 && <p style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 8, textAlign: 'center' }}>التطبيق يعمل بمحاكاة ذكية بدون ربط — الربط للنشر الحقيقي فقط</p>}
      </div>

      {/* Services */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SERVICES.map(svc => {
          const conn = isConnected(svc.id);
          const open = expanded === svc.id;
          const testResult = testResults[svc.id];
          return (
            <div key={svc.id} className="card" style={{ overflow: 'hidden', borderColor: conn ? (testResult === null ? 'var(--border)' : testResult?.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)') : conn ? 'rgba(16,185,129,0.25)' : undefined }}>
              {/* Header */}
              <div onClick={() => setExpanded(open ? null : svc.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', cursor: 'pointer', transition: 'background .18s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: svc.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(0,0,0,0.3)', overflow: 'hidden', padding: 6 }}>
                  {(() => { const SvcIcon = (svc as any).Icon; return SvcIcon ? <SvcIcon /> : <span style={{ fontSize: 22 }}>{(svc as any).icon}</span>; })()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--txt-1)' }}>{svc.name}</p>
                    {conn && <CheckCircle size={15} color="#34d399" />}
                    {isServerManaged(svc.id) && (
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 99, background: 'rgba(99,102,241,.15)', color: '#a78bfa', border: '1px solid rgba(99,102,241,.25)' }}>
                        🔒 Railway Env
                      </span>
                    )}
                    {testResult && (
                      <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 99, background: testResult.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: testResult.ok ? '#34d399' : '#f87171' }}>
                        {testResult.ok ? `✅ يعمل${testResult.info ? ` · ${testResult.info}` : ''}` : '❌ لا يعمل'}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--txt-3)', marginTop: 2 }}>{svc.desc}</p>
                  {/* What this enables */}
                  {conn && ENABLES[svc.id] && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:4 }}>
                      {ENABLES[svc.id].map(e => (
                        <span key={e} style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'rgba(16,185,129,.1)', color:'#34d399', border:'1px solid rgba(16,185,129,.2)' }}>
                          ✓ {e}
                        </span>
                      ))}
                    </div>
                  )}
                  {!conn && ENABLES[svc.id] && open && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:4 }}>
                      {ENABLES[svc.id].map(e => (
                        <span key={e} style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:99, background:'rgba(255,255,255,.04)', color:'var(--txt-3)', border:'1px solid var(--clr-border)' }}>
                          {e}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {conn && !isServerManaged(svc.id) && <button onClick={e => { e.stopPropagation(); disconnect(svc); }} className="btn btn-danger btn-sm" style={{ fontSize: 12 }}>قطع</button>}
                  {loading[svc.id] ? <Loader2 size={16} className="spin" style={{ color: 'var(--clr-pri-h)' }} /> : conn ? <CheckCircle size={16} color="#34d399" /> : <Wifi size={16} color="var(--txt-3)" />}
                </div>
              </div>

              {/* Body */}
              {open && (
                <div className="anim-fade-in" style={{ borderTop: '1px solid var(--clr-border)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Server-managed badge */}
                  {isServerManaged(svc.id) && (
                    <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(99,102,241,.07)', border:'1px solid rgba(99,102,241,.2)', display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:16 }}>🔒</span>
                      <p style={{ fontSize:12, color:'#c4b5fd' }}>
                        هذه الخدمة مُفعَّلة عبر متغيرات بيئة Railway — لا حاجة لإدخال البيانات يدوياً.
                      </p>
                    </div>
                  )}
                  {/* What this enables — shown at top of expanded body when not connected */}
                  {!conn && ENABLES[svc.id] && (
                    <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(255,106,0,.06)', border:'1px solid rgba(255,106,0,.18)' }}>
                      <p style={{ fontSize:12, fontWeight:800, color:'var(--ember)', marginBottom:8 }}>🔓 بعد الربط يمكنك:</p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                        {ENABLES[svc.id].map(e => (
                          <span key={e} style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:99, background:'rgba(255,106,0,.1)', color:'var(--ember)', border:'1px solid rgba(255,106,0,.2)' }}>
                            ⚡ {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* ما هذه الخدمة؟ — شرح بلغة بسيطة قبل الخطوات التقنية */}
                  {!conn && WHAT_IS[svc.id] && (
                    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(0,210,179,0.06)', border: '1px solid rgba(0,210,179,0.18)' }}>
                      <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--mint)', marginBottom: 6 }}>
                        🤔 ما هذه الخدمة؟ {EASY_IDS.has(svc.id) && <span style={{ background: 'rgba(0,210,179,0.15)', borderRadius: 99, padding: '2px 10px', fontSize: 10, marginRight: 6 }}>⭐ موصى بها للمبتدئين — مجانية</span>}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.8 }}>{WHAT_IS[svc.id]}</p>
                    </div>
                  )}
                  {/* Guide */}
                  <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--clr-pri-h)' }}>كيف تحصل على هذه المعلومات؟ — خطوة بخطوة</p>
                      <a href={svc.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--clr-pri-h)', textDecoration: 'none', fontWeight: 700 }}>
                        الدليل الرسمي <ExternalLink size={12} />
                      </a>
                    </div>
                    <ol style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {svc.guide.map((step, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5 }}>
                          <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', color: 'var(--clr-pri-h)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, flexShrink: 0, marginTop: 1 }}>{i+1}</span>
                          <span style={{ color: 'rgba(165,180,252,0.75)' }}>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Fields */}
                  {svc.fields.map(f => {
                    const vk = `${svc.id}-${f.key}`;
                    return (
                      <div key={f.key}>
                        <label className="label">{f.label}</label>
                        <div style={{ position: 'relative' }}>
                          <input type={(f as any).secret && !visible[vk] ? 'password' : 'text'}
                            className="input" style={{ paddingLeft: (f as any).secret ? 42 : 14, fontFamily: 'monospace', fontSize: 13 }}
                            placeholder={f.ph} value={val(svc.id, f.key)} onChange={e => setVal(svc.id, f.key, e.target.value)} dir="ltr" />
                          {(f as any).secret && (
                            <button onClick={() => setVisible(p => ({ ...p, [vk]: !p[vk] }))}
                              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--txt-3)', cursor: 'pointer' }}>
                              {visible[vk] ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          )}
                        </div>
                        {f.help && <p style={{ fontSize: 11.5, color: 'var(--txt-3)', marginTop: 5 }}>{f.help}</p>}
                      </div>
                    );
                  })}

                  <button onClick={() => connect(svc)} disabled={loading[svc.id]} className={`btn ${conn ? 'btn-ghost' : 'btn-primary'}`} style={{ justifyContent: 'center' }}>
                    {loading[svc.id] ? <><Loader2 size={15} className="spin" /> جارٍ التحقق...</> : conn ? <><RefreshCw size={15} /> إعادة اختبار</> : <><Wifi size={15} /> اتصال وتحقق</>}
                  </button>

                  {/* WhatsApp: send real test message */}
                  {svc.id === 'whatsapp' && conn && (
                    <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(37,211,102,.07)', border: '1px solid rgba(37,211,102,.2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 800, color: '#25d366' }}>📲 اختبار الإرسال الحقيقي</p>
                      <p style={{ fontSize: 11.5, color: 'var(--txt-3)' }}>أدخل رقمك لإرسال رسالة اختبار حقيقية عبر WhatsApp Business</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          className="input"
                          style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}
                          placeholder="212612265893"
                          value={waTestPhone}
                          onChange={e => setWaTestPhone(e.target.value)}
                          dir="ltr"
                        />
                        <button
                          onClick={sendWhatsAppTest}
                          disabled={waTestLoading}
                          className="btn btn-ghost btn-sm"
                          style={{ whiteSpace: 'nowrap', borderColor: 'rgba(37,211,102,.35)', color: '#25d366' }}
                        >
                          {waTestLoading ? <Loader2 size={13} className="spin" /> : '📤 إرسال'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Security note */}
      <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12, borderColor: 'rgba(245,158,11,0.22)', background: 'rgba(245,158,11,0.04)' }}>
        <AlertTriangle size={18} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24', marginBottom: 3 }}>ملاحظة أمنية</p>
          <p style={{ fontSize: 12, color: 'var(--txt-3)', lineHeight: 1.6 }}>المفاتيح تُحفظ في متصفحك وترسل للخادم المحلي. لا تشاركها مع أحد. للاستخدام الاحترافي يُنصح بـ Backend + تشفير قاعدة البيانات.</p>
        </div>
      </div>
    </div>
  );
}
