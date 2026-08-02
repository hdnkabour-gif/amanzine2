import { useState, useEffect } from 'react';
import { getToken as getAuthToken } from '../services/api';
import { useStore } from '../store';
import { aiKeys, aiProviders, AI_LABEL } from '../lib/aiAvailability';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface Check {
  id: string;
  label: string;
  status: 'ok'|'warn'|'error'|'loading';
  detail?: string;
}

export default function SystemCheck() {
  const { settings, isOnline } = useStore();
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);

  const updateCheck = (id: string, status: Check['status'], detail?: string) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status, detail } : c));
  };

  const runChecks = async () => {
    setRunning(true);

    const initial: Check[] = [
      { id: 'backend',  label: 'الاتصال بالخادم',         status: 'loading' },
      { id: 'auth',     label: 'نظام المصادقة',            status: 'loading' },
      { id: 'db',       label: 'قاعدة البيانات',           status: 'loading' },
      { id: 'ai',       label: 'مفتاح AI',                  status: 'loading' },
      { id: 'whatsapp', label: 'واتساب Business',           status: 'loading' },
      { id: 'jwt',      label: 'JWT Secret',                status: 'loading' },
    ];
    setChecks(initial);

    // 1. Backend health check — via our own API (avoids CORS)
    try {
      const tok = getAuthToken() || '';
      const r = await fetch('/api/health', {
        headers: tok ? { Authorization: `Bearer ${tok}` } : {},
        signal: AbortSignal.timeout(6000),
      });
      if (r.ok) {
        const d = await r.json();
        updateCheck('backend', 'ok', `v${d.version} · ${d.uptime}s · ${d.memory}`);
        updateCheck('db', d.db === 'ok' ? 'ok' : 'error', d.db === 'ok' ? 'SQLite WAL — OK' : 'DB Error');
        updateCheck('jwt', d.env === 'production' ? 'ok' : 'warn',
          d.env === 'production' ? 'JWT Secret configured' : 'Development mode — set JWT_SECRET in Railway');
      } else {
        updateCheck('backend', 'error', `HTTP ${r.status}`);
        updateCheck('db', 'warn', 'Unknown');
        updateCheck('jwt', 'warn', 'Could not verify');
      }
    } catch (e: any) {
      updateCheck('backend', 'error', e.message);
      updateCheck('db', 'warn', 'Backend unavailable');
      updateCheck('jwt', 'warn', 'Backend unavailable');
    }

    // 2. Auth check — verify token
    const token = getAuthToken();
    if (token && token !== 'demo-token-local') {
      try {
        const r = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(4000),
        });
        updateCheck('auth', r.ok ? 'ok' : 'error', r.ok ? 'JWT valid · logged in' : 'Token invalid');
      } catch {
        updateCheck('auth', 'warn', 'Could not verify');
      }
    } else {
      updateCheck('auth', token === 'demo-token-local' ? 'warn' : 'warn',
        token === 'demo-token-local' ? 'Demo mode — not real auth' : 'Not logged in');
    }

    // 3. AI key check — via backend proxy (avoids CORS + hides key)
    // كلُّ المزوّدين الستّة، لا اثنان: الخادم يقبلهم جميعًا.
    const keys = aiKeys(settings);
    const [service] = aiProviders(settings);
    if (service) {
      try {
        const tok = getAuthToken() || '';
        const apiKey = keys[service];
        const r = await fetch('/api/settings/verify-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
          body: JSON.stringify({ service, apiKey }),
          signal: AbortSignal.timeout(10000),
        });
        const d = await r.json();
        updateCheck('ai', d.ok ? 'ok' : 'error', d.ok ? `${AI_LABEL[service]} · ${d.info || 'connected'}` : d.error || 'Invalid key');
      } catch {
        updateCheck('ai', 'warn', 'Could not verify');
      }
    } else {
      updateCheck('ai', 'warn', 'No API key — using local AI (Darija fallback)');
    }

    // 4. WhatsApp check
    const waConnected = (settings.social as any)?.whatsapp?.connected;
    updateCheck('whatsapp', waConnected ? 'ok' : 'warn',
      waConnected ? 'WhatsApp Business connected' : 'Not connected — orders use wa.me link');

    setRunning(false);
  };

  useEffect(() => { if (isOnline) runChecks(); }, [isOnline]);

  const icons = {
    ok:      <CheckCircle size={15} style={{ color: 'var(--mint)' }} />,
    warn:    <AlertCircle size={15} style={{ color: '#f59e0b' }} />,
    error:   <XCircle size={15} style={{ color: 'var(--ember)' }} />,
    loading: <RefreshCw size={15} style={{ color: 'var(--ink3)', animation: 'spin 1s linear infinite' }} />,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink3)', letterSpacing: '.06em' }}>
          فحص النظام
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isOnline
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--mint)', fontWeight: 700 }}><Wifi size={12}/> متصل</span>
            : <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ember)', fontWeight: 700 }}><WifiOff size={12}/> غير متصل</span>
          }
          <button onClick={runChecks} disabled={running}
            style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, background: 'var(--void2)', border: '1px solid var(--border)', color: 'var(--ink2)', cursor: 'pointer' }}>
            {running ? '⟳' : '↺'} فحص
          </button>
        </div>
      </div>

      {checks.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {checks.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--void2)', borderRadius: 8, border: '1px solid var(--border)' }}>
              {icons[c.status]}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink1)' }}>{c.label}</div>
                {c.detail && <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 1 }}>{c.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--ink3)', textAlign: 'center', padding: '16px 0' }}>
          {isOnline ? '...' : 'غير متصل بالإنترنت'}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
