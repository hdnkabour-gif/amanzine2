import { useState, lazy, Suspense } from 'react';
import { Brain, Map, Activity, GraduationCap, Cpu, Search, Crown, LineChart, HeartPulse, PlusCircle, Users } from 'lucide-react';
import AppKnowledgePanel from '../components/AppKnowledgePanel';
import SystemMapPanel from '../components/SystemMapPanel';
import LiveBrainPanel from '../components/LiveBrainPanel';
import ExplainPanel from '../components/ExplainPanel';
import OwnerConsolePanel from '../components/OwnerConsolePanel';
import PlatformPulsePanel from '../components/PlatformPulsePanel';
import AddConceptPanel from '../components/AddConceptPanel';
import NeedDemandPanel from '../components/NeedDemandPanel';
import BetaMonitorPanel from '../components/BetaMonitorPanel';

// ============================================================
// ControlCenter — «مركز القيادة» للمطوّر/الأدمن (المرحلة أ — قراءة فقط). منصّة
//   داخل المنصّة (ADR-0002): تعرض التطبيق كما يعرف نفسه، ببطاقات موصولة بنفس
//   السجلّات والعقل. أربعة مراكز:
//     🧠 العقل        — DNA + متتبّع understand() الحيّ (AppKnowledgePanel)
//     🗺️ خريطة النظام — ما يوجد/اليتامى/الروابط المكسورة (SystemMapPanel)
//     ⚡ العقل الحيّ    — آخر ما فُهم وما لم يُفهَم (LiveBrainPanel)
//     📚 التعلّم       — الاعتماد البشريّ للمعرفة (KnowledgeStudio)
//   بلا Teach/Approve جديد هنا بعد — ذلك المرحلة ب. لا يكسر شيئًا؛ يوحّد ما بُني.
// ============================================================

const KnowledgeStudio = lazy(() => import('./KnowledgeStudio'));

const BORDER = '1px solid var(--border,rgba(255,255,255,0.08))';
const INK1 = 'var(--ink1,#FAFAFA)';
const INK3 = 'var(--ink3,#7E877F)';
const GREEN = 'var(--amz-emerald,#0a8f6f)';

type TabId = 'pulse' | 'demand' | 'add' | 'owner' | 'beta' | 'brain' | 'map' | 'explain' | 'live' | 'learn';
const TABS: { id: TabId; label: string; icon: typeof Brain }[] = [
  { id: 'pulse', label: 'نبض المنصّة', icon: HeartPulse },
  { id: 'demand', label: 'الطلب غير الملبّى', icon: Users },
  { id: 'add', label: 'إضافة مفهوم', icon: PlusCircle },
  { id: 'owner', label: 'المالك', icon: Crown },
  { id: 'beta', label: 'البيتا', icon: LineChart },
  { id: 'brain', label: 'العقل', icon: Brain },
  { id: 'map', label: 'خريطة النظام', icon: Map },
  { id: 'explain', label: 'التفسير', icon: Search },
  { id: 'live', label: 'العقل الحيّ', icon: Activity },
  { id: 'learn', label: 'التعلّم', icon: GraduationCap },
];

export default function ControlCenter() {
  const [tab, setTab] = useState<TabId>('pulse');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: GREEN, background: `color-mix(in srgb, ${GREEN} 14%, transparent)` }}><Cpu size={22} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: INK1 }}>مركز القيادة</div>
          <div style={{ fontSize: 12.5, color: INK3 }}>التطبيق كما يعرف نفسه — عقلٌ، خريطة، حياة، وتعلّم. قراءة فقط.</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, padding: '5px 10px', borderRadius: 99, border: BORDER, color: INK3 }}>المرحلة أ</span>
      </div>

      {/* tabs */}
      <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button key={t.id} role="tab" aria-selected={active} onClick={() => setTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 11, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 800, cursor: 'pointer',
                border: active ? `1.5px solid ${GREEN}` : BORDER,
                background: active ? `color-mix(in srgb, ${GREEN} 12%, transparent)` : 'transparent',
                color: active ? GREEN : INK3 }}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* body */}
      <div>
        {tab === 'pulse' && <PlatformPulsePanel />}
        {tab === 'demand' && <NeedDemandPanel />}
        {tab === 'add' && <AddConceptPanel />}
        {tab === 'owner' && <OwnerConsolePanel />}
        {tab === 'beta' && <BetaMonitorPanel />}
        {tab === 'brain' && <AppKnowledgePanel />}
        {tab === 'map' && <SystemMapPanel />}
        {tab === 'explain' && <ExplainPanel />}
        {tab === 'live' && <LiveBrainPanel />}
        {tab === 'learn' && (
          <Suspense fallback={<div style={{ padding: 24, textAlign: 'center', color: INK3, fontSize: 13 }}>جاري التحميل…</div>}>
            <KnowledgeStudio />
          </Suspense>
        )}
      </div>
    </div>
  );
}
