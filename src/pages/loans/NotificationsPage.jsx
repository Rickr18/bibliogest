import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsService } from '../../services/usersService.js'
import { loansService } from '../../services/loansService.js'
import { useAuthStore, useUIStore } from '../../store/index.js'
import { formatDate, getDaysLeft } from '../../utils/dates.js'
import { USER_ROLES, PRINCIPAL_ADMIN_ID, FINE_PER_DAY_COP } from '../../utils/constants.js'
import { Spinner, EmptyState } from '../../components/ui/Misc.jsx'

export function NotificationsPage() {
  const qc = useQueryClient()
  const addToast = useUIStore(s => s.addToast)
  const currentProfile = useAuthStore(s => s.profile)

  const currentUserRole = currentProfile?.role ?? 'staff'
  const isActorPrincipalAdmin = currentProfile?.id === PRINCIPAL_ADMIN_ID

  // Determina si el actor puede aprobar/rechazar la notificación según el rol del prestatario
  // - Prestatario lector   → cualquier staff/admin puede revisar
  // - Prestatario staff    → solo admins pueden revisar
  // - Prestatario admin    → solo el admin principal puede revisar
  function canReview(borrowerRole) {
    if (!borrowerRole || borrowerRole === 'reader') return true
    if (borrowerRole === 'staff') return currentUserRole === 'admin'
    if (borrowerRole === 'admin') return isActorPrincipalAdmin
    return false
  }

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.getAll(),
  })

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, loanId, newReturnDate }) => {
      await notificationsService.updateStatus(id, status, currentProfile?.id)
      if (status === 'approved' && loanId && newReturnDate) {
        await loansService.updateDueDate(loanId, newReturnDate)
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['notifications-pending-count'] })
      qc.invalidateQueries({ queryKey: ['loans'] })
      addToast(
        vars.status === 'approved' ? 'Aplazamiento aprobado y fecha actualizada' : 'Notificación rechazada',
        vars.status === 'approved' ? 'success' : 'error',
      )
    },
    onError: err => addToast(err.message, 'error'),
  })

  const pending  = notifications.filter(n => n.status === 'pending')
  const reviewed = notifications.filter(n => n.status !== 'pending')

  function ReviewerBadge({ name, role }) {
    if (!name) return <span style={{ color: 'var(--color-ink-4)', fontSize: '12px' }}>—</span>
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-ink)' }}>{name}</span>
        <span style={{
          display: 'inline-block',
          fontSize: '10px', fontWeight: '600',
          textTransform: 'uppercase', letterSpacing: '0.05em',
          padding: '1px 6px', borderRadius: '4px',
          background: role === 'admin' ? 'var(--color-accent-soft)' : 'var(--color-paper-3)',
          color: role === 'admin' ? 'var(--color-accent)' : 'var(--color-ink-3)',
        }}>
          {USER_ROLES[role] ?? role}
        </span>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '920px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notificaciones de retraso</h1>
          <p className="page-subtitle">Avisos enviados por usuarios sobre devoluciones pendientes</p>
        </div>
        {pending.length > 0 && (
          <span className="badge badge-red" style={{ fontSize: '13px', padding: '6px 14px' }}>
            {pending.length} pendiente{pending.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {isLoading ? <Spinner center /> : notifications.length === 0 ? (
        <EmptyState icon="📬" title="Sin notificaciones" desc="No hay avisos de retraso por parte de los lectores" />
      ) : (
        <>
          {/* ── Pendientes ── */}
          {pending.length > 0 && (
            <div className="card" style={{ overflow: 'hidden', marginBottom: '24px' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-paper-3)', background: 'var(--color-amber-soft)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--color-amber)' }}>
                  ⏳ Pendientes de revisión ({pending.length})
                </h3>
              </div>
              {pending.map(n => (
                <div key={n.id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-paper-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: '600', color: 'var(--color-ink)', marginBottom: '4px' }}>{n.book_title}</p>
                      <p style={{ fontSize: '13px', color: 'var(--color-ink-3)', marginBottom: '6px' }}>
                        Lector: <strong>{n.user_name}</strong> · Doc: {n.document_id}
                        {n.phone && <> · Tel: {n.phone}</>}
                      </p>
                      <p style={{ fontSize: '13px', color: 'var(--color-ink-3)', marginBottom: '6px' }}>
                        Vencía: <strong>{formatDate(n.due_date)}</strong>
                        {n.new_return_date && (
                          <> · Nueva fecha propuesta: <strong style={{ color: 'var(--color-ink)' }}>{formatDate(n.new_return_date)}</strong></>
                        )}
                      </p>
                      {n.message && (
                        <p style={{
                          fontSize: '13px', color: 'var(--color-ink-2)',
                          background: 'var(--color-paper-2)', borderRadius: 'var(--radius)',
                          padding: '8px 12px', marginTop: '6px',
                        }}>
                          💬 "{n.message}"
                        </p>
                      )}
                      {(() => {
                        const daysNow = getDaysLeft(n.due_date)
                        const fineNow = daysNow < 0 ? Math.abs(daysNow) * FINE_PER_DAY_COP : 0
                        const fineAtSend = Number(n.fine_amount) || 0
                        return fineNow > 0 ? (
                          <div style={{ marginTop: '6px', background: 'var(--color-red-soft)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                            <p style={{ fontSize: '12px', color: 'var(--color-red)', fontWeight: '600' }}>
                              Multa acumulada hoy: ${fineNow.toLocaleString('es-CO')} COP ({Math.abs(daysNow)}d vencido)
                            </p>
                            {fineAtSend > 0 && fineAtSend !== fineNow && (
                              <p style={{ fontSize: '11px', color: 'var(--color-red)', opacity: 0.75, marginTop: '2px' }}>
                                Al notificar era: ${fineAtSend.toLocaleString('es-CO')} COP
                              </p>
                            )}
                          </div>
                        ) : null
                      })()}
                      <p style={{ fontSize: '11px', color: 'var(--color-ink-4)', marginTop: '8px' }}>
                        Enviado el {formatDate(n.created_at)}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0, alignItems: 'flex-end' }}>
                      {canReview(n.borrower_role) ? (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => reviewMutation.mutate({ id: n.id, status: 'approved', loanId: n.loan_id, newReturnDate: n.new_return_date })}
                            disabled={reviewMutation.isPending}
                          >
                            ✓ Aprobar
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => reviewMutation.mutate({ id: n.id, status: 'rejected' })}
                            disabled={reviewMutation.isPending}
                          >
                            ✕ Rechazar
                          </button>
                        </>
                      ) : (
                        <div style={{
                          fontSize: '11px', color: 'var(--color-ink-4)',
                          background: 'var(--color-paper-2)', borderRadius: 'var(--radius)',
                          padding: '8px 10px', maxWidth: '160px', textAlign: 'center', lineHeight: '1.4',
                        }}>
                          🔒 Solo{' '}
                          {n.borrower_role === 'admin'
                            ? 'el admin principal'
                            : 'un administrador'}{' '}
                          puede revisar esta solicitud
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Historial revisado ── */}
          {reviewed.length > 0 && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-paper-3)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px' }}>
                  Historial de revisiones
                </h3>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Libro</th>
                      <th>Lector</th>
                      <th>Notificado</th>
                      <th>Nueva fecha</th>
                      <th>Multa estimada</th>
                      <th>Revisado por</th>
                      <th>Fecha revisión</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewed.map(n => (
                      <tr key={n.id}>
                        <td style={{ fontWeight: '500' }}>{n.book_title}</td>
                        <td>
                          <p style={{ fontSize: '13px' }}>{n.user_name}</p>
                          <p style={{ fontSize: '11px', color: 'var(--color-ink-4)', fontFamily: 'monospace' }}>{n.document_id}</p>
                        </td>
                        <td style={{ fontSize: '13px' }}>{formatDate(n.created_at)}</td>
                        <td style={{ fontSize: '13px' }}>
                          {n.new_return_date ? formatDate(n.new_return_date) : '—'}
                        </td>
                        <td style={{ fontSize: '13px' }}>
                          {(() => {
                            // Usar fine_amount guardado si existe; si no, recalcular desde due_date hasta created_at
                            const saved = Number(n.fine_amount) || 0
                            if (saved > 0) return <span style={{ color: 'var(--color-red)' }}>${saved.toLocaleString('es-CO')}</span>
                            const sentDate = new Date(n.created_at)
                            const dueDate  = new Date(n.due_date + 'T12:00:00')
                            const diffDays = Math.floor((sentDate - dueDate) / 86400000)
                            const calc = diffDays > 0 ? diffDays * FINE_PER_DAY_COP : 0
                            return calc > 0
                              ? <span style={{ color: 'var(--color-red)' }}>${calc.toLocaleString('es-CO')}</span>
                              : <span style={{ color: 'var(--color-ink-3)' }}>—</span>
                          })()}
                        </td>
                        <td>
                          <ReviewerBadge name={n.reviewer_name} role={n.reviewer_role} />
                        </td>
                        <td style={{ fontSize: '13px' }}>
                          {n.reviewed_at ? formatDate(n.reviewed_at) : '—'}
                        </td>
                        <td>
                          <span className={`badge ${n.status === 'approved' ? 'badge-green' : 'badge-red'}`}>
                            {n.status === 'approved' ? '✓ Aprobado' : '✕ Rechazado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
