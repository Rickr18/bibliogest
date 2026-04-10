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

export function LoanStatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { label: status, cls: 'badge badge-gray' }
  return <span className={s.cls}>{s.label}</span>
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
