import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  receptionStart, receptionTurn, receptionUnderstood, receptionStep, receptionEnd, receptionStats,
  recordDecision, recordConfirm, decisionStats, trend,
} from '../../src/lib/journey';

// قمع الاستقبال — مقاييس بيتا الـ١٠ (زمن أوّل فهم/أدوار/أزرار مقابل كتابة/شرح مرّتين/خروج).
// setup.ts يوفّر polyfill لـ localStorage.

function fresh() { try { localStorage.removeItem('amanzine_receptions'); } catch { /* noop */ } }

test('استقبالٌ كامل: أدوار + فهم + نقطة خروج تُسجَّل', () => {
  fresh();
  receptionStart();
  receptionTurn('عندي مشكل فالدار', 'text');
  receptionUnderstood();
  receptionTurn('الماء', 'button');
  receptionStep('find_pro');
  receptionEnd('routed');
  const s = receptionStats();
  assert.equal(s.total, 1);
  assert.equal(s.avgTurns, 2);
  assert.equal(s.textRate, 100, 'استعمل الكتابة');
  assert.equal(s.buttonRate, 100, 'واستعمل الأزرار');
  assert.equal(s.topExit?.step, 'find_pro', 'نقطة الخروج = النيّة');
});

test('«شرح نفسه مرّتين» يُكتشَف بتشابه الجمل', () => {
  fresh();
  receptionStart();
  receptionTurn('بغيت سباك فالدار البيضاء', 'text');
  receptionTurn('بغيت سباك فالدار البيضاء دابا', 'text'); // شبه مطابقة
  receptionEnd('routed');
  assert.equal(receptionStats().repeatedRate, 100);
});

test('جملتان مختلفتان لا تُحسبان تكرارًا', () => {
  fresh();
  receptionStart();
  receptionTurn('بغيت سباك', 'text');
  receptionTurn('عندي طوموبيل نبيعها', 'text');
  receptionEnd('routed');
  assert.equal(receptionStats().repeatedRate, 0);
});

test('Decision log: أوضاع + طلبات + unknown + reason', () => {
  try { localStorage.removeItem('amanzine_decisions'); } catch { /* noop */ }
  recordDecision('guided', 'find_pro', 'النيّة تحتاج توضيحًا');
  recordDecision('confirm', 'buy', 'يقينٌ متوسّط');
  recordDecision('welcome', 'unknown', 'نيّةٌ غير واضحة');
  const s = decisionStats();
  assert.equal(s.totalModes, 3);
  assert.equal(s.unknown, 1, 'قرارٌ واحد على نيّةٍ غامضة');
  assert.equal(s.topIntents[0].intent, 'find_pro');
  assert.ok(s.topReasons.length >= 1, 'الأسباب تُسجَّل');
});

test('Trend: فرقُ اليوم عن أمس من لقطتين', () => {
  try {
    localStorage.setItem('amanzine_snapshots', JSON.stringify([
      { date: '2026-07-20', understoodRate: 76, unknown: 4, confirmReject: 22, users: 8 },
      { date: '2026-07-21', understoodRate: 82, unknown: 7, confirmReject: 18, users: 12 },
    ]));
  } catch { /* noop */ }
  const t = trend();
  assert.ok(t, 'يوجد اتّجاه');
  assert.equal(t!.understoodRate, 6, 'الفهم ↑+٦');
  assert.equal(t!.unknown, 3, 'Unknown ↑+٣');
  assert.equal(t!.users, 4);
});

test('Trend: لا اتّجاه بلقطةٍ واحدة', () => {
  try { localStorage.setItem('amanzine_snapshots', JSON.stringify([{ date: '2026-07-21', understoodRate: 82, unknown: 7, confirmReject: 18, users: 12 }])); } catch { /* noop */ }
  assert.equal(trend(), null);
});

test('قبول التأكيد حسب الثقة يكشف مشكلة الفهم', () => {
  try { localStorage.removeItem('amanzine_decisions'); } catch { /* noop */ }
  // ثقةٌ عالية لكن رُفضت مرّتين ⇒ مشكلة فهم لا قرار
  recordConfirm(false, 0.82);
  recordConfirm(false, 0.80);
  recordConfirm(true, 0.55);   // متوسّطة: قُبلت
  const s = decisionStats();
  assert.equal(s.acceptByConfidence.high, 0, 'العالية: قبول ٠٪ (مشكلة فهم)');
  assert.equal(s.acceptByConfidence.mid, 100, 'المتوسّطة: قبول ١٠٠٪');
});
