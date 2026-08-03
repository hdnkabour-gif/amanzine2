import { useEffect, useState } from 'react';
import { providersAPI, type Provider } from '../services/api';
import { Store, Wrench, ArrowLeft, BadgeCheck } from 'lucide-react';
import type { Page } from '../types';

// ============================================================
// أنشطتي — BROKEN_CHAINS#⑨.
//
//   `providers.user_id` فهرسٌ **غيرُ فريد** (مُتحقَّقٌ من `pg_indexes`): الحسابُ
//   الواحد يملك أنشطةً متعدّدة. والخادمُ يُرجعها كلَّها من `GET /api/providers`.
//   لكنّ الواجهةَ لم تكن تعرضها إلّا داخل «الحجوزات» بوصفها **مقدّمي خدماتٍ
//   تديرهم** — لا بوصفها **أنشطتَك أنت**. فما يسمح به المخطّطُ تمنعه التجربة.
//
//   ما لا نفعله هنا عمدًا: **مبدّلُ نشاطٍ** (activity switcher). لا شيءَ في
//   بقيّة التطبيق مُقيَّدٌ بنشاطٍ واحد — المنتجاتُ والطلباتُ كلُّها للحساب.
//   فمبدّلٌ يوهم بعزلٍ لا وجودَ له كذبةٌ أكبرُ من الإخفاء. نعرض الحقيقةَ كما
//   هي: هذه أنشطتُك، وهذا مكانُ كلٍّ منها.
// ============================================================

const STATUS_AR: Record<string, { t: string; c: string }> = {
  pending:   { t: 'بانتظار الموافقة', c: '#fbbf24' },
  approved:  { t: 'معتمد',            c: '#34d399' },
  rejected:  { t: 'مرفوض',            c: '#f87171' },
  suspended: { t: 'معلّق',            c: '#f87171' },
};

export default function MyActivities({ storeName, storeCity, onOpen }: {
  storeName: string;
  storeCity?: string;
  onOpen: (p: Page) => void;
}) {
  const [providers, setProviders] = useState<Provider[] | null>(null);

  useEffect(() => {
    providersAPI.list().then(setProviders).catch(() => setProviders([]));
  }, []);

  // المتجرُ نشاطٌ دائمًا — لكلّ حسابٍ واحد. المزوّدون يُضافون فوقه.
  const count = 1 + (providers?.length ?? 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink2)' }}>أنشطتي</div>
        <div style={{ fontSize: 11.5, color: 'var(--ink3)' }}>
          {providers === null ? '…' : count === 1 ? 'نشاطٌ واحد' : `${count} أنشطة`}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={() => onOpen('dashboard')} style={row}>
          <Store size={17} style={{ color: 'var(--ember,#FF6A00)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink1)' }}>{storeName || 'متجري'}</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>
              متجر{storeCity ? ` · ${storeCity}` : ''} — منتجات، طلبات، توصيل
            </div>
          </div>
          <ArrowLeft size={15} style={{ color: 'var(--ink3)', flexShrink: 0 }} />
        </button>

        {(providers || []).map(p => {
          const st = STATUS_AR[p.status || 'pending'] || STATUS_AR.pending;
          return (
            <button key={p.id} onClick={() => onOpen('bookings')} style={row}>
              <Wrench size={17} style={{ color: '#a78bfa', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink1)' }}>{p.name}</span>
                  {p.isVerified && <BadgeCheck size={13} style={{ color: '#3b82f6' }} />}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>
                  خدمة{p.city ? ` · ${p.city}` : ''} · <span style={{ color: st.c }}>{st.t}</span>
                </div>
              </div>
              <ArrowLeft size={15} style={{ color: 'var(--ink3)', flexShrink: 0 }} />
            </button>
          );
        })}

        {providers !== null && providers.length === 0 && (
          <button onClick={() => onOpen('publish')} style={{ ...row, borderStyle: 'dashed' }}>
            <Wrench size={17} style={{ color: 'var(--ink3)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink2)' }}>زِد نشاطًا آخر</div>
              <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 2 }}>
                حسابٌ واحدٌ يحمل متجرًا وخدماتٍ معًا — بلا حسابٍ ثانٍ
              </div>
            </div>
            <ArrowLeft size={15} style={{ color: 'var(--ink3)', flexShrink: 0 }} />
          </button>
        )}
      </div>
    </div>
  );
}

const row: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
  padding: '12px 14px', borderRadius: 14,
  background: 'var(--panel,rgba(255,255,255,.03))',
  border: '1px solid var(--border,rgba(255,255,255,.08))',
  cursor: 'pointer', fontFamily: 'inherit',
};
