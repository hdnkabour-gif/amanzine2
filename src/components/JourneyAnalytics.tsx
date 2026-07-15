import { useState } from 'react';
import { Activity, Clock, Repeat, Smile, Meh, Frown, ChevronDown } from 'lucide-react';
import { getJourneys, journeyStats, type Journey, type JStep } from '../lib/journey';

// ============================================================
// JourneyAnalytics — عرض بيانات الرحلات للبيتا (Analytics + Replay).
//   من نفس سجلّ الرحلة: نسبة النشر · معدّل «ثوانٍ حتى النتيجة» · الرضا ·
//   نقطة الخروج الأكثر · وإعادة تشغيل أيّ رحلة خطوة بخطوة.
// محليّ بالكامل — مصدر لضبط الثقة/القوالب لاحقًا من سلوك حقيقيّ.
// ============================================================

const PANEL = 'var(--panel,rgba(255,255,255,0.03))';
const BORDER = '1px solid var(--border,rgba(255,255,255,0.08))';
const STEP_AR: Record<string, string> = { start: 'دخل', build: 'فهم النيّة + القالب', assume: 'افترض', question: 'سأل', answer: 'أجاب', skip: 'تخطّى', publish: 'نشر ✓', abandon: 'انسحب ✗' };

export default function JourneyAnalytics() {
  const [journeys] = useState<Journey[]>(getJourneys);
  const [open, setOpen] = useState<string | null>(null);
  const s = journeyStats();
  const green = 'var(--amz-emerald,#0a8f6f)'; const gold = 'var(--amz-gold,#D4A017)';

  if (journeys.length === 0) return (
    <div style={{ background: PANEL, border: BORDER, borderRadius: 14, padding: 16, textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>
      <Activity size={18} style={{ color: green, marginBottom: 6 }} /><div>ما كايناش رحلات بعد — كل نشر عبر «النشر الموحّد» غادي يبان هنا (Analytics + Replay).</div>
    </div>
  );

  const tiles = [
    { i: Activity, l: 'رحلات', v: s.total },
    { i: Repeat, l: 'نسبة النشر', v: s.publishRate + '٪' },
    { i: Clock, l: 'متوسّط الثواني', v: s.avgSec || '—' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Activity size={17} style={{ color: green }} />
        <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--ink1)' }}>رحلات المستخدمين</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink3)', marginInlineStart: 'auto' }}>Analytics · Replay · Seconds-to-Result</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {tiles.map(t => (
          <div key={t.l} style={{ background: PANEL, border: BORDER, borderRadius: 14, padding: '13px 10px', textAlign: 'center' }}>
            <t.i size={16} style={{ color: gold }} />
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink1)', marginTop: 4 }}>{t.v}</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 700 }}>{t.l}</div>
          </div>
        ))}
      </div>

      {/* الرضا + نقطة الخروج */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 150px', background: PANEL, border: BORDER, borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 11.5, color: 'var(--ink3)', fontWeight: 700, marginBottom: 8 }}>الرضا</div>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'space-around' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: green, fontWeight: 800 }}><Smile size={16} /> {s.feedback.good}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: gold, fontWeight: 800 }}><Meh size={16} /> {s.feedback.ok}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--red,#e0475a)', fontWeight: 800 }}><Frown size={16} /> {s.feedback.bad}</span>
          </div>
        </div>
        {s.topDrop && (
          <div style={{ flex: '1 1 150px', background: PANEL, border: BORDER, borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 11.5, color: 'var(--ink3)', fontWeight: 700, marginBottom: 8 }}>أكثر نقطة خروج</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--red,#e0475a)' }}>سؤال «{s.topDrop.key}» — {s.topDrop.count} مرّة</div>
          </div>
        )}
      </div>

      {/* Replay — إعادة تشغيل الرحلات */}
      <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink2)', marginTop: 2 }}>آخر الرحلات (اضغط للإعادة)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {journeys.slice(0, 12).map(j => (
          <div key={j.id} style={{ background: PANEL, border: BORDER, borderRadius: 12, overflow: 'hidden' }}>
            <button onClick={() => setOpen(o => o === j.id ? null : j.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start' }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, flexShrink: 0, background: j.published ? green : 'var(--red,#e0475a)' }} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--ink1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>«{j.raw}»</span>
              {j.seconds != null && <span style={{ fontSize: 11.5, color: 'var(--ink3)', fontWeight: 700 }}>{j.seconds}ث</span>}
              <ChevronDown size={15} style={{ color: 'var(--ink3)', transform: open === j.id ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            </button>
            {open === j.id && (
              <div style={{ padding: '4px 14px 13px', display: 'flex', flexDirection: 'column', gap: 6, borderTop: BORDER }}>
                <div style={{ fontSize: 11, color: 'var(--ink3)', margin: '8px 0 2px' }}>{j.blueprint || '—'} · {j.entity || '—'}{j.twinId ? ` · ${j.twinId}` : ''}</div>
                {j.steps.map((st: JStep, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5 }}>
                    <span style={{ fontSize: 10.5, color: 'var(--ink3)', minWidth: 42, fontVariantNumeric: 'tabular-nums' }}>{(st.t / 1000).toFixed(1)}ث</span>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: st.type === 'publish' ? green : st.type === 'abandon' ? 'var(--red,#e0475a)' : gold, flexShrink: 0 }} />
                    <span style={{ color: 'var(--ink2)', fontWeight: 700 }}>{STEP_AR[st.type] || st.type}</span>
                    {st.key && <span style={{ color: 'var(--ink3)' }}>· {st.key}{st.value != null ? `: ${String(st.value).slice(0, 24)}` : ''}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
