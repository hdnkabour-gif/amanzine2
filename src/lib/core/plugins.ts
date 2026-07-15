import type { Intent } from '../needEngine';

// ============================================================
// Plugin Registry — كل Plugin يمثّل «مجالًا» (Domain)، والرحلات (Journeys)
// تعيش داخله. إضافة مجال جديد (سياحة/صحّة/تعليم/تأمين) = registerPlugin،
// بلا مسّ القلب (Orchestrator/Context).
// ============================================================

export type Domain = 'commerce' | 'profession' | 'realEstate' | 'core';
export type Journey =
  | 'buying' | 'selling' | 'creating' | 'managing'   // commerce
  | 'service' | 'booking' | 'urgent'                 // profession
  | 'renting'                                        // realEstate
  | 'discover';

export interface Plugin {
  id: Domain;
  handles: (intent: Intent) => boolean;
  journeyOf: (intent: Intent) => Journey;   // الرحلة داخل المجال
}

const registry: Plugin[] = [];

export function registerPlugin(p: Plugin): void {
  if (!registry.some(x => x.id === p.id)) registry.push(p);
}
export function resolvePlugin(intent: Intent): Plugin | undefined {
  return registry.find(p => p.handles(intent));
}
export function listPlugins(): Plugin[] {
  return registry.slice();
}

// ── مجالات AMANZINE الحالية (Plugin = Domain، Journey بداخله) ──
registerPlugin({
  id: 'commerce',
  handles: i => ['buy', 'sell', 'create_store', 'manage'].includes(i),
  journeyOf: i => i === 'sell' ? 'selling' : i === 'create_store' ? 'creating' : i === 'manage' ? 'managing' : 'buying',
});
registerPlugin({
  id: 'profession',
  handles: i => ['find_pro', 'urgent', 'create_service', 'book'].includes(i),
  journeyOf: i => i === 'urgent' ? 'urgent' : i === 'create_service' ? 'creating' : i === 'book' ? 'booking' : 'service',
});
registerPlugin({
  id: 'realEstate',
  handles: i => i === 'rent',
  journeyOf: () => 'renting',
});
