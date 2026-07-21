interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void };
  hint?: string;
}

export default function EmptyState({ icon, title, subtitle, action, hint }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" style={{ fontSize: 32 }}>{icon}</div>
      <div>
        <p className="empty-state-title">{title}</p>
        {subtitle && <p className="empty-state-sub" style={{ marginTop: 6 }}>{subtitle}</p>}
        {hint && (
          <p style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 8, padding: '6px 12px', background: 'rgba(255,255,255,.04)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'inline-block' }}>
            💡 {hint}
          </p>
        )}
      </div>
      {action && (
        <button onClick={action.onClick} className="btn btn-primary" style={{ marginTop: 4 }}>
          {action.label}
        </button>
      )}
    </div>
  );
}
