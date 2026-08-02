import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { hasAI, aiProviderName } from '../lib/aiAvailability';
import { Send, Bot, Plus, Sparkles, X, Pin, ArrowRight, Phone, Zap, ScanLine, Copy, Check } from 'lucide-react';
import * as api from '../services/api';

// ─── Animations ──────────────────────────────────────────────────────────────
const ANIM_STYLES = `
@keyframes blink {
  0%, 80%, 100% { opacity: .2; transform: scale(.85); }
  40%            { opacity: 1;  transform: scale(1); }
}
@keyframes msgIn {
  from { opacity: 0; transform: translateY(8px) scale(.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
`;

// ─── Constants ────────────────────────────────────────────────────────────────
const SRC_CLR: Record<string, string> = {
  WhatsApp: '#25d366',
  Instagram: '#e1306c',
  Messenger: '#0084ff',
  TikTok: '#ffffff',
};
const SRC_ICN: Record<string, string> = {
  WhatsApp: '💬',
  Instagram: '📸',
  Messenger: '💙',
  TikTok: '🎵',
  مباشر: '👤',
};
const LBL_CLR: Record<string, string> = {
  urgent: '#f87171',
  followup: '#fbbf24',
  done: '#34d399',
};
const LABEL_LABEL: Record<string, string> = {
  urgent: 'مهم',
  followup: 'متابعة',
  done: 'مكتمل',
};
const MOOD_EMOJI: Record<string, string> = {
  neutral: '😐',
  interested: '🔥',
  hesitant: '🤔',
  angry: '😠',
  urgent: '⚡',
};

