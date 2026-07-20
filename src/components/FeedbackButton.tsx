import { useState } from 'react';
import { MessageSquareWarning, Send, X } from 'lucide-react';
import { MES, reportProblem } from '../lib/mes';
import { useStore } from '../store';

// ============================================================
// FeedbackButton — «🚩 بلّغ». زرّ صغير دائم: أوّل 100 مستخدم سيكشفون خلال أسبوع
//   ما لن يكشفه أيّ تحليل. الملاحظة تذهب لحلقة التعلّم (mes.reportProblem) —
//   الخادم + سجلّ محلّي. بلا نافذة ثقيلة: pill يفتح خانة نصّ واحدة.
// ============================================================

export default function FeedbackButton() {
  const { currentPage } = useStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  const send = () => {
    if (!text.trim()) return;
    reportProblem(text, currentPage);
    setText(''); setSent(true);
    setTimeout(() => { setSent(false); setOpen(false); }, 1600);
  };

  return (
    <div dir="rtl" style={{ position: 'fixed', bottom: 'max(86px, calc(env(safe-area-inset-bottom) + 70px))', insetInlineStart: 14, zIndex: 7000, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
      {open && (
        <div style={{ width: 'min(88vw, 300px)', background: 'var(--panel,#131a16)', border: '1px solid var(--border2,rgba(255,255,255,.14))', borderRadius: 14, padding: 12, boxShadow: '0 18px 50px rgba(0,0,0,.45)', display: 'flex', flexDirection: 'column', gap: 9 }}>
          {sent ? (
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--mint,#12A150)', textAlign: 'center', padding: '8px 0' }}>{MES.thanks}</div>
          ) : (
            <>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ink1,#FAFAFA)' }}>واش لقيتي مشكل؟ ولا عندك اقتراح؟</div>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={3} autoFocus
                placeholder="اكتب هنا بالدارجة ولا بأيّ لغة…"
                style={{ width: '100%', resize: 'none', background: 'var(--bg2,rgba(255,255,255,.03))', border: '1px solid var(--border2,rgba(255,255,255,.14))', borderRadius: 10, padding: '9px 11px', color: 'var(--ink1,#FAFAFA)', fontSize: 13, fontFamily: 'inherit', outline: 'none', direction: 'rtl' }} />
              <div style={{ display: 'flex', gap: 7 }}>
                <button onClick={send} disabled={!text.trim()}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', borderRadius: 10, border: 'none', background: text.trim() ? 'var(--amz-emerald,#0a8f6f)' : 'var(--border2,rgba(255,255,255,.12))', color: '#fff', fontSize: 13, fontWeight: 800, fontFamily: 'inherit', cursor: text.trim() ? 'pointer' : 'default' }}>
                  <Send size={14} /> صيفط
                </button>
                <button onClick={() => setOpen(false)} aria-label="إغلاق"
                  style={{ width: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: '1px solid var(--border2,rgba(255,255,255,.14))', background: 'transparent', color: 'var(--ink3,#7E877F)', cursor: 'pointer' }}><X size={15} /></button>
              </div>
            </>
          )}
        </div>
      )}
      <button onClick={() => setOpen(o => !o)} aria-label="بلّغ عن مشكل"
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 99, border: '1px solid var(--border2,rgba(255,255,255,.16))', background: 'var(--panel,#131a16)', color: 'var(--ink2,#B8C0BA)', fontSize: 12, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,.35)' }}>
        <MessageSquareWarning size={14} style={{ color: 'var(--amz-gold,#D4A017)' }} /> بلّغ
      </button>
    </div>
  );
}
