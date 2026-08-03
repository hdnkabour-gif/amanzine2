import { useState } from 'react';
import { Timer, MessageSquare, MousePointerClick, Repeat, LogOut, Rocket, Cpu, CheckCircle2, HelpCircle } from 'lucide-react';
import { receptionStats, journeyStats, decisionStats, clarifyStats, snapshotDaily, trend } from '../lib/journey';

// ============================================================
// BetaMonitorPanel — لوحة بيتا الـ١٠ (قراءة فقط). تُحوّل ما قِسناه إلى أرقامٍ
//   تُقرأ بلمحة: «١٧ وصلوا، ٦ توقّفوا عند X، ٤ شرحوا مرّتين». بياناتٌ من الجهاز
//   (localStorage) — كافيةٌ لبيتا مُراقَبة عن قرب. لا خادم، لا محرّك.
// ============================================================

const BORDER = '1px solid var(--border,rgba(255,255,255,0.08))';
const INK1 = 'var(--ink1,#FAFAFA)';
const INK3 = 'var(--ink3,#7E877F)';
const GREEN = 'var(--amz-emerald,#0a8f6f)';
const GOLD = 'var(--amz-gold,#D4A017)';

function Stat({ icon: Icon, label, value, hint, color = GREEN }: { icon: typeof Timer; label: string; value: string; hint?: string; color?: string }) {
  return (
    <div style={{ flex: '1 1 150px', minWidth: 150, border: BORDER, borderRadius: 13, padding: 14, background: 'var(--panel,rgba(255,255,255,.02))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color, marginBottom: 8 }}><Icon size={15} /><span style={{ fontSize: 12, fontWeight: 800 }}>{label}</span></div>
      <div style={{ fontSize: 22, fontWeight: 900, color: INK1 }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: INK3, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

const MODE_AR: Record<string, string> = { direct: 'مباشر', guided: 'موجّه', confirm: 'تأكيد', welcome: 'ترحيب' };
const INTENT_AR: Record<string, string> = { sell: 'بيع', buy: 'شراء', find_pro: 'مختصّ', urgent: 'عاجل', rent: 'كراء', book: 'حجز', create_service: 'خدمة', create_store: 'متجر' };

export default function BetaMonitorPanel() {
  const [r] = useState(receptionStats);
  const [j] = useState(journeyStats);
  const [d] = useState(decisionStats);
  const [tr] = useState(() => { snapshotDaily(); return trend(); }); // لقطة اليوم + فرقٌ عن أمس
  const [cl] = useState(clarifyStats);

  const secToUnderstand = r.avgUnderstoodMs ? `${(r.avgUnderstoodMs / 1000).toFixed(1)}ث` : '—';
  const guidedPct = d.totalModes ? Math.round(((d.modes.guided || 0) / d.totalModes) * 100) : 0;

  // فرقُ الاتّجاه عن أمس (يظهر فقط حين يوجد تاريخٌ كافٍ). للـUnknown/الرفض: الصعود سيّئ.
  const delta = (v: number | undefined, goodUp: boolean) => {
    if (v == null || v === 0) return null;
    const up = v > 0; const good = up === goodUp;
    return { txt: `${up ? '↑+' : '↓'}${Math.abs(v)}`, color: good ? 'var(--mint,#12A150)' : 'var(--red,#F5484A)' };
  };
  // شريطٌ تنفيذيّ — أوّل شاشة لصاحب المنتج: أرقامٌ تُقرأ بلمحة، اتّجاهٌ عن أمس، والتفاصيل تحته.
  const exec: { label: string; value: string; warn?: boolean; d?: { txt: string; color: string } | null }[] = [
    { label: 'المستخدمون', value: String(r.total), d: delta(tr?.users, true) },
    { label: 'نجح أوّل فهم', value: `${r.understoodRate}٪`, d: delta(tr?.understoodRate, true) },
    { label: 'احتاجوا سؤالًا', value: `${guidedPct}٪` },
    { label: 'رفضوا التأكيد', value: d.confirmAcceptRate != null ? `${100 - d.confirmAcceptRate}٪` : '—', warn: d.confirmAcceptRate != null && d.confirmAcceptRate < 60, d: delta(tr?.confirmReject, false) },
    { label: 'ما لم نفهم', value: String(d.unknown), warn: d.unknown > 0, d: delta(tr?.unknown, false) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* شريط تنفيذيّ */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, border: BORDER, borderRadius: 14, overflow: 'hidden', background: 'var(--panel,rgba(255,255,255,.02))' }}>
        {exec.map((e, i) => (
          <div key={e.label} style={{ flex: '1 1 90px', minWidth: 90, padding: '13px 12px', textAlign: 'center', borderInlineStart: i ? BORDER : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 5 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: e.warn ? 'var(--red,#F5484A)' : INK1 }}>{e.value}</span>
              {e.d && <span style={{ fontSize: 11, fontWeight: 800, color: e.d.color }}>{e.d.txt}</span>}
            </div>
            <div style={{ fontSize: 10.5, color: INK3, marginTop: 2, fontWeight: 700 }}>{e.label}</div>
          </div>
        ))}
      </div>
      {/* قمع الاستقبال — «شنو محتاج؟» */}
      <section>
        <div style={{ fontSize: 14, fontWeight: 900, color: INK1, marginBottom: 4 }}>قمع الاستقبال — «شنو محتاج؟»</div>
        <div style={{ fontSize: 12, color: INK3, marginBottom: 12 }}>هل شعر المستخدم أنّه فُهِم؟ — {r.total} جلسة مُسجّلة على هذا الجهاز.</div>
        {r.total === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: INK3, fontSize: 13, border: BORDER, borderRadius: 13 }}>ما كاين حتى جلسة بعد — ملّي يبدا الناس يكتبو، غادي تبان الأرقام هنا.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Stat icon={Timer} label="زمن أوّل فهم" value={secToUnderstand} hint="من الدخول حتى فهم أوّل طلب" />
            <Stat icon={MessageSquare} label="متوسّط الأدوار" value={String(r.avgTurns)} hint="كم رسالة/اختيار للوصول" />
            <Stat icon={MousePointerClick} label="أزرار مقابل كتابة" value={`${r.buttonRate}٪ / ${r.textRate}٪`} hint="كيف يتفاعل الناس" color={GOLD} />
            <Stat icon={Repeat} label="شرحوا مرّتين" value={`${r.repeatedRate}٪`} hint="إشارة: لم نفهمهم أوّل مرّة" color={r.repeatedRate > 25 ? 'var(--red,#F5484A)' : INK3} />
            <Stat icon={LogOut} label="أكثر نقطة خروج" value={r.topExit ? r.topExit.step : '—'} hint={r.topExit ? `${r.topExit.count} مرّة` : 'أين يتوقّفون'} color={GOLD} />
          </div>
        )}
      </section>

      {/* Decision Layer — هل العقل يقرّر جيّدًا؟ */}
      <section>
        <div style={{ fontSize: 14, fontWeight: 900, color: INK1, marginBottom: 4 }}>قرارات العقل — Decision Layer</div>
        <div style={{ fontSize: 12, color: INK3, marginBottom: 12 }}>أيّ واجهةٍ اختارها العقل، وهل كان الفهم صحيحًا؟ — {d.totalModes} قرار.</div>
        {d.totalModes === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: INK3, fontSize: 13, border: BORDER, borderRadius: 13 }}>باقي حتى قرار — غادي يتسجّل ملّي يكتب الناس.</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
              {(['direct', 'guided', 'confirm', 'welcome'] as const).map(m => {
                const n = d.modes[m] || 0; const pct = d.totalModes ? Math.round((n / d.totalModes) * 100) : 0;
                return <Stat key={m} icon={Cpu} label={MODE_AR[m]} value={`${pct}٪`} hint={`${n} مرّة`} color={GOLD} />;
              })}
              <Stat icon={CheckCircle2} label="قبول «صح؟»" value={d.confirmAcceptRate != null ? `${d.confirmAcceptRate}٪` : '—'}
                hint={`✅ ${d.confirmYes} · ❌ ${d.confirmNo}`}
                color={d.confirmAcceptRate != null && d.confirmAcceptRate < 60 ? 'var(--red,#F5484A)' : GREEN} />
            </div>
            {/* قبول «صح؟» حسب الثقة — ثقةٌ عالية برفضٍ عالٍ ⇒ مشكلة فهمٍ (parseNeed) لا قرار */}
            {(d.confirmYes + d.confirmNo) > 0 && (
              <div style={{ fontSize: 12, color: INK3, marginBottom: 6 }}>
                قبول «صح؟» حسب الثقة: منخفضة {d.acceptByConfidence.low ?? '—'}٪ · متوسّطة {d.acceptByConfidence.mid ?? '—'}٪ · عالية {d.acceptByConfidence.high ?? '—'}٪
                <div style={{ fontSize: 11, marginTop: 2 }}>💡 ثقةٌ عالية برفضٍ عالٍ = مشكلة فهم (parseNeed)، لا قرار.</div>
              </div>
            )}
            {d.topIntents.length > 0 && (
              <div style={{ fontSize: 12, color: INK3, marginBottom: d.topUnknown.length ? 10 : 0 }}>
                أكثر الطلبات: {d.topIntents.map(t => `${INTENT_AR[t.intent] || t.intent} (${t.count})`).join(' · ')}
              </div>
            )}
            {/* أكثر ما لم نفهم — كنز تطوير المعرفة (لا التخمين) */}
            {d.topUnknown.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--red,#F5484A)', marginBottom: 6 }}>أكثر ما لم نفهم — طوّر المعرفة من هنا</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {d.topUnknown.map(u => (
                    <div key={u.text} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, color: INK1, padding: '5px 10px', borderRadius: 8, background: 'var(--panel,rgba(255,255,255,.03))', border: BORDER }}>
                      <span dir="rtl" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>«{u.text}»</span>
                      <span style={{ color: INK3, fontWeight: 800, flexShrink: 0 }}>{u.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── أيُّ سؤالٍ يستحقّ البقاء؟ ─────────────────────────────
          `clarifyStats()` كانت مبنيّةً ومُصدَّرةً **ولا يقرؤها أحد** — نفسُ
          صنفِ سجلِّ التدقيق: قياسٌ يُكتَب ولا يُعرَض. وهي بالضبط ما يُجيب
          `UNKNOWN_AREAS#٦`: «هل ترفع الاستيضاحاتُ الفهمَ فعلًا؟» — سؤالٌ لم
          يكن له جوابٌ ممكنٌ قبل إغلاق الحلقة (BROKEN_CHAINS#④).

          الهويّةُ الثابتة هي ما يُقاس، لا نصُّ السؤال: النصُّ يتبدّل باللغة
          والصياغة، والمعنى يبقى. */}
      <section>
        <div style={{ fontSize: 14, fontWeight: 900, color: INK1, marginBottom: 4 }}>الاستيضاح — أيُّ سؤالٍ يستحقّ البقاء؟</div>
        <div style={{ fontSize: 11.5, color: INK3, marginBottom: 10 }}>
          «رفع الفهم» = نسبةُ الأجوبة التي زادت الثقةَ فعلًا. سؤالٌ يُجاب كثيرًا ولا يرفع شيئًا سؤالٌ زائد.
        </div>
        {cl.length === 0 ? (
          <div style={{ fontSize: 12.5, color: INK3, padding: '10px 0' }}>
            لا استيضاحَ سُئل بعدُ على هذا الجهاز — الأرقامُ تظهر بعد أوّل حوارٍ ناقص.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {cl.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12.5, color: INK1, padding: '7px 11px', borderRadius: 9, background: 'var(--panel,rgba(255,255,255,.03))', border: BORDER }}>
                <HelpCircle size={13} style={{ color: GOLD, flexShrink: 0 }} />
                <span dir="ltr" style={{ fontWeight: 800, minWidth: 130 }}>{c.id}</span>
                <span style={{ color: INK3 }}>سُئل {c.asked}</span>
                <span style={{ color: INK3 }}>· أُجيب {c.answerRate ?? '—'}٪</span>
                <span style={{
                  marginRight: 'auto', fontWeight: 800,
                  color: c.liftRate == null ? INK3 : c.liftRate >= 50 ? GREEN : 'var(--red,#F5484A)',
                }}>
                  رفعَ الفهم {c.liftRate ?? '—'}٪{c.avgGain != null ? ` (+${c.avgGain} نقطة)` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* قمع النشر — من journey.ts */}
      <section>
        <div style={{ fontSize: 14, fontWeight: 900, color: INK1, marginBottom: 12 }}>قمع النشر</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Stat icon={Rocket} label="نسبة النشر" value={`${j.publishRate}٪`} hint={`${j.published}/${j.total} رحلة`} />
          <Stat icon={Timer} label="متوسّط الثواني" value={j.avgSec ? `${j.avgSec}ث` : '—'} hint="حتى النشر" color={GOLD} />
          <Stat icon={LogOut} label="أكثر نقطة تعثّر" value={j.topDrop ? j.topDrop.key : '—'} hint={j.topDrop ? `${j.topDrop.count} انسحاب` : 'أين يتركون النشر'} color={GOLD} />
        </div>
        <div style={{ fontSize: 11.5, color: INK3, marginTop: 10 }}>الرضا: 😀 {j.feedback.good} · 😐 {j.feedback.ok} · 😞 {j.feedback.bad}</div>
      </section>

      <div style={{ fontSize: 11, color: INK3, borderTop: BORDER, paddingTop: 10 }}>
        💡 هذه أرقام <b>هذا الجهاز</b> — في البيتا المُراقَبة، اجلس بجانب المستخدم وقارنها بما تراه. «ما لم نفهمه» في تبويب «العقل الحيّ».
      </div>
    </div>
  );
}
