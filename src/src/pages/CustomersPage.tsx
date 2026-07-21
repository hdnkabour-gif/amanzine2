import { useState, useMemo } from 'react';
import { useStore } from '../store';
import type { Customer } from '../types';
import { Plus, Search, Star, Phone, MapPin, MessageCircle, Check, X, Edit2, ChevronRight, Trash2 } from 'lucide-react';

const STATUS_AR: Record<string,string> = {
  pending:'⏳',approved:'✅',processing:'⚙️',shipped:'🚚',delivered:'📦',cancelled:'❌',
};

export default function CustomersPage() {
  const { customers, orders, addCustomer, updateCustomer, deleteCustomer, settings, notify } = useStore();
  const [search, setSearch] = useState('');
  const [src, setSrc] = useState('all');
  const [vipOnly, setVipOnly] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<{ name: string; phone: string; city: string; address: string; source: Customer['source']; notes: string; vip: boolean }>({
    name: '', phone: '', city: '', address: '', source: 'WhatsApp', notes: '', vip: false,
  });
  const [editForm, setEditForm] = useState<Partial<Customer>>({});
  const { currency } = settings.brand;

  const thisMonth = new Date().toISOString().slice(0, 7);

  const filtered = customers
    .filter(c =>
      (!search || c.name.includes(search) || c.phone.includes(search) || c.city.includes(search)) &&
      (src === 'all' || c.source === src) &&
      (!vipOnly || c.vip)
    )
    .sort((a, b) => b.totalSpent - a.totalSpent);

  const total = customers.reduce((s, c) => s + c.totalSpent, 0);
  const vips = customers.filter(c => c.vip).length;
  const newThisMonth = customers.filter(c => c.createdAt?.startsWith(thisMonth)).length;

  const save = () => {
    if (!form.name.trim()) { notify('error', '❌ اسم الزبون مطلوب'); return; }
    if (!form.phone.trim()) { notify('error', '❌ رقم الهاتف مطلوب'); return; }
    const dup = customers.find(c => c.phone.replace(/\D/g,'') === form.phone.replace(/\D/g,''));
    if (dup) { notify('warning', `⚠️ هذا الرقم مسجل مسبقاً للزبون "${dup.name}"`); return; }
    addCustomer({ ...form });
    notify('success', `✅ تمت إضافة "${form.name}" بنجاح`);
    setForm({ name: '', phone: '', city: '', address: '', source: 'WhatsApp', notes: '', vip: false });
    setShowAdd(false);
  };

  const saveEdit = () => {
    if (!selected) return;
    updateCustomer(selected.id, editForm);
    setSelected(c => c ? { ...c, ...editForm } : null);
    setEditing(false);
    notify('success', '✅ تم حفظ التعديلات');
  };

  const handleDelete = (c: Customer) => {
    if (!window.confirm(`⚠️ هل أنت متأكد من حذف "${c.name}"؟`)) return;
    deleteCustomer(c.id);
    setSelected(null);
    setEditing(false);
    notify('success', `🗑️ تم حذف "${c.name}" من قائمة الزبائن`);
  };

  const openDetail = (c: Customer) => {
    setSelected(c);
    setEditForm({ name: c.name, phone: c.phone, city: c.city, notes: c.notes, vip: c.vip, address: c.address, source: c.source });
    setEditing(false);
  };

  const customerOrders = useMemo(() => {
    if (!selected) return [];
    return orders
      .filter(o => o.customerPhone === selected.phone || o.customerId === selected.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [selected, orders]);

  const srcIcon: Record<string, string> = { WhatsApp: '💬', Instagram: '📸', Messenger: '💙', TikTok: '🎵', مباشر: '🏪', manual: '🏪' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">الزبائن</h1>
          <p className="page-sub">{customers.length} زبون · {vips} VIP</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-primary"><Plus size={16} /> إضافة</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {[
          { e: '👥', label: 'الزبائن', val: customers.length },
          { e: '⭐', label: 'VIP', val: vips },
          { e: '🆕', label: 'هذا الشهر', val: newThisMonth },
          { e: '💰', label: 'إجمالي المشتريات', val: `${total.toLocaleString()} ${currency}` },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>{s.e}</span>
            <div>
              <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--txt-1,var(--ink1))' }}>{s.val}</p>
              <p style={{ fontSize: 11.5, color: 'var(--txt-3,var(--ink3))' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink3)', pointerEvents: 'none' }} />
          <input className="input" style={{ paddingRight: 38 }} placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="tabs scroll-x" style={{ flex: 1 }}>
            {['all','WhatsApp','Instagram','Messenger','TikTok','مباشر'].map(s => (
              <button key={s} onClick={() => setSrc(s)} className={`tab-btn ${src === s ? 'active' : ''}`} style={{ fontSize: 12.5 }}>
                {s === 'all' ? 'الكل' : `${srcIcon[s] || ''} ${s}`}
              </button>
            ))}
          </div>
          <button onClick={() => setVipOnly(!vipOnly)}
            className="btn btn-ghost btn-sm"
            style={{ borderColor: vipOnly ? 'rgba(245,158,11,0.4)' : undefined, color: vipOnly ? '#fbbf24' : undefined, background: vipOnly ? 'rgba(245,158,11,0.1)' : undefined }}>
            ⭐ VIP {vipOnly ? 'فقط' : ''}
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(c => (
          <div key={c.id} className="card card-hover" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
            onClick={() => openDetail(c)}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: c.vip ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'var(--clr-pri-g,var(--ember))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#fff', flexShrink: 0 }}>
              {c.name[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <p style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                {c.vip && <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', flexShrink: 0 }}>VIP</span>}
                <span style={{ fontSize: 11, color: 'var(--ink3)', flexShrink: 0 }}>{srcIcon[c.source] || '🏪'} {c.source}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--ink3)', display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} />{c.phone}</span>
                {c.city && <span style={{ fontSize: 12, color: 'var(--ink3)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{c.city}</span>}
              </div>
              {c.notes && <p style={{ fontSize: 11.5, color: 'var(--ink3)', marginTop: 3 }}>📝 {c.notes}</p>}
            </div>
            <div style={{ textAlign: 'left', flexShrink: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--ink1)' }}>{c.totalSpent.toLocaleString()}</p>
              <p style={{ fontSize: 11, color: 'var(--ink3)', textAlign: 'left' }}>{currency} · {c.totalOrders} طلب</p>
            </div>
            <ChevronRight size={14} style={{ color: 'var(--ink3)', flexShrink: 0 }} />
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div className="empty-state-icon">👥</div>
            <p style={{ color: 'var(--ink2)', fontWeight: 700, fontSize: 18 }}>لا نتائج للبحث</p>
          </div>
        )}
      </div>

      {/* ── Customer Detail Modal ── */}
      {selected && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setEditing(false); }}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--clr-border,var(--border))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: selected.vip ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'var(--ember)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#fff' }}>
                  {selected.name[0]}
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 900, color: 'var(--ink1)' }}>{selected.name}</h2>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                    {selected.vip && <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>⭐ VIP</span>}
                    <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{srcIcon[selected.source] || '🏪'} {selected.source}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setEditing(v => !v)}
                  style={{ width: 32, height: 32, borderRadius: 9, background: editing ? 'var(--ember-soft)' : 'rgba(255,255,255,.06)', border: `1px solid ${editing ? 'rgba(255,106,0,.3)' : 'var(--border)'}`, color: editing ? 'var(--ember)' : 'var(--ink3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit2 size={13} />
                </button>
                <button onClick={() => handleDelete(selected)}
                  style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={13} />
                </button>
                <button onClick={() => { setSelected(null); setEditing(false); }}
                  style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', color: 'var(--ink3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} />
                </button>
              </div>
            </div>

            <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '70vh', overflowY: 'auto' }}>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { label: 'الطلبات', value: selected.totalOrders },
                  { label: `${currency} أنفق`, value: selected.totalSpent.toLocaleString() },
                  { label: 'نقاط الولاء', value: (selected as any).loyaltyPoints || 0 },
                ].map((s, i) => (
                  <div key={i} style={{ padding: '10px', borderRadius: 10, background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--ink1)' }}>{s.value}</p>
                    <p style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 2 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Edit form */}
              {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div><label className="label">الاسم</label><input className="input" value={editForm.name || ''} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
                    <div><label className="label">الهاتف</label><input className="input" dir="ltr" value={editForm.phone || ''} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} /></div>
                    <div><label className="label">المدينة</label><input className="input" value={editForm.city || ''} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} /></div>
                    <div>
                      <label className="label">المصدر</label>
                      <select className="select" value={editForm.source || 'WhatsApp'} onChange={e => setEditForm(p => ({ ...p, source: e.target.value as Customer['source'] }))}>
                        {['WhatsApp','Instagram','Messenger','TikTok','مباشر'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div><label className="label">ملاحظات</label><textarea className="textarea" rows={2} value={editForm.notes || ''} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} /></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--ink2)', fontWeight: 600 }}>
                      <input type="checkbox" checked={!!editForm.vip} onChange={e => setEditForm(p => ({ ...p, vip: e.target.checked })) } />
                      ⭐ تصنيف VIP
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditing(false)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>إلغاء</button>
                    <button onClick={saveEdit} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}><Check size={15} /> حفظ</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { icon: <Phone size={13} />, label: 'الهاتف', val: selected.phone || '—' },
                      { icon: <MapPin size={13} />, label: 'المدينة', val: selected.city || '—' },
                      selected.notes && { icon: <span style={{ fontSize: 13 }}>📝</span>, label: 'ملاحظات', val: selected.notes },
                    ].filter(Boolean).map((row: any, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--ink3)' }}>{row.icon}</span>
                        <span style={{ fontSize: 12, color: 'var(--ink3)', minWidth: 60 }}>{row.label}</span>
                        <span style={{ fontSize: 13, color: 'var(--ink1)', fontWeight: 600 }}>{row.val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Quick actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {selected.phone && (
                      <a href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                        className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center', color: '#25d366', borderColor: 'rgba(37,211,102,.25)', background: 'rgba(37,211,102,.07)', textDecoration: 'none' }}>
                        <MessageCircle size={14} /> واتساب
                      </a>
                    )}
                    {selected.phone && (
                      <a href={`tel:${selected.phone}`}
                        className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}>
                        <Phone size={14} /> اتصال
                      </a>
                    )}
                    <button onClick={() => {
                      const newVip = !selected.vip;
                      updateCustomer(selected.id, { vip: newVip });
                      setSelected(c => c ? { ...c, vip: newVip } : null);
                      notify('success', newVip ? `⭐ تم تصنيف "${selected.name}" كزبون VIP` : `✅ تم إزالة تصنيف VIP عن "${selected.name}"`);
                    }}
                      className="btn btn-ghost btn-sm" style={{ flex: 1, justifyContent: 'center', color: selected.vip ? '#fbbf24' : undefined, borderColor: selected.vip ? 'rgba(245,158,11,.3)' : undefined, background: selected.vip ? 'rgba(245,158,11,.08)' : undefined }}>
                      <Star size={14} /> {selected.vip ? 'إزالة VIP' : 'VIP'}
                    </button>
                  </div>

                  {/* Order history */}
                  {customerOrders.length > 0 && (
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink3)', marginBottom: 8 }}>آخر {customerOrders.length} طلبات</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {customerOrders.map(o => (
                          <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)' }}>
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink1)' }}>{o.id.slice(-8)}</p>
                              <p style={{ fontSize: 10, color: 'var(--ink3)' }}>{new Date(o.createdAt).toLocaleDateString('ar')}</p>
                            </div>
                            <div style={{ textAlign: 'left' }}>
                              <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--ink1)' }}>{o.total.toLocaleString()} {currency}</p>
                              <p style={{ fontSize: 10, color: 'var(--ink3)', textAlign: 'left' }}>{STATUS_AR[o.status] || ''} {o.status}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid var(--clr-border,var(--border))' }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--ink1)' }}>إضافة زبون</h2>
              <button onClick={() => setShowAdd(false)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.06)', border: 'none', color: 'var(--ink3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
            </div>
            <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="label">الاسم *</label><input className="input" placeholder="محمد العلوي" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
                <div><label className="label">الهاتف *</label><input className="input" placeholder="+212 6XX" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} dir="ltr" /></div>
                <div><label className="label">المدينة</label><input className="input" placeholder="الدار البيضاء" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
                <div>
                  <label className="label">المصدر</label>
                  <select className="select" value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value as Customer['source'] }))}>
                    {['WhatsApp','Instagram','Messenger','TikTok','مباشر'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="label">ملاحظات</label><textarea className="textarea" rows={2} placeholder="ملاحظات..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button onClick={() => setShowAdd(false)} className="btn btn-ghost" style={{ paddingInline: 20 }}>إلغاء</button>
                <button onClick={save} disabled={!form.name || !form.phone} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  <Check size={16} /> إضافة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
