import { useEffect, useState } from 'react';
import { Activity, Search, CheckCircle2, XCircle, MapPin, Wrench, RefreshCw } from 'lucide-react';
import { knowledgeAPI, type BrainStats } from '../services/api';

// ============================================================
// نبض المنصّة — اللوحة الوحيدة التي تُقرأ كلّ صباح. مصدرها **الخادم** لا المتصفّح:
//   كلّ اللوحات الأخرى (البيتا/العقل الحيّ) تقرأ localStorage ⇒ تعرض بيانات جهازك
//   أنت فقط. هذه تقرأ /api/knowledge/brain ⇒ ما فعله **كلّ** المستخدمين.
//   تجيب: كم بحثًا؟ كم فُهم؟ كم لم يُفهَم؟ أفضل مدينة؟ أفضل خدمة؟
// ============================================================

const INK1 = 'var(--ink1,#FAFAFA)';
const INK3 = 'var(--ink3,#7E877F)';
const LINE = '1px solid var(--line,rgba(255,255,255,.08))';
const CARD = 'color-mix(in srgb, #fff 3%, transparent)';

const pct = (n?: number) => (typeof n === 'number' ? Math.round(n * 100) : 0);

function Stat({ icon: Icon, label, value, sub, tone }: {
  icon: typeof Search; label: string; value: string; sub?: string; tone?: string;
}) {
  return (
    <div style={{ flex: '1 1 150px', minWidth: 150, padding: '14px 16px', borderRadius: 14, background: CARD, border: LINE }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <Icon size={14} style={{ color: tone || INK3 }} />
        <span style={{ fontSize: 11.5, color: INK3, fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: tone || INK1, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: INK3, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function Bars({ title, icon: Icon, rows, empty }: {
  title: string; icon: typeof MapPin; rows: { label: string; total: number; hits?: number }[]; empty: string;
}) {
  const max = Math.max(1, ...rows.map(r => r.total));
  return (
    <div style={{ flex: '1 1 280px', minWidth: 260, padding: '14px 16px', borderRadius: 14, background: CARD, border: LINE }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
        <Icon size={14} style={{ color: INK3 }} />
        <span style={{ fontSize: 12.5, fontWeight: 800, color: INK1 }}>{title}</span>
      </div>
      {rows.length === 0
        ? <div style={{ fontSize: 12, color: INK3, lineHeight: 1.7 }}>{empty}</div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {rows.map(r => (
              <div key={r.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: INK1, fontWeight: 650 }}>{r.label}</span>
                  <span style={{ color: INK3 }}>
                    {r.total}{typeof r.hits === 'number' && r.total > 0 ? ` · ${Math.round((r.hits / r.total) * 100)}%` : ''}
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${(r.total / max) * 100}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#0a8f6f,#D4A017)' }} />
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

export default function PlatformPulsePanel() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<BrainStats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const load = (d: number) => {
    setBusy(true); setErr(null);
    knowledgeAPI.brain(d)
      .then(r => setData(r))
      .catch(e => setErr(e?.message || 'تعذّر جلب البيانات — تحقّق من الاتّصال ومن صلاحية الأدمن.'))
      .finally(() => setBusy(false));
  };

  useEffect(() => { load(days); }, [days]);

  const q = data?.quality || {};
  const total = q.total ?? data?.searches ?? 0;
  const hits = q.hits ?? 0;
  const misses = q.misses ?? Math.max(0, total - hits);
  const rate = pct(q.successRate ?? data?.score?.searchSuccess);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* رأس + مدى زمنيّ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={17} style={{ color: '#0a8f6f' }} />
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 900, color: INK1 }}>نبض المنصّة</div>
            <div style={{ fontSize: 11, color: INK3 }}>بياناتُ الخادم — كلّ المستخدمين، لا جهازك وحده</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {[1, 7, 30].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{ padding: '6px 12px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                border: days === d ? '1px solid #0a8f6f' : LINE,
                background: days === d ? 'color-mix(in srgb,#0a8f6f 18%,transparent)' : 'transparent',
                color: days === d ? INK1 : INK3 }}>
              {d === 1 ? 'اليوم' : `${d} يوم`}
            </button>
          ))}
          <button onClick={() => load(days)} aria-label="تحديث" title="تحديث"
            style={{ padding: 7, borderRadius: 10, border: LINE, background: 'transparent', color: INK3, cursor: 'pointer', display: 'flex' }}>
            <RefreshCw size={14} style={{ animation: busy ? 'spin 1s linear infinite' : undefined }} />
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {err && (
        <div style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.06)', color: '#FCA5A5', fontSize: 12.5, lineHeight: 1.7 }}>
          {err}
        </div>
      )}

      {/* الأرقام الخمسة */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <Stat icon={Search} label="كم بحثًا" value={busy && !data ? '…' : String(total)} sub={`آخر ${days === 1 ? 'يوم' : days + ' يوم'}`} />
        <Stat icon={CheckCircle2} label="فُهم (أعطى نتائج)" value={busy && !data ? '…' : String(hits)} tone="#22C55E" sub={`${rate}% نسبة النجاح`} />
        <Stat icon={XCircle} label="لم يُفهَم / بلا نتيجة" value={busy && !data ? '…' : String(misses)} tone={misses > 0 ? '#F59E0B' : undefined} sub="كنز تطوير المعرفة" />
      </div>

      {/* أفضل مدينة · أفضل خدمة */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <Bars title="أفضل مدينة" icon={MapPin} empty="لا بيانات بعد — تظهر مع أوّل بحث حقيقيّ."
          rows={(data?.topCities || []).map(c => ({ label: c.city, total: c.total, hits: c.hits }))} />
        <Bars title="أفضل خدمة" icon={Wrench} empty="لا بيانات بعد — تُجمَع من عمليّات البحث الحقيقيّة."
          rows={(data?.topTerms || []).map(t => ({ label: t.term, total: t.total, hits: t.hits }))} />
      </div>

      {/* ما لم نفهمه — أهمّ قائمة: منها تُضاف المفاهيم الجديدة */}
      <div style={{ padding: '14px 16px', borderRadius: 14, background: CARD, border: LINE }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: INK1, marginBottom: 4 }}>أكثر ما لم نفهمه</div>
        <div style={{ fontSize: 11, color: INK3, marginBottom: 10 }}>
          هذه القائمة هي حلقة التعلّم: أضِف أهمّها إلى المعرفة، ثمّ راقب ارتفاع نسبة النجاح.
        </div>
        {(data?.topMisses || []).length === 0
          ? <div style={{ fontSize: 12, color: INK3 }}>لا شيء بعد — إمّا لا بحث بعد، أو كلّ شيء مفهوم 👌</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {(data!.topMisses as any[]).slice(0, 10).map((m, i) => (
                <div key={m.id || i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, padding: '7px 10px', borderRadius: 9, background: 'rgba(255,255,255,.02)' }}>
                  <span style={{ color: INK1, fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.raw || m.normalized}</span>
                  <span style={{ color: INK3, flexShrink: 0 }}>{m.count ?? 1}× {m.city ? `· ${m.city}` : ''}</span>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