// ─── Typing Dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <div style={{
        width: 30, height: 30, borderRadius: 10,
        background: 'var(--ember)',
        boxShadow: '0 0 12px rgba(255,106,0,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Bot size={14} color="#fff" />
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '10px 16px',
        background: 'rgba(255,106,0,.08)',
        border: '1px solid rgba(255,106,0,.18)',
        borderRadius: '18px 18px 18px 4px',
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--ember)',
            display: 'inline-block',
            animation: `blink 1.4s ${i * 0.22}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: any }) {
  const isCustomer = msg.role === 'customer';
  const isAI       = msg.role === 'ai';

  const bubbleStyle: React.CSSProperties = isCustomer
    ? {
        background: 'rgba(0,200,150,.12)',
        border: '1px solid rgba(0,200,150,.22)',
        borderRadius: '18px 18px 4px 18px',
        color: 'var(--ink1)',
      }
    : isAI
    ? {
        background: 'rgba(255,106,0,.10)',
        border: '1px solid rgba(255,106,0,.20)',
        borderRadius: '18px 18px 18px 4px',
        color: 'var(--ink1)',
      }
    : {
        background: 'rgba(255,255,255,.06)',
        border: '1px solid var(--border)',
        borderRadius: '18px 18px 18px 4px',
        color: 'var(--ink2)',
      };

  return (
    <div style={{
      display: 'flex', gap: 8, alignItems: 'flex-end',
      flexDirection: isCustomer ? 'row-reverse' : 'row',
      animation: 'msgIn .22s ease-out both',
    }}>
      {!isCustomer && (
        <div style={{
          width: 30, height: 30, borderRadius: 10, flexShrink: 0,
          background: isAI ? 'var(--ember)' : 'rgba(255,255,255,.08)',
          border: isAI ? 'none' : '1px solid var(--border)',
          boxShadow: isAI ? '0 0 12px rgba(255,106,0,.4)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isAI ? <Bot size={14} color="#fff" /> : <span style={{ fontSize: 12 }}>👤</span>}
        </div>
      )}
      <div style={{
        maxWidth: '72%', display: 'flex', flexDirection: 'column', gap: 4,
        alignItems: isCustomer ? 'flex-end' : 'flex-start',
      }}>
        <div style={{ ...bubbleStyle, padding: '10px 14px', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {msg.content}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--ink3)' }}>{msg.timestamp}</span>
          {isAI && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              color: 'var(--mint)',
              background: 'rgba(0,200,150,.1)',
              borderRadius: 4, padding: '1px 5px',
            }}>AI</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MessagesPage() {
  const { conversations, sendMessage, addConversation, updateConversation, deleteConversation, settings, products, isOnline, notify } = useStore();

  const isMobile = window.innerWidth < 640;

  const [active,      setActive]      = useState<string | null>(conversations[0]?.id ?? null);
  const [mobileView,  setMobileView]  = useState<'list' | 'chat'>('list');
  const [input,       setInput]       = useState('');
  const [typing,      setTyping]      = useState(false);
  const [showTpl,     setShowTpl]     = useState(false);
  const [srcFilter,   setSrcFilter]   = useState('all');
  const [aiThinking,  setAiThinking]  = useState(false);
  const [showNewConv, setShowNewConv] = useState(false);
  const [newConvForm, setNewConvForm] = useState({ name: '', phone: '', source: 'WhatsApp' as const });
  const [extractData, setExtractData] = useState<Record<string, string> | null>(null);
  const [extracting,  setExtracting]  = useState(false);
  const [copied,      setCopied]      = useState<string | null>(null);

  const msgEnd = useRef<HTMLDivElement>(null);
  const conv   = conversations.find(c => c.id === active);

  const hasRealAI = hasAI(settings);
  const aiProvider = aiProviderName(settings);

  useEffect(() => {
    msgEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conv?.messages?.length, typing]);

  useEffect(() => {
    if (!conv || !conv.messages?.length) return;
    const last = conv.messages[conv.messages.length - 1];
    if (last?.role === 'customer' && settings.ai.humanSimulation) {
      setTyping(true);
      const t = setTimeout(() => setTyping(false), (settings.ai.replyDelay || 2) * 1000 + 800);
      return () => clearTimeout(t);
    }
  }, [conv?.messages?.length]);

  const selectConversation = (id: string) => {
    setActive(id);
    updateConversation(id, { unread: 0 });
    if (isMobile) setMobileView('chat');
  };

  const send = async () => {
    if (!input.trim() || !active) return;
    const msg = input.trim();
    setInput('');
    await sendMessage(active, msg, 'customer');
  };

  const triggerAI = async () => {
    if (!conv || !active) return;
    const lastMsg = conv.messages?.filter((m: any) => m.role === 'customer').pop();
    if (!lastMsg) { notify('info', 'لا توجد رسالة من الزبون للرد عليها'); return; }
    setAiThinking(true);
    try {
      if (isOnline && api.getToken()) {
        const data = await api.aiAPI.reply({
          message: lastMsg.content,
          history: (conv.messages || []).slice(-10).map((m: any) => ({ role: m.role, content: m.content })),
          products: products.filter((p: any) => p.status === 'published'),
          settings: settings,
        });
        if (data.reply) await sendMessage(active, data.reply, 'ai');
      } else {
        await sendMessage(active, lastMsg.content, 'customer');
      }
    } catch (e: any) {
      notify('error', `خطأ AI: ${e.message}`);
    }
    setAiThinking(false);
  };

  const triggerExtract = async () => {
    if (!conv?.messages?.length) { notify('info', 'لا توجد رسائل للاستخراج'); return; }
    setExtracting(true);
    try {
      const result = await api.aiAPI.extractOrder(conv.messages);
      if (Object.keys(result).length === 0) {
        notify('warning', 'لم يتم العثور على بيانات — تأكد من وجود اسم أو هاتف أو مدينة في المحادثة');
      } else {
        setExtractData(result);
      }
    } catch {
      notify('error', 'فشل الاستخراج');
    }
    setExtracting(false);
  };

  const copyField = (val: string, key: string) => {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const createConv = async () => {
    if (!newConvForm.name.trim()) { notify('error', 'أدخل اسم الزبون'); return; }
    const id = await addConversation({
      customerId: `C${Date.now()}`,
      customerName: newConvForm.name.trim(),
      customerPhone: newConvForm.phone.trim(),
      source: newConvForm.source,
      status: 'active',
      lastMessage: '',
    });
    setActive(id);
    setShowNewConv(false);
    setNewConvForm({ name: '', phone: '', source: 'WhatsApp' });
    if (isMobile) setMobileView('chat');
  };

  const filtered = conversations
    .filter(c => srcFilter === 'all' || c.source === srcFilter)
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.unread || 0) - (a.unread || 0));

  const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);

  // ── Styles ──────────────────────────────────────────────────────────────────
  const containerStyle: React.CSSProperties = isMobile
    ? { position: 'relative', height: 'calc(100dvh - 64px)', overflow: 'hidden' }
    : { display: 'flex', gap: 0, height: 'calc(100vh - 80px)', minHeight: 520, borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border)' };

  const sidebarStyle: React.CSSProperties = isMobile
    ? { position: 'absolute', inset: 0, display: mobileView === 'list' ? 'flex' : 'none', flexDirection: 'column', background: 'var(--void)' }
    : { width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--panel)', borderRight: '1px solid var(--border)' };

  const chatStyle: React.CSSProperties = isMobile
    ? { position: 'absolute', inset: 0, display: mobileView === 'chat' ? 'flex' : 'none', flexDirection: 'column', background: 'var(--panel)' }
    : { flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--panel)' };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 0 : 16 }}>
      <style>{ANIM_STYLES}</style>

      {/* ── Page header (desktop only) ── */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">الرسائل</h1>
            <p className="page-sub">AI يرد تلقائياً بالدارجة {isOnline ? '· متصل' : '· offline'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 20, fontSize: 12.5, fontWeight: 700,
              background: hasRealAI ? 'rgba(0,200,150,.1)' : 'rgba(255,106,0,.08)',
              border: `1px solid ${hasRealAI ? 'rgba(0,200,150,.3)' : 'rgba(255,106,0,.2)'}`,
              color: hasRealAI ? 'var(--mint)' : 'var(--ember)',
            }}>
              <Zap size={12} />
              {hasRealAI ? `🟢 AI حقيقي · ${aiProvider}` : '🔵 AI محلي'}
            </div>
            <button onClick={() => setShowNewConv(true)} className="btn btn-ghost btn-sm">
              <Plus size={15} /> محادثة
            </button>
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <div style={containerStyle}>

        {/* ══════════════ SIDEBAR ══════════════ */}
        <div style={sidebarStyle}>

          {/* Sidebar header */}
          <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            {isMobile && (
              <h2 style={{ fontSize: 17, fontWeight: 900, color: 'var(--ink1)', flex: 1 }}>
                الرسائل
                {totalUnread > 0 && (
                  <span style={{ marginRight: 8, fontSize: 11, fontWeight: 700, background: 'var(--ember)', color: '#fff', borderRadius: 99, padding: '1px 7px' }}>
                    {totalUnread}
                  </span>
                )}
              </h2>
            )}
            {!isMobile && <span style={{ flex: 1 }} />}

            {/* AI status pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700,
              background: hasRealAI ? 'rgba(0,200,150,.1)' : 'rgba(255,106,0,.08)',
              border: `1px solid ${hasRealAI ? 'rgba(0,200,150,.25)' : 'rgba(255,106,0,.2)'}`,
              color: hasRealAI ? 'var(--mint)' : 'var(--ember)',
              whiteSpace: 'nowrap',
            }}>
              {hasRealAI ? '🟢 AI حقيقي' : '🔵 AI محلي'}
            </div>

            {/* New conversation button */}
            <button
              onClick={() => setShowNewConv(true)}
              style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'var(--ember)', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 10px rgba(255,106,0,.4)',
              }}
            >
              <Plus size={16} color="#fff" />
            </button>
          </div>

          {/* Source filter pills */}
          <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {[
              { key: 'all', label: 'الكل' },
              { key: 'WhatsApp', label: '💬' },
              { key: 'Instagram', label: '📸' },
              { key: 'Messenger', label: '💙' },
              { key: 'مباشر', label: '👤' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setSrcFilter(f.key)}
                style={{
                  padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s',
                  border: `1.5px solid ${srcFilter === f.key ? 'var(--ember)' : 'var(--border)'}`,
                  background: srcFilter === f.key ? 'rgba(255,106,0,.12)' : 'transparent',
                  color: srcFilter === f.key ? 'var(--ember)' : 'var(--ink3)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--ink3)' }}>
                <Bot size={40} style={{ margin: '0 auto 10px', opacity: .25, display: 'block' }} />
                <p style={{ fontSize: 13, marginBottom: 14 }}>لا توجد محادثات</p>
                <button onClick={() => setShowNewConv(true)} className="btn btn-ghost btn-sm">ابدأ محادثة جديدة</button>
              </div>
            ) : filtered.map(c => {
              const isActive = active === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 5,
                    padding: '11px 12px', borderRadius: 14, textAlign: 'right', cursor: 'pointer',
                    transition: 'all .16s',
                    background: isActive ? 'rgba(255,106,0,.10)' : 'rgba(255,255,255,.03)',
                    border: `1.5px solid ${isActive ? 'rgba(255,106,0,.35)' : 'var(--border)'}`,
                  }}
                >
                  {/* Top row: avatar, name, pin, unread */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: `${SRC_CLR[c.source] || 'var(--ember)'}22`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                        border: `1px solid ${SRC_CLR[c.source] || 'var(--border)'}33`,
                      }}>
                        {SRC_ICN[c.source] || '💬'}
                      </div>
                      {(c.unread || 0) > 0 && (
                        <span style={{
                          position: 'absolute', top: -4, right: -4,
                          minWidth: 17, height: 17, borderRadius: 99,
                          background: 'var(--ember)', color: '#fff',
                          fontSize: 9, fontWeight: 900,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '0 4px',
                        }}>
                          {c.unread}
                        </span>
                      )}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: 'var(--ink1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.customerName}
                    </span>
                    {c.pinned && <Pin size={11} color="var(--gold, #c9954c)" />}
                  </div>

                  {/* Badges row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 5,
                      background: `${SRC_CLR[c.source] || '#fff'}22`,
                      color: SRC_CLR[c.source] || 'var(--ink3)',
                    }}>
                      {c.source}
                    </span>
                    {c.label && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: LBL_CLR[c.label] || 'var(--ink3)' }}>
                        {LABEL_LABEL[c.label]}
                      </span>
                    )}
                    {c.mood && c.mood !== 'neutral' && (
                      <span style={{ fontSize: 12 }}>{MOOD_EMOJI[c.mood]}</span>
                    )}
                  </div>

                  {/* Last message */}
                  <p style={{ fontSize: 11.5, color: 'var(--ink3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {c.lastMessage || 'ابدأ المحادثة...'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ══════════════ CHAT WINDOW ══════════════ */}
        <div style={chatStyle}>
          {!conv ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, color: 'var(--ink3)' }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,106,0,.08)', border: '1px solid rgba(255,106,0,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={28} style={{ opacity: .4 }} color="var(--ember)" />
              </div>
              <p style={{ fontSize: 14, textAlign: 'center' }}>اختر محادثة من القائمة<br /><span style={{ fontSize: 12, opacity: .6 }}>أو أنشئ محادثة جديدة</span></p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--panel)' }}>
                {/* Back button (mobile) */}
                {isMobile && (
                  <button
                    onClick={() => setMobileView('list')}
                    style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--ink2)' }}
                  >
                    <ArrowRight size={16} />
                  </button>
                )}

                {/* Source avatar */}
                <div style={{
                  width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                  background: `${SRC_CLR[conv.source] || 'var(--ember)'}22`,
                  border: `1.5px solid ${SRC_CLR[conv.source] || 'var(--border)'}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>
                  {SRC_ICN[conv.source] || '💬'}
                </div>

                {/* Name & info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--ink1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.customerName}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--ink3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conv.customerPhone || 'غير محدد'} · {conv.source}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {/* Extract order data */}
                  <button
                    onClick={triggerExtract}
                    disabled={extracting}
                    style={{
                      width: 32, height: 32, borderRadius: 9, cursor: 'pointer',
                      background: 'rgba(99,102,241,.1)',
                      border: '1px solid rgba(99,102,241,.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#a78bfa', opacity: extracting ? .5 : 1, transition: 'opacity .15s',
                    }}
                    title="استخرج بيانات الطلب"
                  >
                    <ScanLine size={13} />
                  </button>
                  {conv.customerPhone && (
                    <a
                      href={`https://wa.me/${conv.customerPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: 32, height: 32, borderRadius: 9,
                        background: 'rgba(37,211,102,.12)',
                        border: '1px solid rgba(37,211,102,.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#25d366', textDecoration: 'none',
                      }}
                      title="فتح WhatsApp"
                    >
                      <Phone size={13} />
                    </a>
                  )}
                  <button
                    onClick={() => updateConversation(conv.id, { pinned: !conv.pinned })}
                    style={{
                      width: 32, height: 32, borderRadius: 9, cursor: 'pointer',
                      background: conv.pinned ? 'rgba(201,149,76,.15)' : 'rgba(255,255,255,.05)',
                      border: `1px solid ${conv.pinned ? 'rgba(201,149,76,.4)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: conv.pinned ? '#c9954c' : 'var(--ink3)',
                    }}
                    title={conv.pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                  >
                    <Pin size={13} />
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`حذف محادثة "${conv.customerName}"؟`)) return;
                      await deleteConversation(conv.id);
                      setActive(null);
                      if (isMobile) setMobileView('list');
                    }}
                    style={{
                      width: 32, height: 32, borderRadius: 9, cursor: 'pointer',
                      background: 'rgba(239,68,68,.08)',
                      border: '1px solid rgba(239,68,68,.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#ef4444',
                    }}
                    title="حذف المحادثة"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* AI status bar */}
              <div style={{
                padding: '6px 16px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 600,
                background: hasRealAI ? 'rgba(0,200,150,.05)' : 'rgba(255,106,0,.05)',
                color: hasRealAI ? 'var(--mint)' : 'var(--ember)',
              }}>
                <Zap size={11} />
                {hasRealAI
                  ? `AI متصل · ${aiProvider} · يرد تلقائياً`
                  : 'AI محلي · استجابات أساسية'}
                <span style={{ marginRight: 'auto', fontSize: 10, opacity: .7 }}>
                  {settings.ai.humanSimulation ? `تأخير ${settings.ai.replyDelay}s` : 'تأخير معطّل'}
                </span>
              </div>

              {/* Messages area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(!conv.messages || conv.messages.length === 0) && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--ink3)', padding: '40px 0' }}>
                    <Bot size={36} style={{ opacity: .2 }} />
                    <p style={{ fontSize: 13, textAlign: 'center' }}>
                      ابدأ بكتابة رسالة كالزبون لاختبار AI<br />
                      <span style={{ fontSize: 11, opacity: .6 }}>أو انتظر رسالة حقيقية من {conv.source}</span>
                    </p>
                  </div>
                )}
                {(conv.messages || []).map((msg: any) => (
                  <Bubble key={msg.id} msg={msg} />
                ))}
                {typing && <TypingDots />}
                <div ref={msgEnd} />
              </div>

              {/* Templates quick panel */}
              {showTpl && settings.templates?.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', maxHeight: 150, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <p style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 700, marginBottom: 2 }}>قوالب الردود</p>
                  {settings.templates.map((t: any) => (
                    <button
                      key={t.id}
                      onClick={() => { setInput(t.content); setShowTpl(false); }}
                      style={{
                        display: 'block', width: '100%', padding: '8px 12px', borderRadius: 10,
                        background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)',
                        color: 'var(--ink2)', fontSize: 12, cursor: 'pointer', textAlign: 'right',
                        transition: 'background .15s',
                      }}
                    >
                      <strong style={{ color: 'var(--ember)' }}>{t.name}</strong>
                      {' — '}
                      {t.content.slice(0, 55)}{t.content.length > 55 ? '...' : ''}
                    </button>
                  ))}
                </div>
              )}

              {/* Input bar */}
              <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 7, alignItems: 'center', background: 'var(--panel)' }}>
                <button
                  onClick={() => setShowTpl(v => !v)}
                  title="قوالب الردود"
                  style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0, cursor: 'pointer',
                    background: showTpl ? 'var(--ember)' : 'rgba(255,255,255,.05)',
                    border: `1px solid ${showTpl ? 'var(--ember)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: showTpl ? '#fff' : 'var(--ink3)',
                  }}
                >
                  <Sparkles size={14} />
                </button>

                <textarea
                  className="glass-input"
                  rows={1}
                  style={{ flex: 1, padding: '10px 14px', fontSize: 13, resize: 'none', minHeight: 36, maxHeight: 100 }}
                  placeholder="اكتب رسالة كالزبون لاختبار الـ AI..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                />

                <button
                  onClick={triggerAI}
                  disabled={aiThinking}
                  title="رد AI مباشر"
                  style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0, cursor: 'pointer',
                    background: 'rgba(0,200,150,.1)',
                    border: '1px solid rgba(0,200,150,.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--mint)', opacity: aiThinking ? .45 : 1,
                    transition: 'opacity .15s',
                  }}
                >
                  <Bot size={15} />
                </button>

                <button
                  onClick={send}
                  disabled={!input.trim()}
                  style={{
                    width: 38, height: 38, borderRadius: 11, flexShrink: 0, cursor: 'pointer', border: 'none',
                    background: input.trim() ? 'var(--ember)' : 'rgba(255,255,255,.07)',
                    boxShadow: input.trim() ? '0 0 12px rgba(255,106,0,.4)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: input.trim() ? 1 : .45, transition: 'all .15s',
                  }}
                >
                  <Send size={15} color="#fff" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══════════════ EXTRACT ORDER DATA MODAL ══════════════ */}
      {extractData && (
        <div
          onClick={() => setExtractData(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: isMobile ? '100%' : 440, background: 'var(--panel)', border: isMobile ? 'none' : '1px solid var(--border)', borderRadius: isMobile ? '24px 24px 0 0' : 24, padding: 24, boxShadow: '0 -8px 40px rgba(0,0,0,.4)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: 'var(--ink1)' }}>🔍 بيانات الطلب المستخرجة</h3>
                <p style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 3 }}>مستخرجة تلقائياً من المحادثة بالذكاء الاصطناعي</p>
              </div>
              <button onClick={() => setExtractData(null)} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', color: 'var(--ink3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {[
                { key: 'name',  label: '👤 الاسم',    emoji: '👤' },
                { key: 'phone', label: '📱 الهاتف',   emoji: '📱' },
                { key: 'city',  label: '📍 المدينة',   emoji: '📍' },
                { key: 'size',  label: '📏 المقاس',    emoji: '📏' },
                { key: 'color', label: '🎨 اللون',     emoji: '🎨' },
              ].map(({ key, label }) => {
                const val = (extractData as any)[key];
                if (!val) return null;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(99,102,241,.07)', border: '1px solid rgba(99,102,241,.18)' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 600, marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink1)', fontFamily: key === 'phone' ? 'monospace' : 'inherit' }}>{val}</p>
                    </div>
                    <button
                      onClick={() => copyField(val, key)}
                      style={{ width: 32, height: 32, borderRadius: 8, background: copied === key ? 'rgba(0,200,150,.15)' : 'rgba(255,255,255,.06)', border: `1px solid ${copied === key ? 'rgba(0,200,150,.35)' : 'var(--border)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: copied === key ? 'var(--mint)' : 'var(--ink3)', transition: 'all .15s' }}
                    >
                      {copied === key ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,106,0,.06)', border: '1px solid rgba(255,106,0,.15)', marginBottom: 16 }}>
              <p style={{ fontSize: 11.5, color: 'var(--ember)', fontWeight: 600, lineHeight: 1.6 }}>
                💡 يمكنك نسخ هذه البيانات لإنشاء طلب جديد في صفحة الطلبات
              </p>
            </div>

            <button onClick={() => setExtractData(null)} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>إغلاق</button>
          </div>
        </div>
      )}

      {/* ══════════════ NEW CONVERSATION MODAL ══════════════ */}
      {showNewConv && (
        <div
          onClick={() => setShowNewConv(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            padding: isMobile ? 0 : 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: isMobile ? '100%' : 400,
              background: 'var(--panel)',
              border: isMobile ? 'none' : '1px solid var(--border)',
              borderRadius: isMobile ? '24px 24px 0 0' : 24,
              padding: 24,
              boxShadow: '0 -8px 40px rgba(0,0,0,.4)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: 'var(--ink1)' }}>💬 محادثة جديدة</h3>
              <button
                onClick={() => setShowNewConv(false)}
                style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,255,255,.06)', border: '1px solid var(--border)', color: 'var(--ink3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label" style={{ marginBottom: 5, display: 'block' }}>اسم الزبون *</label>
                <input
                  className="input"
                  placeholder="مثال: محمد العلوي"
                  value={newConvForm.name}
                  onChange={e => setNewConvForm(f => ({ ...f, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && createConv()}
                  autoFocus
                />
              </div>
              <div>
                <label className="label" style={{ marginBottom: 5, display: 'block' }}>رقم الهاتف</label>
                <input
                  className="input"
                  placeholder="06XXXXXXXX"
                  value={newConvForm.phone}
                  onChange={e => setNewConvForm(f => ({ ...f, phone: e.target.value }))}
                  dir="ltr"
                />
              </div>
              <div>
                <label className="label" style={{ marginBottom: 5, display: 'block' }}>المصدر</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['WhatsApp', 'Instagram', 'Messenger', 'مباشر'] as const).map(src => (
                    <button
                      key={src}
                      onClick={() => setNewConvForm(f => ({ ...f, source: src as any }))}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        border: `1.5px solid ${newConvForm.source === src ? 'var(--ember)' : 'var(--border)'}`,
                        background: newConvForm.source === src ? 'rgba(255,106,0,.1)' : 'transparent',
                        color: newConvForm.source === src ? 'var(--ember)' : 'var(--ink3)',
                        transition: 'all .14s',
                      }}
                    >
                      {SRC_ICN[src] || '👤'}<br />
                      <span style={{ fontSize: 10 }}>{src === 'مباشر' ? 'مباشر' : src}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={() => setShowNewConv(false)} className="btn btn-ghost" style={{ flex: 1 }}>إلغاء</button>
                <button onClick={createConv} className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                  إنشاء المحادثة
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
