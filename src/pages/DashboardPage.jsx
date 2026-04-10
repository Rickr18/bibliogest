import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { reportsService } from '../services/reportsService.js'
import { loansService } from '../services/loansService.js'
import { formatDate, getDaysLeft } from '../utils/dates.js'
import { LoanStatusBadge, Spinner } from '../components/ui/Misc.jsx'

function StatCard({ label, value, sub, accent, icon }) {
  return (
    <div
      className="stat-card"
      style={{ borderLeft: `4px solid ${accent ?? 'var(--color-paper-3)'}` }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value">{value ?? '—'}</p>
          {sub && <p style={{ fontSize: '12px', color: 'var(--color-ink-3)', marginTop: '6px' }}>{sub}</p>}
        </div>
        <span style={{ fontSize: '28px', opacity: 0.6 }}>{icon}</span>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: reportsService.getDashboardStats,
    refetchInterval: 30000,
  })

  const { data: overdueLoans = [], isLoading: loadingOverdue } = useQuery({
    queryKey: ['overdue-loans'],
    queryFn: loansService.getOverdue,
  })

  const { data: activeData, isLoading: loadingActive } = useQuery({
    queryKey: ['active-loans-dash'],
    queryFn: loansService.getActiveLoans,
  })

  const activeLoans = activeData ?? []
  const recent = activeLoans.slice(0, 6)

  return (
    <div>
      {/* Stats grid */}
      {loadingStats ? (
        <Spinner center />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <StatCard
            label="Libros disponibles"
            value={stats?.available_books}
            sub={`de ${stats?.total_books} en total`}
            accent="var(--color-blue)"
            icon="📚"
          />
          <StatCard
            label="Préstamos activos"
            value={stats?.active_loans}
            sub="en circulación ahora"
            accent="var(--color-accent)"
            icon="📋"
          />
          <StatCard
            label="Vencidos"
            value={stats?.overdue_loans}
            sub="requieren atención"
            accent={stats?.overdue_loans > 0 ? 'var(--color-red)' : 'var(--color-green)'}
            icon="⚠️"
          />
          <StatCard
            label="Usuarios activos"
            value={stats?.total_users}
            sub="lectores registrados"
            accent="var(--color-green)"
            icon="👥"
          />
          <StatCard
            label="Este mes"
            value={stats?.loans_this_month}
            sub="préstamos registrados"
            accent="var(--color-amber)"
            icon="📅"
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Préstamos vencidos */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-paper-3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--color-ink)' }}>
              🚨 Préstamos vencidos
            </h2>
            <Link to="/loans?status=overdue" className="btn btn-ghost btn-sm">Ver todos</Link>
          </div>

          {loadingOverdue ? (
            <Spinner center />
          ) : overdueLoans.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-ink-3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
              <p style={{ fontSize: '14px' }}>Sin préstamos vencidos</p>
            </div>
          ) : (
            <div>
              {overdueLoans.slice(0, 5).map((loan) => (
                <div
                  key={loan.id}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--color-paper-2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {loan.book_title}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--color-ink-3)', marginTop: '2px' }}>
                      {loan.user_name} · {loan.document_id}
                    </p>
                  </div>
                  <span
                    className="badge badge-red"
                    style={{ flexShrink: 0, fontSize: '11px' }}
                  >
                    {Math.abs(getDaysLeft(loan.due_date))} días
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actividad reciente */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-paper-3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--color-ink)' }}>
              📋 Préstamos activos
            </h2>
            <Link to="/loans" className="btn btn-ghost btn-sm">Ver todos</Link>
          </div>

          {loadingActive ? (
            <Spinner center />
          ) : recent.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-ink-3)' }}>
              <p style={{ fontSize: '14px' }}>Sin préstamos activos</p>
            </div>
          ) : (
            <div>
              {recent.map((loan) => {
                const days = getDaysLeft(loan.due_date)
                return (
                  <div
                    key={loan.id}
                    style={{
                      padding: '14px 20px',
                      borderBottom: '1px solid var(--color-paper-2)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {loan.book_title}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--color-ink-3)', marginTop: '2px' }}>
                        {loan.user_name} · vence {formatDate(loan.due_date)}
                      </p>
                    </div>
                    <span
                      className={`badge ${days < 0 ? 'badge-red' : days <= 2 ? 'badge-amber' : 'badge-blue'}`}
                      style={{ flexShrink: 0, fontSize: '11px' }}
                    >
                      {days < 0 ? `${Math.abs(days)}d venció` : days === 0 ? 'Hoy' : `${days}d`}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div
        style={{
          marginTop: '24px',
          padding: '20px 24px',
          background: 'var(--color-ink)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: '4px' }}>
          Acceso rápido
        </span>
        <Link to="/loans/new" className="btn" style={{ background: 'var(--color-accent)', color: 'white' }}>
          + Nuevo préstamo
        </Link>
        <Link to="/books/new" className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', border: 'none' }}>
          + Agregar libro
        </Link>
        <Link to="/users/new" className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', border: 'none' }}>
          + Registrar usuario
        </Link>
      </div>
    </div>
  )
}
