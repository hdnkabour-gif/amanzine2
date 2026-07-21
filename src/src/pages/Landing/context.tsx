import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useStore } from '../../store';
import { type Lang, isRtlLang } from '../../i18n/translations';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { L, LX, type Stats, type Listing } from './data';
import { fetchPublicStats, fetchPublicListings } from './api';

interface LandingCtx {
  lang: Lang;
  setLang: (code: Lang) => void;
  isRtl: boolean;
  tx: (k: string) => string;
  isAuthed: boolean;
  storeUrl: string | null;
  stats: Stats | null;
  listings: Listing[];
  established: boolean;
  Arrow: typeof ArrowRight;
  startDemo: () => void;
  scrollTo: (id: string) => void;
}

const Ctx = createContext<LandingCtx | null>(null);

export function useLanding(): LandingCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLanding must be used inside <LandingProvider>');
  return c;
}

export function LandingProvider({ children }: { children: ReactNode }) {
  const { token, user, settings, updateSettings } = useStore();
  const [lang, setLangState] = useState<Lang>(() => ((settings.brand as any)?.language || 'ar') as Lang);
  const [stats, setStats] = useState<Stats | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);

  const isRtl = isRtlLang(lang);
  const tx = (k: string) => (LX[lang]?.[k] ?? L[lang]?.[k] ?? LX.ar[k] ?? L.ar[k] ?? k);
  const isAuthed = !!token || token === 'demo-token-local';
  const userId = user?.id || (() => { try { const u = localStorage.getItem('ai_commerce_user'); return u ? JSON.parse(u)?.id : null; } catch { return null; } })();
  const storeUrl = userId ? `/store/${userId}` : null;
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  const setLang = (code: Lang) => { setLangState(code); updateSettings('brand', { ...(settings.brand as any), language: code }); };
  const startDemo = () => { try { localStorage.setItem('ai_commerce_token', 'demo-token-local'); } catch {} window.location.href = '/home'; };
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  // جلب البيانات الحقيقية + تحديث حيّ آمن كل 30 ثانية
  // (نقاط نهاية عامة مجهّلة فقط — لا مصادقة ولا بيانات زبائن، عكس قناة WS الخاصة بكل تاجر)
  useEffect(() => {
    let alive = true;
    const load = () => {
      fetchPublicStats().then(s => { if (alive && s) setStats(s); });
      fetchPublicListings().then(l => { if (alive) setListings(l); });
    };
    load();
    const id = setInterval(load, 30000);
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  // SEO ديناميكي حسب اللغة
  useEffect(() => {
    document.title = tx('seoTitle');
    const m = document.querySelector('meta[name="description"]'); if (m) m.setAttribute('content', tx('seoDesc'));
    document.documentElement.lang = lang === 'darija' ? 'ar' : lang;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const established = !!stats && stats.merchants >= 12 && (stats.products + stats.listings) >= 30;

  const value: LandingCtx = { lang, setLang, isRtl, tx, isAuthed, storeUrl, stats, listings, established, Arrow, startDemo, scrollTo };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
