import { useState } from 'react';
import { X } from 'lucide-react';
import { C } from '../theme';
import { useLanding } from '../context';

// شريط علوي ترويجي صادق (بلا عدّ تنازلي وهمي) — قابل للإغلاق
export default function PromoBanner() {
  const { tx, isAuthed } = useLanding();
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div style={{ position: 'relative', background: `linear-gradient(135deg, ${C.orange}, ${C.purple})`, color: '#fff', padding: '9px 40px', textAlign: 'center', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
      <span>{tx('promo')}</span>
      <a href={isAuthed ? '/dashboard' : '/login'} style={{ background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 99, padding: '3px 14px', fontSize: 12, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}>{tx('promoCta')}</a>
      <button onClick={() => setOpen(false)} aria-label="close" style={{ position: 'absolute', insetInlineEnd: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', padding: 4 } as any}><X size={16} /></button>
    </div>
  );
}
