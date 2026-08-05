// ============================================================
// مزامنةُ ذاكرة المستخدم — `localStorage` يصير **ذاكرةً سريعةً** لا مصدرَ حقيقة.
//
//   جردٌ كشف تسعةَ مخازنِ معرفةٍ عن المستخدم تعيش في المتصفّح ولا يصل واحدٌ
//   منها الخادم: العباراتُ المعتمَدة، الرحلات، رسمُ المستخدم، القرارات…
//   فمَن يبدّل هاتفَه يفقد كلَّ ما تعلّمه التطبيقُ عنه.
//
//   ── لماذا لم تتغيّر `memory.ts` ولا `journey.ts` ──
//   `understand()` يقرأ الذاكرةَ **متزامنًا**، ولا يصحّ أن ينتظر شبكةً في كلّ
//   جملة. فبقي القارئون كما هم يقرأون `localStorage`، وصارت مهمّةُ هذه الطبقة
//   أن **تملأه من الخادم عند الإقلاع وترفع ما استجدّ**. لا تغييرَ في أيّ
//   قارئ، ولا انتظارَ في أيّ مسارٍ حسّاس.
//
//   ── والدمجُ على الخادم لا هنا ──
//   لأنّ جهازَين قد يتعلّمان أشياءَ مختلفة، والاستراتيجيّةُ لكلّ مفتاحٍ
//   مُعلَنةٌ في `server/lib/userMemory.js`. هذه الطبقةُ ترفع وتكتب ما يعود.
// ============================================================

import { memoryAPI } from '../services/api';

/** المخازنُ التي تُزامَن. الخادمُ هو المرجع، وهذه نسخةٌ للإقلاع قبل أوّل ردّ. */
const SYNCED_KEYS = [
  'amanzine_learned',
  'amanzine_learned_places',
  'amanzine_user_graph',
  'amanzine_journeys',
  'amanzine_receptions',
  'amanzine_feedback',
  'amanzine_xp_log',
  'amanzine_decisions',
  'amanzine_snapshots',
  'amanzine_last_visit',
  'amanzine_kb_version',
] as const;

const canStore = () => typeof localStorage !== 'undefined';

function readLocal(key: string): unknown {
  if (!canStore()) return undefined;
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? undefined : JSON.parse(raw);
  } catch { return undefined; }
}

function writeLocal(key: string, value: unknown): void {
  if (!canStore()) return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* حصّةٌ ممتلئة */ }
}

/** ما عند هذا الجهاز الآن — الفارغُ لا يُرفَع كي لا يُثقل الطلبَ بلا فائدة. */
function collectLocal(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of SYNCED_KEYS) {
    const v = readLocal(k);
    if (v === undefined) continue;
    if (Array.isArray(v) && !v.length) continue;
    if (v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length) continue;
    out[k] = v;
  }
  return out;
}

let inFlight: Promise<boolean> | null = null;

/**
 * جولةٌ واحدةٌ في الاتّجاهين: ترفع ما عند الجهاز، ويُعيد الخادمُ **المدموج**
 * فيُكتَب محلّيًّا. طلبٌ واحدٌ يكفي — ولا حاجة لجلبٍ منفصلٍ قبله.
 *
 *   وإن لم يكن عند الجهاز شيءٌ (متصفّحٌ جديد) نجلب فقط: الرفعُ الفارغ يُرفَض
 *   من الخادم بحقّ، فلا نرسله أصلًا.
 *
 * @returns هل نجحت الجولة؟ (الفشلُ صامتٌ — الذاكرةُ المحلّيّة تبقى تعمل)
 */
export async function syncMemory(): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const entries = collectLocal();
      const res = Object.keys(entries).length
        ? await memoryAPI.sync(entries)
        : await memoryAPI.get();
      const mem = res?.memory;
      if (!mem || typeof mem !== 'object') return false;
      for (const [key, rec] of Object.entries(mem)) {
        if ((rec as { value?: unknown })?.value !== undefined) {
          writeLocal(key, (rec as { value: unknown }).value);
        }
      }
      return true;
    } catch {
      // بلا شبكةٍ أو بلا حساب: الذاكرةُ المحلّيّة تظلّ تعمل كما كانت.
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * رفعٌ مؤجَّل بعد كتابةٍ محلّيّة. التعلّمُ يحدث في دفعاتٍ صغيرةٍ متتابعة
 * (عبارةٌ بعد عبارة)، فرفعُ كلِّ واحدةٍ فورًا يُغرِق الشبكةَ بلا فائدة.
 */
let timer: ReturnType<typeof setTimeout> | null = null;
export function scheduleMemorySync(delayMs = 4000): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; void syncMemory(); }, delayMs);
}

export { SYNCED_KEYS };
