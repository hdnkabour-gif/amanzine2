import { useState, useEffect } from 'react';
import { getToken as getAuthToken } from '../services/api';

// ════════════════════════════════════════════════════════════
// طابور موافقة الأدمن على إعلانات السوق (Marketplace moderation).
// محميّ خلفياً بـ PLATFORM_ADMIN_EMAIL. إضافي — لا يمسّ شيئاً قائماً.
// ════════════════════════════════════════════════════════════

interface Listing {
  id: string; type: 'product' | 'service'; name: string; description: string; price: number;
  category: string; city: string; status: string; rejectReason?: string;
  sellerName: string; sellerPhone: string; duration?: string; workArea?: string; createdAt: string;
}

const TABS: { id: string; label: string }[] = [
  { id: 'pending', label: '⏳ بانتظار المراجعة' },
  { id: 'approved', label: '✅ معتمَدة' },
  { id: 'rejected', label: '❌ مرفوضة' },
  { id: 'suspended', label: '⏸️ موقوفة' },
];

export default function ModerationPage() {
  const [tab, setTab] = useState('pending');
  const [list, setList] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [busy, setBusy] = useState('');
  const tok = () => { try { return getAuthToken() || ''; } catch { return ''; } };

  const load = () => {
    setLoading(true); setForbidden(false);
    fetch(`/api/listings?status=${tab}`, { headers: { Authorization: `Bearer ${tok()}` } })
      .then(async r => {
        if (r.status === 403) { setForbidden(true); return []; }
        const d = await r.json(); return Array.isArray(d) ? d : [];
      })
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [tab]);

  const act = async (id: string, action: 'approve' | 'reject' | 'suspend') => {
    setBusy(id);
    try {
      const reason = action === 'reject' ? (prompt('سبب الرفض (اختياري):') || '') : '';
      const r = await fetch(`/api/listings/${id}/${action}`, {
        method: 'PUT', headers: { Authorization: `Bearer ${tok()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!r.ok) throw new Error();
      setList(l => l.filter(x => x.id !== id));
    } catch { alert('تعذّر تنفيذ الإجراء'); }
    setBusy('');
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 className="page-title">🏪 مراجعة إعلانات السوق</h1>
        <p style={{ fontSize: 13, color: 'var(--ink3)', marginTop: 4 }}>وافِق على الإعلانات قبل ظهورها في السوق الموحّد — الطلبات تذهب مباشرة للبائع.</p>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`chip ${tab === t.id ? 'active' : ''}`}>{t.label}</button>
        ))}
      </div>

      {forbidden ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink2)' }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🔒</div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>هذه الصفحة لمدير المنصّة فقط</div>
          <div style={{ fontSize: 12, color: 'var(--ink3)' }}>اضبط <code>PLATFORM_ADMIN_EMAIL</code> بإيميلك في الخادم للوصول.</div>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--ink3)' }}>جارٍ التحميل...</div>
      ) : list.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--ink3)' }}>
          <div style={{ fontSize: 40, opacity: 0.25, marginBottom: 10 }}>📭</div>
          لا إعلانات في هذه القائمة.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map(l => (
            <div key={l.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: l.type === 'service' ? '#a78bfa' : '#FF9A55', background: l.type === 'service' ? 'rgba(124,58,237,0.14)' : 'var(--ember-soft)', borderRadius: 99, padding: '3px 9px' }}>{l.type === 'service' ? '🔧 خدمة' : '🛍️ منتج'}</span>
                    {l.city && <span style={{ fontSize: 11, color: 'var(--ink3)' }}>📍 {l.city}</span>}
                    {l.category && <span style={{ fontSize: 11, color: 'var(--ink3)' }}>· {l.category}</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>{l.name}</div>
                  {l.description && <div style={{ fontSize: 12.5, color: 'var(--ink2)', marginTop: 4, lineHeight: 1.6 }}>{l.description}</div>}
                  {(l.duration || l.workArea) && <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>{l.duration && `⏱️ ${l.duration}`} {l.workArea && `· 📍 ${l.workArea}`}</div>}
                  <div style={{ fontSize: 12, color: 'var(--ink2)', marginTop: 8 }}>👤 {l.sellerName} · 📱 <span dir="ltr">{l.sellerPhone}</span></div>
                  {l.rejectReason && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>سبب الرفض: {l.rejectReason}</div>}
                </div>
                <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--ember)', whiteSpace: 'nowrap' }}>{(+l.price).toLocaleString()} <span style={{ fontSize: 11, color: 'var(--ink3)' }}>درهم</span></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                {l.status !== 'approved' && <button disabled={busy === l.id} onClick={() => act(l.id, 'approve')} className="btn" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontWeight: 700 }}>✅ موافقة ونشر</button>}
                {l.status !== 'rejected' && <button disabled={busy === l.id} onClick={() => act(l.id, 'reject')} className="btn" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontWeight: 700 }}>❌ رفض</button>}
                {l.status === 'approved' && <button disabled={busy === l.id} onClick={() => act(l.id, 'suspend')} className="btn btn-ghost">⏸️ تعليق</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
