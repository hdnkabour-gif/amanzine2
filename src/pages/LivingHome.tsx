import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import {
  Search, Mic, Camera, MapPin, ArrowLeft, Check, RotateCcw,
  MessageCircle, ShoppingBag, Eye, Plus, AlertTriangle, Phone, Heart, Sparkles, Truck,
} from 'lucide-react';
import { NEED_EXAMPLES, clarificationStep, signalsFrom, type NeedResult, type NeedOption } from '../lib/needEngine';
import { clarify, applyAnswer, type Signals, type ClarificationId } from '../lib/clarify';
import NeedCapture from '../components/NeedCapture';
import { lastByIntent, lastByJourney, getInteractions, setSatisfaction, type Interaction, type Via } from '../lib/experienceLog';
import { buildContext } from '../lib/core/context';
import { orchestrate, recordExperience, recordFeedback } from '../lib/core/orchestrator';
import { relatedProfessions } from '../lib/knowledge/graph';
import { playGate } from '../lib/gateTransition';
import { useNavigate } from 'react-router-dom';
import { personaGreeting, personaWelcome } from '../lib/persona';
import { knownAbout, enrichSignals, explainFilled } from '../lib/knownContext';
import { decideInterface, confirmPrompt } from '../lib/interfaceDecision';
import { receptionStart, receptionTurn, receptionUnderstood, receptionStep, receptionEnd, recordDecision, recordConfirm, recordClarificationAsked, recordClarificationAnswered, recordSnapshot } from '../lib/journey';
import {
  openSnapshot, askClarification, answerClarification, confirmSnapshot, withDestination,
  stageOf, toTelemetry, type IntentSnapshot,
} from '../lib/intentSnapshot';
import UnderstandingCard from '../components/UnderstandingCard';
import { correctionOptions, applyCorrection, buildMisread, thankFor, type CorrectionOption } from '../lib/correction';
import { abilityFor } from '../lib/abilities';
import { readPersonFacts, rememberFacts, forgetFact, describeFacts } from '../lib/personFacts';
import { decideExecution } from '../lib/executionPolicy';
import { reportMisread } from '../lib/journey';
import { understand } from '../lib/akg/kb';
import type { Journey } from '../lib/core/plugins';
import type { Page } from '../types';

// ============================================================
// الصفحة الرئيسية «الحيّة». رأسها ثابت («شنو محتاج اليوم؟» + خانة)،
// لكن جسمها يحكي قصّة المستخدم — مشاهد (beats) تتغيّر حسب دوره وحالته،
// لا بطاقات ثابتة. بحدّ أقصى ٥ مشاهد (لا ازدحام). المشتري لا يرى المتجر.
// الذاكرة ليست قسمًا — تظهر داخل النتيجة نفسها.
// (الأسماء الداخلية لا تظهر للمستخدم إطلاقًا — كلّ ما يراه عربيّ طبيعيّ.)
// ============================================================

const MAX_BEATS = 5;
const VISIT_KEY = 'amanzine_last_visit';

interface Turn { who: 'sys' | 'user'; text: string }
interface Beat { id: string; icon: any; color: string; title: string; sub?: string; page?: Page; pr: number }
interface Dest { page?: Page; url?: string }

const destToStr = (d: Dest) => d.page ? `page:${d.page}` : d.url ? `url:${d.url}` : '';
const strToDest = (s: string): Dest => s.startsWith('page:') ? { page: s.slice(5) as Page } : s.startsWith('url:') ? { url: s.slice(4) } : {};

