// ============================================================
// User Graph — المستخدم ليس مجهولًا يبدأ من الصفر. «أنا تقني شبكات، عندي
//   سيّارة، نبيع هواتف، ساكن بالدار البيضاء، نخدم بالليل» — كلّها Graph.
//   يعطي إشاراتٍ (priors) تغذّي Decision Engine: فيملأ المدينة تلقائيًّا،
//   ويقترح ما يناسب المهنة، ويعرف أنّ المستخدم بائع لا مشترٍ. محلّيّ الآن،
//   ويتوسّع بالخادم لاحقًا. لا يعتمد على المتصفّح وقت التحميل (آمن للـ Node).
// ============================================================

import type { Inferred } from '../inference';

export interface UserProfile {
  profession?: string;   // 'تقني شبكات'
  city?: string;         // 'الدار البيضاء'
  sells?: string[];      // ['هواتف']
  owns?: string[];       // ['سيّارة']
  worksNights?: boolean;
  isSeller?: boolean;
}

const KEY = 'amanzine_user_graph';

export function getUserProfile(): UserProfile {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') as UserProfile; }
  catch { return {}; }
}

export function setUserAttr<K extends keyof UserProfile>(key: K, value: UserProfile[K]): void {
  try {
    const p = getUserProfile();
    p[key] = value;
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch { /* noop */ }
}

export function pushUserAttr(key: 'sells' | 'owns', value: string): void {
  try {
    const p = getUserProfile();
    const arr = new Set([...(p[key] ?? []), value]);
    p[key] = Array.from(arr);
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch { /* noop */ }
}

// إشارات المستخدم لكيان معيّن — دالّة نقيّة قابلة للاختبار (بلا تخزين).
export function userInferencesFrom(profile: UserProfile, entity: string): Inferred[] {
  const out: Inferred[] = [];
  // المدينة معروفة → نملؤها بثقة عالية (تُؤكَّد لا تُسأل).
  if (profile.city) {
    out.push({ key: 'city', label: 'المدينة', value: profile.city, confidence: 0.85 });
  }
  // المهنة تُرشِّح التخصّص في كيان الخدمة.
  if (entity === 'service' && profile.profession) {
    out.push({ key: 'profession', label: 'المهنة', value: profile.profession, confidence: 0.8 });
  }
  return out;
}

// نسخة تقرأ من التخزين (للاستعمال داخل التطبيق).
export function userInferences(entity: string): Inferred[] {
  return userInferencesFrom(getUserProfile(), entity);
}

export function userGraphSize(): number {
  const p = getUserProfile();
  return Object.values(p).filter(v => v != null && (!Array.isArray(v) || v.length > 0)).length;
}
