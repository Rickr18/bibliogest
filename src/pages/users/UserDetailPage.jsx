import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { usersService } from '../../services/usersService.js'
import { formatDate, getDaysLeft } from '../../utils/dates.js'
import { LoanStatusBadge, Spinner, EmptyState } from '../../components/ui/Misc.jsx'
import { USER_ROLES } from '../../utils/constants.js'

export function UserDetailPage() {
  const { id } = useParams()

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersService.getById(id),
  })

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['user-history', id],
    queryFn: () => usersService.getLoanHistory(id),
    enabled: Boolean(id),
  })

  if (isLoading) return <Spinner center />
  if (!user) return <EmptyState title="Usuario no encontrado" />

  const active = history.filter((l) => l.status === 'active' || l.status === 'renewed')
  const returned = history.filter((l) => l.status === 'returned')
  const overdue = history.filter((l) => l.status === 'overdue' || (l.status === 'active' && getDaysLeft(l.due_date) < 0))

  const initials = user.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '56px', height: '56px',
              borderRadius: '50%',
              background: 'var(--color-accent)',
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', fontWeight: '600', flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--color-ink-4)', marginBottom: '4px' }}>
              <Link to="/users" style={{ color: 'var(--color-ink-3)', textDecoration: 'none' }}>Usuarios</Link>
              {' › '}{user.full_name}
            </p>
            <h1 className="page-title" style={{ fontSize: '22px' }}>{user.full_name}</h1>
            <p className="page-subtitle">
              Doc: {user.document_id} ·{' '}
              <span className={`badge ${user.role === 'admin' ? 'badge-red' : user.role === 'staff' ? 'badge-amber' : 'badge-gray'}`} style={{ fontSize: '11px' }}>
                {USER_ROLES[user.role]}
              </span>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to={`/loans/new?userId=${id}`} className="btn btn-primary">+ Nuevo préstamo</Link>
          <Link to={`/users/${id}/edit`} className="btn btn-secondary">Editar</Link>
        </div>
      </div>

      {/* Stats del usuario */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total préstamos', value: history.length, color: 'var(--color-blue)' },
          { label: 'Activos', value: active.length, color: 'var(--color-accent)' },
          { label: 'Devueltos', value: returned.length, color: 'var(--color-green)' },
          { label: 'Vencidos', value: overdue.length, color: overdue.length > 0 ? 'var(--color-red)' : 'var(--color-green)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card" style={{ borderLeft: `3px solid ${color}`, padding: '14px 16px' }}>
            <p className="stat-label" style={{ fontSize: '10px' }}>{label}</p>
            <p className="stat-value" style={{ fontSize: '24px', color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Info de contacto */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '14px' }}>Datos de contacto</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            ['Correo', user.email ?? '—'],
            ['Teléfono', user.phone ?? '—'],
            ['Registrado', formatDate(user.created_at)],
            ['Estado', user.active ? 'Activo' : 'Inactivo'],
          ].map(([label, val]) => (
            <div key={label}>
              <p style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-ink-4)', marginBottom: '2px' }}>{label}</p>
              <p style={{ fontSize: '14px', color: 'var(--color-ink)' }}>{val}</p>
            </div>
          ))}
        </div>
        {user.notes && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-paper-3)' }}>
            <p style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-ink-4)', marginBottom: '4px' }}>Notas</p>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-2)' }}>{user.notes}</p>
          </div>
        )}
      </div>

      {/* Historial de préstamos */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-paper-3)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px' }}>
            Historial de préstamos
          </h3>
        </div>
        {loadingHistory ? (
          <Spinner center />
        ) : history.length === 0 ? (
          <EmptyState icon="📚" title="Sin historial" desc="Este usuario aún no tiene préstamos registrados" />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Libro</th>
                  <th>Autor</th>
                  <th>Fecha préstamo</th>
                  <th>Vencimiento</th>
                  <th>Devolución</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {history.map((loan) => (
                  <tr key={loan.id}>
                    <td style={{ fontWeight: '500', color: 'var(--color-ink)' }}>{loan.book_title}</td>
                    <td style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>{loan.book_author}</td>
                    <td style={{ fontSize: '13px' }}>{formatDate(loan.loan_date)}</td>
                    <td style={{ fontSize: '13px' }}>{formatDate(loan.due_date)}</td>
                    <td style={{ fontSize: '13px' }}>{loan.return_date ? formatDate(loan.return_date) : '—'}</td>
                    <td><LoanStatusBadge status={loan.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
