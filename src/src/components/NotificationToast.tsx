import { useEffect, useRef, useState } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { useStore } from '../store';
import type { AppNotification, NotifType } from '../types';

const CFG: Record<NotifType, { color: string; bg: string; border: string; bar: string; Icon: any }> = {
  success: { color: '#10b981', bg: 'rgba(16,185,129,.13)',  border: 'rgba(16,185,129,.35)', bar: '#10b981', Icon: CheckCircle  },
  error:   { color: '#ef4444', bg: 'rgba(239,68,68,.13)',   border: 'rgba(239,68,68,.35)',  bar: '#ef4444', Icon: XCircle      },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,.13)',  border: 'rgba(245,158,11,.35)', bar: '#f59e0b', Icon: AlertTriangle },
  info:    { color: '#60a5fa', bg: 'rgba(96,165,250,.13)',   border: 'rgba(96,165,250,.35)', bar: '#60a5fa', Icon: Info         },
};

const DURATION = 4200;

interface Toast extends AppNotification { removing?: boolean }

export default function NotificationToast() {
  const { notifications, markNotifRead } = useStore();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenRef = useRef(new Set<string>());

  // Detect new notifications and show them as toasts
  useEffect(() => {
    const unseen = notifications.filter(n => !seenRef.current.has(n.id));
    if (!unseen.length) return;
    unseen.forEach(n => {
      seenRef.current.add(n.id);
      setToasts(prev => [{ ...n }, ...prev].slice(0, 4));
      // Auto-dismiss
      setTimeout(() => dismiss(n.id, false), DURATION);
    });
  }, [notifications]);

  const dismiss = (id: string, markRead = true) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 320);
    if (markRead) markNotifRead(id);
  };

  if (!toasts.length) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity:0; transform:translateY(16px) scale(.96); }
          to   { opacity:1; transform:translateY(0)    scale(1); }
        }
        @keyframes toastOut {
          from { opacity:1; transform:translateY(0) scale(1); max-height:120px; }
          to   { opacity:0; transform:translateY(8px) scale(.96); max-height:0; padding:0; margin:0; }
        }
        @keyframes progressBar {
          from { width:100%; }
          to   { width:0%; }
        }
      `}</style>

      <div dir="rtl" style={{
        position: 'fixed',
        bottom: isMobile ? 76 : 24,
        right: isMobile ? 12 : 24,
        left: isMobile ? 12 : 'auto',
        zIndex: 99999,
        display: 'flex', flexDirection: 'column', gap: 8,
        maxWidth: isMobile ? '100%' : 360,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const c = CFG[t.type] || CFG.info;
          const { Icon } = c;
          return (
            <div
              key={t.id}
              style={{
                display: 'flex', flexDirection: 'column', gap: 0,
                background: 'var(--panel, #111827)',
                border: `1px solid ${c.border}`,
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: `0 8px 32px rgba(0,0,0,.4), 0 0 0 1px ${c.border}`,
                backdropFilter: 'blur(14px)',
                animation: t.removing
                  ? 'toastOut .32s ease-in forwards'
                  : 'toastIn .22s cubic-bezier(.175,.885,.32,1.275) both',
                pointerEvents: 'auto',
              }}
            >
              {/* Main row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '13px 14px 11px' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${c.color}1a`, border: `1px solid ${c.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <Icon size={16} color={c.color} />
                </div>
                <p style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--ink1, #e8e4dc)', lineHeight: 1.55 }}>
                  {t.message}
                </p>
                <button
                  onClick={() => dismiss(t.id)}
                  style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.09)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--ink3,#6b7280)', marginTop: 1 }}
                >
                  <X size={12} />
                </button>
              </div>

              {/* Progress bar */}
              {!t.removing && (
                <div style={{ height: 3, background: 'rgba(255,255,255,.06)' }}>
                  <div style={{
                    height: '100%',
                    background: c.bar,
                    animation: `progressBar ${DURATION}ms linear forwards`,
                    opacity: .7,
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
