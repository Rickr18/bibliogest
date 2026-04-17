import { getDaysLeft } from '../../utils/dates.js'

// Pagination
export function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', padding: '12px 0' }}>
      <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => onPage(page - 1)}>
        ‹ Anterior
      </button>
      <span style={{ fontSize: '13px', color: 'var(--color-ink-3)' }}>
        Pág. {page} de {totalPages}
      </span>
      <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => onPage(page + 1)}>
        Siguiente ›
      </button>
    </div>
  )
}

// Spinner
export function Spinner({ size = 20, center = false }) {
  const el = (
    <div
      style={{
        width: size, height: size,
        border: `2px solid var(--color-paper-3)`,
        borderTopColor: 'var(--color-accent)',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  )
  if (center) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        {el}
      </div>
    )
  }
  return el
}

// StatusBadge for loans
const STATUS_MAP = {
  active: { label: 'Activo', cls: 'badge badge-blue' },
  returned: { label: 'Devuelto', cls: 'badge badge-green' },
  overdue: { label: 'Vencido', cls: 'badge badge-red' },
  renewed: { label: 'Renovado', cls: 'badge badge-amber' },
}

export function LoanStatusBadge({ status, dueDate }) {
  // Si está activo/renovado pero ya venció la fecha, mostrar como vencido visualmente
  const effectiveStatus =
    dueDate && (status === 'active' || status === 'renewed') && getDaysLeft(dueDate) < 0
      ? 'overdue'
      : status
  const s = STATUS_MAP[effectiveStatus] ?? { label: effectiveStatus, cls: 'badge badge-gray' }
  return <span className={s.cls}>{s.label}</span>
}

// ReputationBadge
const REPUTATION_CONFIG = {
  excellent: { label: 'Buen hábito de préstamo', icon: '⭐', bg: 'rgba(16,185,129,0.10)', color: '#059669' },
  good:      { label: 'Buen hábito de préstamo', icon: '✅', bg: 'rgba(59,130,246,0.10)', color: '#2563eb' },
  neutral:   { label: 'Hábito regular',          icon: '⚠️', bg: 'rgba(217,119,6,0.10)',  color: '#b45309' },
  bad:       { label: 'Mal hábito de préstamo',  icon: '⛔', bg: 'rgba(200,75,49,0.10)',  color: '#c84b31' },
  new:       { label: 'Sin historial',            icon: '📖', bg: 'rgba(107,114,128,0.10)', color: '#6b7280' },
}

export function ReputationBadge({ reputation, showDetail = false }) {
  if (!reputation) return null
  const cfg = REPUTATION_CONFIG[reputation.level] ?? REPUTATION_CONFIG.new
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', gap: '6px',
      background: cfg.bg, border: `1px solid ${cfg.color}22`,
      borderRadius: '8px', padding: '8px 12px', minWidth: '180px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '14px' }}>{cfg.icon}</span>
        <span style={{ fontSize: '12px', fontWeight: '600', color: cfg.color }}>{cfg.label}</span>
      </div>
      {showDetail && reputation.total > 0 && (
        <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--color-ink-4)' }}>
          <span>✓ {reputation.on_time} a tiempo</span>
          <span>✗ {reputation.late} con retraso</span>
          <span style={{ color: cfg.color, fontWeight: '600' }}>Score: {reputation.score}</span>
        </div>
      )}
    </div>
  )
}

// EmptyState
export function EmptyState({ icon = '📭', title = 'Sin resultados', desc = 'No hay datos para mostrar', action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', marginBottom: '8px', color: 'var(--color-ink)' }}>{title}</h3>
      <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', marginBottom: action ? '20px' : 0 }}>{desc}</p>
      {action}
    </div>
  )
}
