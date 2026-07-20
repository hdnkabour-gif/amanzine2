// ============================================================
// AKG — نقطة الدخول لـ Application DNA. استيراد هذا الملفّ يُسجّل الخدمات،
// الوحدات، وواصفات الصفحات تلقائيًّا، ثمّ يفتح استعلامات العقل والمسار الكامل.
// طبقات: CORE → SERVICES → MODULES → BRAINS.
//   import { resolveDna, getPageCapability, allModules, ... } from '../lib/akg';
// ============================================================

import './services';       // side-effect: يُسجّل الخدمات المشتركة
import './modules';        // side-effect: يُسجّل الوحدات (المجالات)
import './pages';          // side-effect: يُسجّل واصفات الصفحات

export * from './registry';
export * from './services';
export * from './modules';
export * from './relations';
export * from './widgets';
export * from './schema';
export * from './viewModel';
export * from './pageRegistry';
export * from './workflow';
export * from './world';
export * from './userGraph';
export * from './capabilities';
export * from './resolver';
export * from './decision';
export * from './planner';
export * from './actionPlanner';
export * from './policies';
export * from './uiContract';
export * from './dna';
export * from './systemMap';
export * from './describe';
export type {
  PageCapability, PageField, PageAction, FieldKind, CapMode,
} from './registry';
export type { AppService, ServiceKind } from './services';
export type { AppModule, ModuleWorkflow } from './modules';
export type { Relation } from './relations';
export type { WorldState, Season, PartOfDay } from './world';
export type { UserProfile } from './userGraph';
export type { CapabilityState } from './capabilities';
export type { Capability, CapabilityPlan, CapKind } from './resolver';
export type { FieldDecision, Decisions, DecisionKind, DecisionSource } from './decision';
export type { PlannerState, PlannerQuestion } from './planner';
export type { ActionPlan, PlannedAction, ActionKind } from './actionPlanner';
export type { PolicyAction, PolicyResult, PolicyContext, PolicyDecision } from './policies';
export type { DnaPath } from './dna';
