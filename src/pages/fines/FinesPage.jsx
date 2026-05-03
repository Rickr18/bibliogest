import { useQuery } from '@tanstack/react-query'
import { finesService } from '../../services/finesService.js'
import { useSearch } from '../../hooks/useSearch.js'
import { Spinner, EmptyState, Pagination } from '../../components/ui/Misc.jsx'
import { USER_ROLES } from '../../utils/constants.js'
import { formatDate } from '../../utils/dates.js'

function StatBox({ label, value, color, icon }) {
  return (
    <div className="stat-card" style={{ borderLeft: `3px solid ${color}`, padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="stat-label" style={{ fontSize: '10px' }}>{label}</p>
          <p className="stat-value" style={{ fontSize: '22px', color }}>{value ?? '—'}</p>
        </div>
        <span style={{ fontSize: '24px', opacity: 0.55 }}>{icon}</span>
      </div>
    </div>
  )
}

export function FinesPage() {
  const { page, setPage } = useSearch({})

  const { data: statsRaw } = useQuery({
    queryKey: ['fines-stats'],
    queryFn: () => finesService.getStats(),
  })
  const stats = statsRaw ?? {}

  const { data, isLoading } = useQuery({
    queryKey: ['fines', page],
    queryFn: () => finesService.getAll({ page }),
    keepPreviousData: true,
  })

  const records = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  return (
    <div style={{ maxWidth: '960px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Multas</h1>
          <p className="page-subtitle">Libro contable — cobradas y condonadas por el personal</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        <StatBox
          label="Total recaudado"
          value={`$${Number(stats.total_collected ?? 0).toLocaleString('es-CO')}`}
          color="var(--color-red)"
          icon="💰"
        />
        <StatBox
          label="Este mes"
          value={`$${Number(stats.this_month ?? 0).toLocaleString('es-CO')}`}
          color="var(--color-accent)"
          icon="📅"
        />
        <StatBox
          label="Total cobros"
          value={stats.count ?? 0}
          color="var(--color-blue)"
          icon="📋"
        />
        <StatBox
          label="Cobros este mes"
          value={stats.count_this_month ?? 0}
          color="var(--color-amber)"
          icon="📊"
        />
        <StatBox
          label="Condonadas"
          value={`$${Number(stats.total_waived ?? 0).toLocaleString('es-CO')} (${stats.count_waived ?? 0})`}
          color="var(--color-ink-3)"
          icon="🔓"
        />
      </div>

      {/* Tabla */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {isLoading ? <Spinner center /> : records.length === 0 ? (
          <EmptyState
            icon="💳"
            title="Sin multas registradas"
            desc="Cada devolución con retraso queda registrada aquí, cobrada o condonada"
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Libro</th>
                  <th>Días vencido</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Gestionado por</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} style={{ opacity: r.waived ? 0.75 : 1 }}>
                    <td>
                      <p style={{ fontWeight: '600', fontSize: '13px', color: 'var(--color-ink)' }}>{r.user_name}</p>
                      <p style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontFamily: 'monospace' }}>{r.document_id}</p>
                    </td>
                    <td>
                      <p style={{ fontSize: '13px', color: 'var(--color-ink)' }}>{r.book_title}</p>
                      <p style={{ fontSize: '11px', color: 'var(--color-ink-3)' }}>{r.book_author}</p>
                    </td>
                    <td>
                      <span className="badge badge-red" style={{ fontSize: '11px' }}>
                        {r.days_overdue}d
                      </span>
                    </td>
                    <td>
                      <p style={{ fontSize: '14px', fontWeight: '700', color: r.waived ? 'var(--color-ink-3)' : 'var(--color-red)', textDecoration: r.waived ? 'line-through' : 'none' }}>
                        ${Number(r.amount).toLocaleString('es-CO')}
                      </p>
                      <p style={{ fontSize: '10px', color: 'var(--color-ink-4)' }}>COP</p>
                    </td>
                    <td>
                      {r.waived ? (
                        <div>
                          <span className="badge badge-gray" style={{ fontSize: '11px', marginBottom: '4px', display: 'inline-block' }}>
                            Condonada
                          </span>
                          {r.waived_reason && (
                            <p style={{ fontSize: '11px', color: 'var(--color-ink-3)', marginTop: '2px', fontStyle: 'italic' }}>
                              "{r.waived_reason}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="badge badge-green" style={{ fontSize: '11px' }}>Cobrada</span>
                      )}
                    </td>
                    <td>
                      {r.collector_name ? (
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-ink)' }}>{r.collector_name}</p>
                          <span style={{
                            fontSize: '10px', fontWeight: '600', textTransform: 'uppercase',
                            padding: '1px 6px', borderRadius: '4px', letterSpacing: '0.04em',
                            background: r.collector_role === 'admin' ? 'var(--color-accent-soft)' : 'var(--color-paper-3)',
                            color: r.collector_role === 'admin' ? 'var(--color-accent)' : 'var(--color-ink-3)',
                          }}>
                            {USER_ROLES[r.collector_role] ?? r.collector_role}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-ink-4)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: '13px' }}>{formatDate(r.paid_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: '0 16px' }}>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </div>

      {/* Totalizador al pie si hay datos */}
      {records.length > 0 && (
        <div style={{
          marginTop: '16px', padding: '12px 20px',
          background: 'var(--color-paper-2)', borderRadius: 'var(--radius)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: '13px', color: 'var(--color-ink-3)',
        }}>
          <span>Mostrando {records.length} registro{records.length !== 1 ? 's' : ''} de {data?.count ?? 0}</span>
          <span style={{ fontWeight: '700', color: 'var(--color-red)', fontSize: '14px' }}>
            Total histórico: ${Number(stats.total_collected ?? 0).toLocaleString('es-CO')} COP
          </span>
        </div>
      )}
    </div>
  )
}
