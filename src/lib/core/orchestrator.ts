import { parseNeed, type NeedResult } from '../needEngine';
import { searchAPI, trackAPI } from '../../services/api';
import { logInteraction, type Via } from '../experienceLog';
import { resolvePlugin, type Journey } from './plugins';
import type { UserContext } from './context';

// ============================================================
// Orchestrator — القلب. الـ Need لا تعرف مَن تستدعي؛ الـ Orchestrator يقرّر:
//   Context → Understanding (needEngine) → Plugin/Journey → (Server) Search/Learning
// إضافة قدرة جديدة مستقبلًا لا تلمس هذا الملف — يكفي تسجيل Plugin.
// ============================================================

const CONSUMER = ['buy', 'find_pro', 'rent', 'urgent', 'unknown'];

export interface Orchestrated {
  result: NeedResult;              // للعرض في الواجهة (نفس السلوك)
  journey: Journey | 'discover';   // أيّ رحلة قرّرها الـ Orchestrator
}

// السياق يسبق الطلب: نشتقّ سياق المحرّك (وقت/مكان) من UserContext الكامل.
export function orchestrate(raw: string, uctx: UserContext): Orchestrated {
  const needCtx = { hour: uctx.time.hour, city: uctx.place.city };
  const result = parseNeed(raw, needCtx);                       // Understanding
  const plugin = resolvePlugin(result.intent);                  // Decision — أيّ مجال (Plugin)
  const journey: Journey | 'discover' = plugin ? plugin.journeyOf(result.intent) : 'discover';

  if (CONSUMER.includes(result.intent)) {                        // dispatch → Search/Learning (server)
    try { searchAPI.query(raw, { city: uctx.place.city }).catch(() => {}); } catch { /* noop */ }
  }
  return { result, journey };
}

// Experience → Memory: نسجّل القصّة كاملة (نيّة + رحلة + لقطة سياق).
export function recordExperience(e: {
  raw: string; intent: string; what: string; dest: string; via: Via;
  object?: NeedResult['object']; journey?: string; uctx?: UserContext;
}): void {
  logInteraction({
    at: Date.now(), raw: e.object?.raw || e.raw, intent: e.intent, what: e.what,
    dest: e.dest, via: e.via, object: e.object, journey: e.journey,
    context: e.uctx ? { time: e.uctx.time, place: e.uctx.place, isSeller: e.uctx.identity.isSeller } : undefined,
  });
  // توحيد العقلين: أرسل التجربة للخادم أيضًا (fire-and-forget، آمن أوفلاين/ديمو).
  trackAPI.need('resolved', { raw: e.object?.raw || e.raw, intent: e.intent, city: e.uctx?.place.city });
}

// Feedback Loop → الخادم: رضا المستخدم إشارة تعلّم قويّة.
export function recordFeedback(satisfied: boolean, e: { raw?: string; intent?: string; city?: string }): void {
  trackAPI.need(satisfied ? 'satisfied' : 'unsatisfied', e);
}