export default function LivingHome() {
  const { settings, products, orders, customers, conversations, setPage, user } = useStore();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [result, setResult] = useState<NeedResult | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [pending, setPending] = useState<NeedOption | null>(null);
  const [confirmed, setConfirmed] = useState(false); // وضع confirm: أكّد المستخدم الفهم؟
  const [gapDays, setGapDays] = useState(0);
  const [fuDone, setFuDone] = useState(false);
  const [journey, setJourney] = useState<Journey | 'discover'>('discover');
  // عقدُ الطلب — يُفتح مع أوّل جملةٍ ويرافقه إلى الوجهة أو التصعيد (HU-4).
  const [snap, setSnap] = useState<IntentSnapshot | null>(null);
  const [xpLog] = useState<Interaction[]>(getInteractions); // تفاعلات الجلسات السابقة (تُقرأ مرّة)
  // التصحيحُ الفوريّ: الحقلُ المردود، ثمّ ما يكتبه الإنسانُ بدلًا عمّا قلناه.
  const [correcting, setCorrecting] = useState(false);
  const [wrong, setWrong] = useState<CorrectionOption | null>(null);
  const [fixText, setFixText] = useState('');
  const [thanks, setThanks] = useState('');
  // ما يقوله التطبيقُ حين لا يملك فعلًا — «ما نقدرش» بدل صمتٍ أو فعلٍ ناقص.
  const [said, setSaid] = useState('');
  // ما تعلّمناه عن الشخص من جملته — يُعرَض ليراجعه، لا ليُخفى.
  const [learned, setLearned] = useState('');

  /**
   * يُنهي التصحيح: يبلّغ الأدمنَ عدًّا، ويُطبّق التصحيحَ **لهذا الشخص وحدَه**.
   *
   *   القانون #٣ يمنع التعديلَ الذاتيّ. فتصحيحُ فردٍ يصلح فهمَه هو فورًا،
   *   ولا يُعلّم التطبيقَ كلَّه — وإلّا علّمت غلطةُ واحدٍ الناسَ جميعًا.
   *
   *   و«كلشي غالط» لا يكتب شيئًا في الذاكرة: من ردّ الفهمَ كلَّه لم يقل
   *   ماذا يريد، والكتابةُ عنه تخمينٌ فوق خطأ. نعتذر ونستمع من جديد.
   */
  const fixNow = () => {
    if (!wrong) return;
    const u = understand(text);
    const m = buildMisread(text, u, wrong.field);
    if (m) reportMisread(m);
    if (wrong.field !== 'all') applyCorrection(text, fixText);
    // **ما لا يُنسى لا يُكتَب**: تصحيحُ الحقل يمحو ما حفظناه عنه، وإلّا بقي
    // الخطأُ يعمل من الذاكرة بعد أن صحّحه صاحبُه في الجملة.
    if (wrong.field === 'profession') forgetFact('activity');
    if (wrong.field === 'city') forgetFact('city');
    if (wrong.field === 'all') { forgetFact('activity'); forgetFact('city'); }
    setLearned('');
    setThanks(thankFor(wrong.field));
    setCorrecting(false);
    setWrong(null);
    setFixText('');
    // «كلشي غالط» ⇒ نُخلي الطريقَ لجملةٍ جديدة، وما دونه يبقى على جملته.
    if (wrong.field === 'all') { setResult(null); setText(''); }
  };

  // ── أمثلةٌ حيّة متغيّرة (تعليمٌ بلا دليل) — تتبدّل في placeholder ما دامت الخانة فارغة ──
  // تحترم «تقليل الحركة»؛ تتوقّف بمجرّد أن يكتب المستخدم أو تظهر نتيجة.
  const [phIdx, setPhIdx] = useState(0);
  useEffect(() => {
    if (text || result) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setPhIdx(v => (v + 1) % NEED_EXAMPLES.length), 2800);
    return () => clearInterval(id);
  }, [text, result]);

  // إشاراتُ الاستيضاح ترافق الحوارَ كلَّه. بدونها كان كلُّ جوابٍ يُنسى فور
  // قراءته: سؤالٌ واحدٌ عمليًّا، ولا انتقالَ لإنسانٍ بعد سؤالين (ADR-0006).
  const [signals, setSignals] = useState<Signals>({});
  const [escalated, setEscalated] = useState(false);
  // لماذا لم نسأل — يُعرَض للإنسان، فالصمتُ بلا تفسيرٍ يبدو تخمينًا.
  const [knownWhy, setKnownWhy] = useState('');

  const [returning, setReturning] = useState(false);
  useEffect(() => {
    try {
      const last = Number(localStorage.getItem(VISIT_KEY) || 0);
      if (last) { setGapDays(Math.floor((Date.now() - last) / 86400000)); setReturning(true); }
      localStorage.setItem(VISIT_KEY, String(Date.now()));
    } catch { /* noop */ }
    // قياس قمع الاستقبال (بيتا): زمن أوّل فهم/أدوار/خروج. يُغلَق عند مغادرة الصفحة.
    receptionStart();
    return () => receptionEnd('idle');
  }, []);

  const greet = useMemo(() => personaGreeting(new Date().getHours(), (user as any)?.name || ''), [user]);
  const welcome = useMemo(() => personaWelcome((user as any)?.name || '', returning), [user, returning]);

  // ── مشاهد القصّة: من بيانات المستخدم الحقيقية، بصوت سرديّ ──
  const beats = useMemo(() => {
    const pending = orders.filter(o => o.status === 'pending').length;
    const unreadMsg = conversations.reduce((s, c: any) => s + (c.unread || 0), 0);
    const shipped = orders.filter(o => o.status === 'shipped' || o.status === 'delivered').length;
    const published = products.filter(p => p.status === 'published').length;
    const lowStock = products.filter(p => p.stock >= 0 && p.stock <= (settings.products?.lowStockAlert ?? 3)).length;
    const views = products.reduce((s, p: any) => s + (p.views || 0), 0);
    const seller = published > 0 || orders.length > 0 || products.length > 0;

    const b: Beat[] = [];
    if (pending > 0) b.push({ id: 'orders', icon: ShoppingBag, color: 'var(--warn,#F59E0B)', title: `عندك ${pending} طلب جداد كيتسنّاو`, sub: 'راجعهم قبل ما يبردو الزبناء', page: 'orders', pr: 96 });
    if (unreadMsg > 0) b.push({ id: 'msg', icon: MessageCircle, color: 'var(--purple,#8B5CF6)', title: `${unreadMsg} زبناء صيفطو ليك رسالة`, sub: 'ردّ عليهم دابا باش ما يمشيوش', page: 'conversations', pr: 90 });
    if (shipped > 0) b.push({ id: 'ship', icon: Truck, color: 'var(--mint,#12A150)', title: `${shipped} طلب فطريق التوصيل`, sub: 'تبّع وين وصلو', page: 'delivery', pr: 78 });
    if (seller && published === 0) b.push({ id: 'first', icon: Plus, color: 'var(--ember,#FF6A00)', title: 'بدا متجرك — زيد أوّل منتج', sub: 'فدقيقتين وتكون مفتوح للزبناء', page: 'products', pr: 82 });
    if (lowStock > 0) b.push({ id: 'stock', icon: AlertTriangle, color: 'var(--warn,#F59E0B)', title: `${lowStock} منتجات قربو يساليو`, sub: 'جدّد المخزون قبل ما يفوتك بيع', page: 'products', pr: 64 });
    if (seller && !settings.brand?.phone) b.push({ id: 'phone', icon: Phone, color: 'var(--info,#3B82F6)', title: 'زيد رقم تيليفونك', sub: 'باش يوصلو ليك الزبناء دغيا', page: 'settings', pr: 56 });
    if (seller && published > 0 && views > 0) b.push({ id: 'views', icon: Eye, color: 'var(--mint,#12A150)', title: `الناس كيشوفو متجرك — ${views.toLocaleString()} مشاهدة`, sub: 'هاد النشاط كيجيب طلبات', page: 'insights', pr: 52 });
    if (customers.length > 0) b.push({ id: 'cust', icon: Heart, color: 'var(--red,#F5484A)', title: `عندك ${customers.length} زبون فقاعدتك`, sub: 'صيفط ليهم شي عرض جديد', page: 'customers', pr: 40 });

    b.sort((x, y) => y.pr - x.pr);
    return { list: b.slice(0, MAX_BEATS), seller };
  }, [orders, conversations, products, customers, settings]);

  // Identity → Context: نبني سياق المستخدم الحاليّ قبل تفسير طلبه.
  const uctx = useMemo(() => buildContext({ products, orders, customers, conversations, settings }, { authed: !!user }),
    [products, orders, customers, conversations, settings, user]);

  const go = (dest: Dest, what: string, intent?: string, via: Via = 'type') => {
    receptionStep(intent || via); receptionEnd('routed');    // قياس: خرج لوجهةٍ (نقطة الخروج = النيّة)
    // العقدُ يُغلَق هنا ويُرسَل كاملًا — لا يُعيد أحدٌ تركيبَ الحوار بعده.
    if (snap) recordSnapshot(toTelemetry(withDestination(snap, dest)));
    if (intent) recordExperience({ object: result?.object, raw: text, intent, what, dest: destToStr(dest), via, journey, uctx });
    // البوّابة تنفتح ثمّ تأخذك لوجهتك — استعارة أمانزين (سريعة، آمنة، تحترم تقليل الحركة).
    if (dest.page) {
      const p = dest.page;
      // العقل يحمل الجملة معه: «بغيت نبيع تلفون» → النشر الموحّد يستخرجها تلقائيًّا بلا إعادة كتابة.
      if (p === 'publish') { try { sessionStorage.setItem('amanzine_publish_seed', result?.object?.raw || text); } catch { /* noop */ } }
      playGate(() => setPage(p));
      return;
    }
    if (dest.url) {
      // نمرّر الطلب للسوق فيبحث على الخادم فعلًا (ربط النيّة بالمحرّك الموحّد)
      let url = dest.url;
      if (url.startsWith('/market') || url.startsWith('/explore')) {
        const raw = result?.object?.raw || text;
        const sep = url.includes('?') ? '&' : '?';
        url += `${sep}q=${encodeURIComponent(raw)}`;
        const city = result?.object?.location;
        if (city) url += `&city=${encodeURIComponent(city)}`;
      }
      const target = url;
      // تنقّلٌ داخل الراوتر لا إعادةُ تحميل: كانت location.assign تهدم الحالة
      // والرحلة والفهم في كلّ انتقال، فيبدو التطبيق ثلاثةَ تطبيقات لا واحدًا.
      playGate(() => navigate(target));
    }
  };

  const submit = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    receptionTurn(q, 'text');                                // قياس: دورٌ كتابيّ
    const { result: r, journey: j } = orchestrate(q, uctx); // Context → Orchestrator → Journey (+ تعلّم الخادم)
    if (r.intent !== 'unknown') receptionUnderstood();       // قياس: زمن أوّل فهم
    const dec = decideInterface(r);
    // ── حدُّ القدرة (القانون: الفهمُ يُقاس بما نستطيع فعلَه) ──────
    //   كانت `canDo` تُمرَّر `true` دائمًا لأنّ لا قائمةَ قدراتٍ تُسأل، فلم
    //   يقل التطبيقُ «ما نقدرش» قطّ — وهو أصدقُ ما يقوله حين لا يملك فعلًا.
    //   ولا تُخمَّن قدرةٌ قريبة: `abilityFor` تُرجع `null` حين لا تطابق،
    //   فيبقى الحكمُ على العتبة العامّة بدل تنفيذِ فعلٍ لم يطلبه أحد.
    const match = abilityFor({ action: understand(q).action, intent: r.intent });
    const verdict = decideExecution(understand(q), true, match || undefined);
    setSaid(verdict.verdict === 'refuse' || verdict.verdict === 'explain' ? verdict.say : '');
    // ── حقائقُ الشخص ────────────────────────────────────────────
    //   «أنا خضار» تصريحٌ يُحفَظ، و«بغيت نبيع طوموبيل» نيّةٌ لا تُحفَظ —
    //   فمن باع سيّارتَه مرّةً ليس بائعَ سيّارات. وما يُحفَظ يُعرَض فورًا
    //   ليراجعه صاحبُه، لأنّ حقيقةً خاطئةً تدوم أسوأُ من صفرِ حقائق.
    setLearned(describeFacts(rememberFacts(readPersonFacts(q))));
    recordDecision(dec.mode, r.intent, dec.reason, q);       // قياس: القرار + السبب + التقاط جملة «ما لم نفهمه»
    setJourney(j);
    // عقدُ الطلب يُفتح هنا ويرافقه حتى النهاية — بدل أن يُعيد كلُّ جزءٍ من
    // النظام تفسيرَ الحوار من الصفر (HU-4).
    setSnap(openSnapshot(q, { intent: r.intent, confidence: r.confidence ?? 0 }));
    // «لا يسأل التطبيقُ سؤالًا يعرف جوابَه». كانت الإشاراتُ تُبنى من الجملة
    // الحاضرة وحدَها، فيُسأل التاجرُ عن مدينةٍ قالها في كلّ طلبٍ سابق.
    // والذاكرةُ تملأ الفراغَ فقط ولا تُصحّح إنسانًا في حاضره.
    const { signals: enriched, filled } = enrichSignals(signalsFrom(r), knownAbout({
      // ما يعرفه التطبيقُ فعلًا: مدينةُ آخر طلبٍ أو منتَج، ووجودُ كتالوج.
      city: orders.find(o => o.city)?.city || products.find(p => p.city)?.city,
      hasWorkspace: products.length > 0,
    }));
    setSignals(enriched);
    setKnownWhy(explainFilled(filled));
    setEscalated(false);
    setText(q); setResult(r); setStepIdx(0); setPending(null); setConfirmed(false);
    setTurns([{ who: 'user', text: q }, ...(r.open ? [{ who: 'sys' as const, text: r.open }] : [])]);
  };
  const reset = () => { receptionEnd('reset'); receptionStart(); setText(''); setResult(null); setTurns([]); setStepIdx(0); setPending(null); setConfirmed(false); setSnap(null); setSignals({}); setEscalated(false); setKnownWhy(''); setCorrecting(false); setWrong(null); setFixText(''); setThanks(''); setSaid(''); setLearned(''); };

  const pickOption = (opt: NeedOption) => {
    receptionTurn(opt.label, 'button');                      // قياس: دورٌ بالأزرار
    const steps = result?.steps || [];
    const step = steps[stepIdx];
    // أثرُ الاستيضاح (HU-2): الثقةُ قبله وبعده. جوابٌ يختار «خدمة» يحسم الهدفَ
    // فترتفع الثقةُ حتمًا — نقيس ذلك بدل أن نفترضه. والهويّاتُ تُسجَّل لا النصوص.
    if (step?.clarifyId && opt.id) {
      const before = result?.confidence ?? 0;
      // جوابٌ يحمل وجهةً = الهدفُ صار معروفًا ⇒ ثقةٌ كافيةٌ للمضيّ.
      const after = (opt.page || opt.url) ? 0.9 : before;
      recordClarificationAnswered(step.clarifyId, opt.id, before, after);
      // والعقدُ يُحدَّث معه: الجوابُ يُدمَج، فتُعاد المرحلةُ من الثقة الجديدة
      // بدل أن تبقى على ما كانت — وهذه هي الحلقةُ التي كانت مفتوحة.
      setSnap(s => s && answerClarification(s, step.clarifyId!, opt.id!, {
        confidence: after,
        signals: { target: opt.id as any },
      }));
    }
    setTurns(t => [...t, { who: 'user', text: opt.label }]);

    // ── الحلقةُ المقطوعة، مُغلَقة ──────────────────────────────
    // كان الجوابُ يُقاس ثمّ يُرمى: `applyAnswer` مبنيّةٌ ومُختبَرةٌ ولا تُستدعى.
    // فلا سؤالَ ثانٍ مبنيٌّ على الأوّل، ولا انتقالَ لإنسانٍ مهما طال العجز.
    const resolved = !!(opt.page || opt.url);
    let next = signals;
    if (step?.clarifyId && opt.id) {
      next = applyAnswer(signals, step.clarifyId as ClarificationId, opt.id);
      // جوابٌ يحمل وجهةً حسم السؤال ⇒ الثقةُ ترتفع فعلًا لا افتراضًا.
      if (resolved) next = { ...next, confidence: Math.max(next.confidence ?? 0, 0.9) };
      setSignals(next);
    }

    if (stepIdx + 1 < steps.length) { setStepIdx(i => i + 1); return; }
    if (resolved) { setPending(opt); return; }

    // نفدت الخطواتُ المُعدّة والجوابُ لم يحسم: نسأل المحرّكَ ماذا بعد.
    const dec = clarify(next);
    if (dec.mode === 'escalate') {
      receptionEnd('escalate');
      setEscalated(true);
      return;
    }
    if (dec.mode === 'clarify' && dec.clarification) {
      const extra = clarificationStep(dec.clarification);
      setResult(r => r && { ...r, steps: [...(r.steps || []), extra] });
      setStepIdx(i => i + 1);
      return;
    }
    setPending(opt);
  };
  const activeStep = result?.steps?.[stepIdx];

  // يُسجَّل السؤالُ مرّةً واحدةً حين يُعرَض فعلًا — لا عند كلّ إعادة رسم،
  // وإلّا صار العدّادُ يقيس إعادةَ الرسم لا السؤال.
  useEffect(() => {
    if (activeStep?.clarifyId && !pending) {
      recordClarificationAsked(activeStep.clarifyId, result?.confidence ?? 0);
      setSnap(s => s && askClarification(s, activeStep.clarifyId!));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep?.clarifyId, stepIdx]);
  // ذاكرةٌ بمستويَين: النيّة نفسها أوّلًا (أدقّ)، ثمّ نفسُ الرحلة (أوسع).
  // كان حقل journey يُكتب في كلّ تجربةٍ ولا يُقرأ — القاعدة ⑦: يُعرَض أو يُحذَف.
  const memExact = result ? lastByIntent(result.intent, xpLog) : undefined;
  const memJourney = !memExact && result ? lastByJourney(String(journey), xpLog) : undefined;
  const mem = memExact || memJourney;

  // Decision Layer — «التطبيق يقرّر أفضل واجهة». وضع confirm يُظهر تأكيدًا خفيفًا
  // عند اليقين المتوسّط قبل التوجيه («فهمت أنّك باغي… صح؟»).
  const decision = result ? decideInterface(result) : null;
  const CONFIRM_PHRASE: Record<string, string> = {
    sell: 'تبيع شي حاجة', buy: 'تشري شي حاجة', rent: 'تكري', book: 'تحجز موعد',
    find_pro: 'تلقى مختصّ', urgent: 'تلقى مختصّ دابا', create_service: 'تنشر خدمتك', create_store: 'دير متجرك',
  };
  const confirmText = result ? (result.object?.profession ? `تلقى ${result.object.profession}` : (CONFIRM_PHRASE[result.intent] || result.label)) : '';

  // متابعة تجربة سابقة (Life Memory مرئيّة): طلب حِرفيّ/عاجل من الأيام الماضية.
  const followUp = useMemo(() => {
    const now = Date.now();
    return xpLog.find(i => ['urgent', 'find_pro', 'rent', 'buy'].includes(i.intent) && now - i.at > 3600000 && now - i.at < 3 * 86400000);
  }, [xpLog]);
  const fuLabel = followUp ? (followUp.object?.profession || followUp.object?.category || followUp.what) : '';

  // Knowledge Graph: الخطوة المجاورة — «بعد صبّاغ، تحتاج أيضاً؟»
  const related = result ? relatedProfessions(result.object?.profession) : [];

  // «لماذا أرى هذا؟» — شفافية: كل مشهد بسببه
  const WHY: Record<string, string> = {
    orders: 'عندك طلبات بانتظار الموافقة',
    msg: 'زبناء صيفطو ليك رسائل',
    ship: 'عندك طلبات فطريق التوصيل',
    first: 'باقي ما نشرتي حتى منتج',
    stock: 'شي منتجات مخزونها قربو يسالي',
    phone: 'رقم هاتفك ناقص فالمتجر',
    views: 'الناس كيشوفو متجرك',
    cust: 'عندك زبناء فقاعدتك',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 4 }}>
      {/* Header — ثابت */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: 'var(--ink3)', fontWeight: 700, marginBottom: 6 }}>{greet}</div>
        <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.1rem)', fontWeight: 900, letterSpacing: '-0.02em', margin: 0, color: 'var(--ink1)' }}>
          شنو محتاج اليوم؟
        </h1>
        {/* استقبال أوّل ٣٠ ثانية — صوت AMANZINE الثابت (يظهر قبل أيّ نتيجة فقط) */}
        {!result && (
          <div style={{ fontSize: 12.5, color: 'var(--ink3)', fontWeight: 600, marginTop: 8, maxWidth: 440, marginInline: 'auto', lineHeight: 1.6 }}>
            {welcome}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={e => { e.preventDefault(); submit(text); }} style={{ maxWidth: 620, width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 16px', borderRadius: 16, background: 'var(--panel,rgba(255,255,255,.03))', border: '1.5px solid var(--border2,rgba(255,255,255,.14))' }}>
          <Search size={19} style={{ color: 'var(--ink3)', flexShrink: 0 }} />
          {/* شكرُ التصحيح يُمحى بمجرّد أن يكتب من جديد — رسالةٌ باقيةٌ على
              جملةٍ أخرى تصير كذبًا صغيرًا. */}
          <input value={text} onChange={e => { setText(e.target.value); if (thanks) setThanks(''); }}
            placeholder={`كتب بالدارجة… مثلاً: ${NEED_EXAMPLES[phIdx] || 'الماء كيقطر ضروري'}`}
            autoComplete="off"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink1)', fontSize: 15.5, fontWeight: 600, fontFamily: 'inherit', direction: 'rtl' }} />
          {text && (
            <button type="submit" aria-label="بحث" style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 10, border: 'none', background: 'var(--ember,#FF6A00)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeft size={18} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center' }}>
          {/* «قريبًا» كانت مخبّأةً في title — لا يراها مستخدمُ الهاتف أبدًا، فينقر
              زرًّا يبدو فعّالًا ولا يقع شيء. صارت مكتوبةً على الزرّ ومعطّلةً فعلًا.
              ما عدا «صورة» فهي تعمل حقًّا داخل المساعد، فتقود إليه. */}
          {[{ i: Mic, l: 'تحدّث', soon: true }, { i: Camera, l: 'صورة', soon: false }, { i: MapPin, l: 'موقعي', soon: true }].map(m => (
            <button key={m.l} type="button" disabled={m.soon}
              onClick={m.soon ? undefined : () => playGate(() => setPage('assistant' as Page))}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 11, border: '1px solid var(--border,rgba(255,255,255,.08))', background: 'var(--panel,rgba(255,255,255,.02))', color: 'var(--ink3)', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: m.soon ? 'default' : 'pointer', opacity: m.soon ? .45 : 1 }}>
              <m.i size={14} /> {m.l}{m.soon ? ' · قريبًا' : ''}
            </button>
          ))}
        </div>
      </form>

      {/* ── 🧠 «فهمنا طلبك» — أثناء الكتابة، **وتبقى مرآةً بعد الفهم**.
          كانت مشروطةً بـ `!result` فتختفي في لحظة القرار — أي حين يحتاجها
          المستخدم ليتأكّد أنّ ما فُهم عنه صحيح قبل أن يمضي. ── */}
      <UnderstandingCard query={text} onAct={() => submit(text)}
        mirror={!!result}
        onCorrect={() => { recordConfirm(false, result?.confidence ?? 0); setWrong(null); setFixText(''); setThanks(''); setCorrecting(true); }} />

      {/* ── التصحيحُ الفوريّ: «لا، ماشي هادشي» ────────────────────
          كان الزرُّ يمحو جملةَ الإنسان ويعيده لخانةٍ فارغة، ويسجّل أنّ شيئًا
          كان خطأً بلا أن يسجّل ما هو. فيدفع ثمنَ خطئنا مرّتين: يكتب من
          جديد، ولا يتحسّن شيءٌ حين يكتب. هنا **تبقى الجملة**، ونسأل عمّا
          ادّعيناه نحن لا سؤالًا عامًّا. ── */}
      {correcting && !thanks && (
        <div style={{ maxWidth: 620, width: '100%', margin: '2px auto 0', padding: '13px 15px', borderRadius: 13, border: '1px solid var(--border,rgba(255,255,255,.1))', background: 'var(--panel,rgba(255,255,255,.02))', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!wrong ? (
            <>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink1)' }}>سمح ليا — شنو اللي غالط؟</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {correctionOptions(understand(text)).map(o => (
                  <button key={o.field} type="button" onClick={() => setWrong(o)}
                    style={{ padding: '7px 13px', borderRadius: 99, border: '1px solid var(--border,rgba(255,255,255,.12))', background: 'transparent', color: 'var(--ink1)', fontSize: 12.5, fontWeight: 750, fontFamily: 'inherit', cursor: 'pointer' }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink1)' }}>{wrong.ask}</div>
              <form onSubmit={e => { e.preventDefault(); fixNow(); }} style={{ display: 'flex', gap: 7 }}>
                <input value={fixText} onChange={e => setFixText(e.target.value)} autoFocus
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1px solid var(--border,rgba(255,255,255,.12))', background: 'transparent', color: 'var(--ink1)', fontSize: 13.5, fontWeight: 650, fontFamily: 'inherit', direction: 'rtl', outline: 'none' }} />
                <button type="submit" disabled={!fixText.trim()}
                  style={{ padding: '9px 15px', borderRadius: 10, border: 'none', background: 'var(--amz-gold,#D4A017)', color: '#1a1300', fontSize: 13, fontWeight: 900, fontFamily: 'inherit', cursor: fixText.trim() ? 'pointer' : 'default', opacity: fixText.trim() ? 1 : .45 }}>
                  صحّح
                </button>
              </form>
            </>
          )}
        </div>
      )}
      {/* ── حدُّ القدرة: «ما نقدرش» ────────────────────────────────
          قولُ «لا أستطيع» بصراحةٍ خيرٌ من فعلٍ ناقصٍ يُوهم أنّه تمّ، وخيرٌ
          من صمتٍ يجعل الإنسانَ يظنّ أنّه أخطأ الكتابة. هذا أوّلُ موضعٍ
          يقول فيه التطبيقُ ذلك — كانت `canDo` تُمرَّر `true` دائمًا. ── */}
      {said && !correcting && (
        <div style={{ maxWidth: 620, width: '100%', margin: '2px auto 0', padding: '11px 15px', borderRadius: 13, border: '1px solid rgba(245,158,11,.28)', background: 'rgba(245,158,11,.07)', fontSize: 13, fontWeight: 700, color: 'var(--ink1)' }}>
          {said}
        </div>
      )}
      {learned && !correcting && !said && (
        <div style={{ maxWidth: 620, width: '100%', margin: '2px auto 0', padding: '10px 15px', borderRadius: 13, border: '1px solid rgba(10,143,111,.25)', background: 'rgba(10,143,111,.06)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink3)' }}>
          🧠 عرفت عليك: {learned} — إلى ماشي هاكّا، قول ليا.
        </div>
      )}
      {thanks && (
        <div style={{ maxWidth: 620, width: '100%', margin: '2px auto 0', padding: '11px 15px', borderRadius: 13, border: '1px solid rgba(10,143,111,.3)', background: 'rgba(10,143,111,.07)', fontSize: 13, fontWeight: 700, color: 'var(--ink1)' }}>
          {thanks}
        </div>
      )}

      {/* ── انتقالٌ لإنسان (ADR-0006) ──────────────────────────────
          بعد استيضاحين بلا ارتفاعٍ في الفهم، السؤالُ الثالث إهانةٌ لا مساعدة.
          ولا نُنهي بـ«ما فهمناش»: نلتقط الحاجةَ نفسَها — الفشلُ يصير طلبًا
          مؤكّدًا نعود به لصاحبه. نفسُ المكوّن الذي يخدم السوقَ حين لا نتيجة. */}
      {escalated && (
        <div style={{ maxWidth: 620, width: '100%', margin: '2px auto 0', display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div style={{ padding: '12px 15px', borderRadius: 13, border: '1px solid rgba(245,158,11,.28)', background: 'rgba(245,158,11,.07)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink1)' }}>سولنا بزّاف — خلّينا نوصلوك بإنسان</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4 }}>
              {clarify(signals).why}
            </div>
          </div>
          <NeedCapture
            query={result?.object?.raw || text}
            city={result?.object?.location}
            concept={result?.object?.profession || result?.object?.category}
          />
          <button onClick={reset} style={{ alignSelf: 'center', padding: '8px 16px', borderRadius: 11, border: '1px solid var(--border2,rgba(255,255,255,.14))', background: 'transparent', color: 'var(--ink3)', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
            <RotateCcw size={13} style={{ verticalAlign: 'middle', marginLeft: 5 }} /> نبداو من جديد
          </button>
        </div>
      )}

      {/* ── نتيجة/محادثة نشطة ── */}
      {result && !escalated && (
        <div style={{ maxWidth: 620, width: '100%', margin: '2px auto 0', display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: result.color, border: `1px solid ${result.color}`, borderRadius: 99, padding: '4px 11px' }}>{result.label}</span>
            {result.confidence != null && (
              <span title="درجة يقين الفهم" style={{ fontSize: 10.5, fontWeight: 800, borderRadius: 99, padding: '4px 9px', color: result.confidence >= 0.85 ? 'var(--mint,#12A150)' : result.confidence >= 0.5 ? 'var(--warn,#F59E0B)' : 'var(--ink3,#7E877F)', background: 'var(--panel,rgba(255,255,255,.04))', border: '1px solid var(--border,rgba(255,255,255,.08))' }}>
                يقين {Math.round(result.confidence * 100)}٪
              </span>
            )}
            {/* لماذا لم نسأل: «ما سولتكش على المدينة — قلتيها من قبل». الصمتُ
                بلا تفسيرٍ يبدو تخمينًا، والتفسيرُ يجعله ذاكرة. */}
            {knownWhy && (
              <span title="عرفناها من قبل" style={{ fontSize: 10.5, fontWeight: 700, borderRadius: 99, padding: '4px 9px', color: 'var(--ink3,#7E877F)', background: 'var(--panel,rgba(255,255,255,.04))', border: '1px solid var(--border,rgba(255,255,255,.08))' }}>
                🧠 {knownWhy}
              </span>
            )}
            {result.tags.map(tg => (
              <span key={tg} style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink2)', background: 'var(--panel,rgba(255,255,255,.04))', border: '1px solid var(--border,rgba(255,255,255,.08))', borderRadius: 99, padding: '4px 11px' }}>{tg}</span>
            ))}
            <button onClick={reset} style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: 'var(--ink3)', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
              <RotateCcw size={13} /> من جديد
            </button>
          </div>

          {/* ذاكرة منسوجة: تظهر داخل النتيجة إن سبق تعامل بنفس النيّة */}
          {mem && (
            <button onClick={() => go(strToDest(mem.dest), mem.what, result.intent, 'memory')} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px', borderRadius: 13, background: 'var(--panel,rgba(255,255,255,.04))', border: '1px dashed var(--border2,rgba(255,255,255,.16))', cursor: 'pointer', textAlign: 'start', fontFamily: 'inherit', width: '100%' }}>
              <span style={{ fontSize: 15 }}>↩️</span>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--ink2)' }}>
                {memExact
                  ? <>آخر مرة مشيتي لـ <b style={{ color: 'var(--ink1)' }}>{mem.what}</b> — تعاود؟</>
                  : <>من نفس الرحلة: <b style={{ color: 'var(--ink1)' }}>{mem.what}</b> — تكمّل منها؟</>}
              </span>
              <ArrowLeft size={15} style={{ color: 'var(--ink3)' }} />
            </button>
          )}

          {turns.map((tn, i) => (
            <div key={i} style={{ alignSelf: tn.who === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '10px 14px', borderRadius: 14, fontSize: 14, lineHeight: 1.5, fontWeight: tn.who === 'user' ? 700 : 500, background: tn.who === 'user' ? 'var(--ember,#FF6A00)' : 'var(--panel,rgba(255,255,255,.04))', color: tn.who === 'user' ? '#fff' : 'var(--ink1)', border: tn.who === 'user' ? 'none' : '1px solid var(--border,rgba(255,255,255,.08))' }}>
              {tn.text}
            </div>
          ))}
          {activeStep && !pending && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, alignSelf: 'flex-start', maxWidth: '92%' }}>
              {/* **كم بقي؟** الحوارُ بلا أفقٍ استجواب. المستخدمُ لا يعرف إن كان
                  أمامه سؤالٌ أم عشرة، فينسحب عند الثاني. جملةٌ واحدةٌ تُبدّل
                  الشعورَ كلَّه — ولا تُعرَض إن كان السؤالُ الأخير هو الوحيد. */}
              {(result?.steps?.length || 0) > 1 && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'var(--ink3,#7E877F)', fontWeight: 700 }}>
                  <span style={{ display: 'inline-flex', gap: 3 }}>
                    {result!.steps!.map((_, i) => (
                      <span key={i} style={{
                        width: 16, height: 4, borderRadius: 3,
                        background: i <= stepIdx ? 'var(--amz-gold,#D4A017)' : 'var(--border2,rgba(255,255,255,.14))',
                      }} />
                    ))}
                  </span>
                  {stepIdx + 1 >= (result!.steps!.length)
                    ? 'هادا آخر سؤال 👌'
                    : `باقي ${result!.steps!.length - stepIdx - 1} ${result!.steps!.length - stepIdx - 1 === 1 ? 'سؤال' : 'أسئلة'} غير`}
                </div>
              )}
              <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 14, fontSize: 14, background: 'var(--panel,rgba(255,255,255,.04))', color: 'var(--ink1)', border: '1px solid var(--border,rgba(255,255,255,.08))' }}>{activeStep.q}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {activeStep.options.map(opt => (
                  <button key={opt.label} onClick={() => pickOption(opt)} style={{ padding: '9px 14px', borderRadius: 12, border: '1.5px solid var(--border2,rgba(255,255,255,.14))', background: 'var(--panel,rgba(255,255,255,.03))', color: 'var(--ink1)', fontSize: 13.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>{opt.label}</button>
                ))}
              </div>
            </div>
          )}
          {/* وضع confirm — تأكيدٌ خفيف قبل التوجيه (يقينٌ متوسّط) */}
          {!pending && !confirmed && decision?.mode === 'confirm' && (
            <div style={{ marginTop: 2, border: '1.5px solid var(--warn,#F59E0B)', borderRadius: 15, padding: 15, background: 'color-mix(in srgb, var(--warn,#F59E0B) 8%, transparent)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink1)', lineHeight: 1.6 }}>{confirmPrompt(confirmText)}</div>
              <div style={{ display: 'flex', gap: 9 }}>
                <button onClick={() => { recordConfirm(true, result.confidence ?? 0); setSnap(sn => sn && withDestination(confirmSnapshot(sn, true), { page: result.page, url: result.url })); setConfirmed(true); go({ page: result.page, url: result.url }, result.tags[0] || result.label, result.intent, 'type'); }}
                  style={{ flex: 1, padding: '11px 16px', borderRadius: 12, border: 'none', background: 'var(--mint,#12A150)', color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>✅ إيه، صحيح</button>
                <button onClick={() => { recordConfirm(false, result.confidence ?? 0); setSnap(sn => sn && confirmSnapshot(sn, false)); reset(); }}
                  style={{ padding: '11px 16px', borderRadius: 12, border: '1px solid var(--border2,rgba(255,255,255,.16))', background: 'transparent', color: 'var(--ink2)', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>❌ لا، نبدّل</button>
              </div>
            </div>
          )}
          {/* تصعيدٌ لإنسان — بعد استيضاحين بلا ارتفاعٍ في الفهم، السؤالُ الثالث
              ليس مساعدة. العقدُ هو من يقرّر هذا، لا الصفحة (ADR-0006). */}
          {snap && stageOf(snap) === 'escalate' && !pending && (
            <div style={{ marginTop: 2, border: '1.5px solid var(--info,#3B82F6)', borderRadius: 15, padding: 15, background: 'color-mix(in srgb, var(--info,#3B82F6) 8%, transparent)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink1)', lineHeight: 1.6 }}>
                سولتك بزّاف وما زال ما فهمتش مزيان 🙏 خلّينا نديروها بطريقة أخرى: كتب اللي محتاج بكلماتك، ونوصّلوك بواحد يعاونك.
              </div>
              <button onClick={() => { setSnap(s => s && withDestination(s, { url: '/explore' })); go({ url: '/explore' }, text, result.intent, 'type'); }}
                style={{ padding: '11px 16px', borderRadius: 12, border: 'none', background: 'var(--info,#3B82F6)', color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>
                ✍️ نكتب بتفصيل
              </button>
            </div>
          )}
          {(pending || !result.steps) && !(!pending && !confirmed && decision?.mode === 'confirm') && !(snap && stageOf(snap) === 'escalate') && (
            <DestinationCard next={pending?.next || result.next}
              dest={pending ? { page: pending.page, url: pending.url } : { page: result.page, url: result.url }}
              intent={result.intent}
              onGo={() => {
                const dest: Dest = pending ? { page: pending.page, url: pending.url } : { page: result.page, url: result.url };
                go(dest, pending?.label || result.tags[0] || result.label, result.intent, pending ? 'guided' : 'type');
              }} />
          )}

          {/* Knowledge Graph — الخطوة المجاورة (بلا بحث) */}
          {related.length > 0 && (pending || !result.steps) && (
            <div style={{ marginTop: 2 }}>
              <div style={{ fontSize: 12, color: 'var(--ink3)', fontWeight: 800, marginBottom: 8 }}>بعد {result.object?.profession}، واش تحتاج حتى؟</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {related.map(r => (
                  <button key={r} onClick={() => submit(`بغيت ${r}`)}
                    style={{ padding: '8px 13px', borderRadius: 99, border: '1px solid var(--border2,rgba(255,255,255,.14))', background: 'var(--panel,rgba(255,255,255,.03))', color: 'var(--ink1)', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                    + {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── القصّة الحيّة (بلا استعلام نشط) ── */}
      {!result && (
        <div style={{ maxWidth: 620, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* متابعة تجربة سابقة + Feedback Loop — «كنت كتقلب على… لقيتي؟» */}
          {followUp && fuLabel && !fuDone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '13px 15px', borderRadius: 15, background: 'var(--panel,rgba(255,255,255,.04))', border: '1px solid color-mix(in srgb, var(--ember,#FF6A00) 28%, transparent)' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>🔁</span>
              <span style={{ flex: '1 1 150px', fontSize: 13.5, color: 'var(--ink1)', lineHeight: 1.5 }}>كنت كتقلب على <b>{fuLabel}</b> — لقيتي؟</span>
              <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                <button onClick={() => { setSatisfaction(followUp.at, true); recordFeedback(true, { raw: followUp.object?.raw || followUp.raw, intent: followUp.intent, city: uctx.place.city }); setFuDone(true); }}
                  style={{ padding: '7px 12px', borderRadius: 10, border: 'none', background: 'var(--mint,#12A150)', color: '#fff', fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}>👍 حليت</button>
                <button onClick={() => { setSatisfaction(followUp.at, false); recordFeedback(false, { raw: followUp.object?.raw || followUp.raw, intent: followUp.intent, city: uctx.place.city }); submit(followUp.object?.raw || followUp.raw); }}
                  style={{ padding: '7px 12px', borderRadius: 10, border: '1px solid var(--border2,rgba(255,255,255,.14))', background: 'transparent', color: 'var(--ink2,#B9C0BA)', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>👎 عاود</button>
              </div>
            </div>
          )}

          {gapDays >= 3 && beats.list.length > 0 && (
            <div style={{ borderRadius: 14, padding: '12px 15px', background: 'var(--ember-soft,rgba(255,106,0,.08))', border: '1px solid color-mix(in srgb, var(--ember,#FF6A00) 30%, transparent)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sparkles size={17} style={{ color: 'var(--ember,#FF6A00)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--ink1)', fontWeight: 650 }}>اشتقنا ليك 😊 فاتوك {beats.list.length} حوايج ملّي غبتي</span>
            </div>
          )}

          {/* المشاهد كقصّة: خيط رابط + مشهد رئيسيّ في الأعلى */}
          {beats.list.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {beats.list.map((s, i) => {
                const lead = i === 0;
                return (
                  <div key={s.id} style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                    {/* rail */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ width: lead ? 44 : 38, height: lead ? 44 : 38, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, background: 'color-mix(in srgb, currentColor 15%, transparent)', border: `1px solid color-mix(in srgb, ${s.color} 35%, transparent)` }}><s.icon size={lead ? 21 : 18} /></span>
                      {i < beats.list.length - 1 && <span style={{ width: 2, flex: 1, minHeight: 14, background: 'var(--border2,rgba(255,255,255,.12))', marginTop: 3 }} />}
                    </div>
                    {/* beat */}
                    <button onClick={() => s.page && setPage(s.page)} style={{ flex: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, padding: lead ? '15px 16px' : '12px 15px', borderRadius: 15, textAlign: 'start', fontFamily: 'inherit', cursor: 'pointer', width: '100%', border: `1px solid ${lead ? 'color-mix(in srgb, ' + s.color + ' 32%, transparent)' : 'var(--border,rgba(255,255,255,.08))'}`, background: lead ? `linear-gradient(120deg, color-mix(in srgb, ${s.color} 10%, transparent), var(--panel,rgba(255,255,255,.03)))` : 'var(--panel,rgba(255,255,255,.03))' }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: lead ? 15.5 : 14, fontWeight: 800, color: 'var(--ink1)' }}>{s.title}</span>
                        {s.sub && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ink3)', marginTop: 2 }}>{s.sub}</span>}
                        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--ink3)', opacity: 0.85, marginTop: 3 }}>ليه كتشوف هادشي؟ {WHY[s.id] || 'مبنيّ على حالتك'}</span>
                      </span>
                      <ArrowLeft size={16} style={{ color: 'var(--ink3)', flexShrink: 0 }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {beats.list.length === 0 && (
            <button onClick={() => setPage('products')} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '15px', borderRadius: 15, background: 'var(--ember-soft,rgba(255,106,0,.08))', border: '1px solid color-mix(in srgb, var(--ember,#FF6A00) 30%, transparent)', cursor: 'pointer', textAlign: 'start', fontFamily: 'inherit', width: '100%' }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ember,#FF6A00)', background: 'color-mix(in srgb, var(--ember,#FF6A00) 14%, transparent)' }}><Plus size={19} /></span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 750, color: 'var(--ink1)' }}>{beats.seller ? 'بدا متجرك' : 'بغيت تبيع شي حاجة؟'}</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--ink3)', marginTop: 1 }}>زيد أول منتج أو خدمة فدقيقتين</span>
              </span>
              <ArrowLeft size={16} style={{ color: 'var(--ink3)', flexShrink: 0 }} />
            </button>
          )}

          {/* أمثلة تدرّب المستخدم على الكتابة الطبيعية */}
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink3)', fontWeight: 800, marginBottom: 9 }}>ولا قول لينا شنو محتاج:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {NEED_EXAMPLES.slice(0, 6).map(ex => (
                <button key={ex} onClick={() => submit(ex)} style={{ padding: '8px 14px', borderRadius: 99, border: '1px solid var(--border2,rgba(255,255,255,.14))', background: 'var(--panel,rgba(255,255,255,.03))', color: 'var(--ink1)', fontSize: 13, fontWeight: 650, fontFamily: 'inherit', cursor: 'pointer' }}>{ex}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// اسمُ الوجهة وسببُ الذهاب إليها. كانت البطاقة تقول ما سيحدث ولا تقول **أين**
// تأخذك ولا **لماذا**، فيبدو الانتقال مفاجئًا — «علاش دّاني لصفحة النشر؟».
const PAGE_NAMES: Record<string, string> = {
  publish: 'النشر الموحّد', settings: 'إعدادات المتجر', products: 'منتجاتي',
  orders: 'طلباتي', bookings: 'الحجوزات', conversations: 'الرسائل', insights: 'الإحصائيات',
};
const WHY: Record<string, string> = {
  sell: 'لأنّك كتعرض شي حاجة للبيع',
  create_service: 'لأنّك كتقدّم خدمة — نعرّفو بيك',
  create_store: 'لأنّك عندك محلّ — نجهّزوه',
  rent: 'لأنّ الأمر متعلّقٌ بالكراء',
  find_pro: 'لأنّك كتقلّب على مختصّ',
  urgent: 'لأنّ الأمر مستعجل',
  buy: 'لأنّك باغي تشري',
  book: 'لأنّك باغي تحجز موعد',
  manage: 'لمتابعة نشاطك',
};
function destName(dest: { page?: string; url?: string }): string {
  if (dest.page) return PAGE_NAMES[dest.page] || 'صفحة داخليّة';
  const u = dest.url || '';
  if (u.startsWith('/market')) return u.includes('urgent') ? 'السوق — المتاحون الآن' : 'السوق';
  if (u.startsWith('/explore')) return 'اكتشف';
  return 'الوجهة المناسبة';
}

function DestinationCard({ next, dest, intent, onGo }: {
  next: string; dest: { page?: string; url?: string }; intent?: string; onGo: () => void;
}) {
  const where = destName(dest);
  const why = intent ? WHY[intent] : undefined;
  return (
    <div style={{ marginTop: 2, border: '1.5px solid var(--ember,#FF6A00)', borderRadius: 15, padding: 15, background: 'var(--ember-soft,rgba(255,106,0,.08))', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 13.5, color: 'var(--ink1)', lineHeight: 1.6 }}>
        <Check size={17} style={{ color: 'var(--ember,#FF6A00)', flexShrink: 0, marginTop: 2 }} />
        <span>{next}</span>
      </div>
      {/* أين ولماذا — قبل الانتقال، لا بعده */}
      <div style={{ fontSize: 12.5, color: 'var(--ink2,#C7CDC8)', lineHeight: 1.7, paddingInlineStart: 26 }}>
        غادي نوصّلوك لـ <b style={{ color: 'var(--ink1)' }}>{where}</b>{why ? ` — ${why}.` : '.'}
      </div>
      <button onClick={onGo} style={{ padding: '11px 16px', borderRadius: 12, border: 'none', background: 'var(--ember,#FF6A00)', color: '#fff', fontSize: 14, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        يالله نمشيو لـ{where} <ArrowLeft size={17} />
      </button>
    </div>
  );
}
