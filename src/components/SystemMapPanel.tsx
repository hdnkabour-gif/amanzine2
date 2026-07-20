import { useMemo } from 'react';
import { Map, AlertTriangle, CheckCircle2, Link2Off } from 'lucide-react';
import { computeSystemMap, type SystemMap } from '../lib/akg/systemMap';

// ============================================================
// SystemMapPanel — «التطبيق يعرف نفسه» (قراءة فقط). يعرض صورة النظام المحسوبة
//   من السجلّات (لا من الكود — القانون #2): كم وحدة/صفحة/كيان/مهنة/عطل…، ثم
//   «اليتامى» (خدمة لا تستعملها صفحة، قدرة لا يطلبها عطل) و«الروابط المكسورة».
//   لا منطق قرار هنا — يعرض ما يحسبه computeSystemMap فقط (القانون #4).
// ============================================================

const PANEL = 'var(--panel,rgba(255,255,255,0.03))';
const BORDER = '1px solid var(--border,rgba(255,255,255,0.08))';
const INK1 = 'var(--ink1,#FAFAFA)';
const INK3 = 'var(--ink3,#7E877F)';
const GREEN = 'var(--amz-emerald,#0a8f6f)';
const RED = 'var(--red,#F5484A)';
const AMBER = 'var(--amber,#F59E0B)';

const COUNT_LABELS: Record<string, string> = {
  modules: 'وحدات', services: 'خدمات', pages: 'صفحات', pageDefs: 'واصفات صفحات',
  entities: 'كيانات', professions: 'مهن', problems: 'أعطال', kbCapabilities: 'قدرات معرفيّة',
  symptoms: 'أعراض', vocabulary: 'مفردات', cities: 'مدن',
};

export default function SystemMapPanel() {
  const map = useMemo<SystemMap>(() => computeSystemMap(), []);
  const { counts, orphanServices, orphanKbCapabilities, issues } = map;
  const healthy = issues.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GREEN, background: `color-mix(in srgb, ${GREEN} 15%, transparent)` }}><Map size={18} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15.5, fontWeight: 900, color: INK1 }}>خريطة النظام</div>
          <div style={{ fontSize: 12, color: INK3 }}>ما يعرفه التطبيق عن نفسه — محسوب من السجلّات لا من الكود</div>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, padding: '5px 11px', borderRadius: 99, border: BORDER, color: healthy ? GREEN : RED }}>
          {healthy ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
          {healthy ? 'سليم' : `${issues.length} رابط مكسور`}
        </span>
      </div>

      {/* counts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(96px,1fr))', gap: 8 }}>
        {Object.entries(counts).map(([k, v]) => (
          <div key={k} style={{ background: PANEL, border: BORDER, borderRadius: 12, padding: '11px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 19, fontWeight: 900, color: INK1 }}>{v}</div>
            <div style={{ fontSize: 10.5, color: INK3, marginTop: 2 }}>{COUNT_LABELS[k] || k}</div>
          </div>
        ))}
      </div>

      {/* broken links — سلامة السجلّات */}
      {issues.length > 0 && (
        <div style={{ background: `color-mix(in srgb, ${RED} 6%, ${PANEL})`, border: `1px solid ${RED}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, color: RED }}>
            <Link2Off size={14} /> روابط مكسورة · {issues.length}
          </div>
          {issues.map((it, i) => (
            <div key={i} style={{ padding: '9px 14px', borderTop: BORDER, fontSize: 12.5, color: INK1, lineHeight: 1.5 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: RED, opacity: .8 }}>{it.kind}</span>
              <div style={{ color: INK1 }}>{it.detail}</div>
            </div>
          ))}
        </div>
      )}

      {/* orphans — تحذير لا خطأ */}
      <OrphanList title="خدمات غير مستعمَلة" hint="مسجّلة لكن لا تستعملها أيّ صفحة أو وحدة" items={orphanServices} />
      <OrphanList title="قدرات معرفيّة غير مطلوبة" hint="مسجّلة لكن لا يطلبها أيّ عطل" items={orphanKbCapabilities} />

      <p style={{ fontSize: 11.5, color: INK3, lineHeight: 1.7, textAlign: 'center', margin: 0 }}>
        كل رقم هنا مصدره سجلّ يعلن عن نفسه — لا قراءة للكود المصدريّ (القانون #2). اليتيم ليس خطأً، بل بذرة تنتظر ربطًا.
      </p>
    </div>
  );
}

function OrphanList({ title, hint, items }: { title: string; hint: string; items: string[] }) {
  return (
    <div style={{ background: PANEL, border: BORDER, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 800, color: INK1 }}>
        <span style={{ color: items.length ? AMBER : GREEN }}>{items.length ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}</span>
        {title} {items.length > 0 && <span style={{ color: AMBER }}>· {items.length}</span>}
      </div>
      <div style={{ padding: '2px 14px 12px', fontSize: 11, color: INK3 }}>{hint}</div>
      {items.length === 0
        ? <div style={{ padding: '0 14px 13px', fontSize: 12.5, color: GREEN }}>لا يوجد — كلّ شيء موصول 👌</div>
        : (
          <div style={{ padding: '0 14px 13px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {items.map(id => (
              <span key={id} className="mono" style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 9px', borderRadius: 8, border: `1px solid ${AMBER}`, color: AMBER, background: `color-mix(in srgb, ${AMBER} 8%, transparent)` }}>{id}</span>
            ))}
          </div>
        )}
    </div>
  );
}
