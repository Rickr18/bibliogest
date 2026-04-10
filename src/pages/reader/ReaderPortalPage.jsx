import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { loansService } from '../../services/loansService.js'
import { notificationsService } from '../../services/usersService.js'
import { useAuthStore, useUIStore } from '../../store/index.js'
import { formatDate, getDaysLeft } from '../../utils/dates.js'
import { LoanStatusBadge, Spinner, EmptyState } from '../../components/ui/Misc.jsx'
import { Modal } from '../../components/ui/Modal.jsx'

const FINE_PER_DAY = 500

export function ReaderPortalPage() {
  const user = useAuthStore(s => s.user)
  const addToast = useUIStore(s => s.addToast)
  const [notifyModal, setNotifyModal] = useState(null)
  const [newDate, setNewDate] = useState('')
  const [message, setMessage] = useState('')
  const qc = useQueryClient()

  // El user.id aquí es el auth_id; necesitamos el users.id
  const { data: readerProfile } = useQuery({
    queryKey: ['reader-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await import('../../services/supabaseClient.js').then(m =>
        m.supabase.from('users').select('*').eq('auth_id', user.id).single()
      )
      if (error) throw error
      return data
    },
    enabled: Boolean(user?.id),
  })

  const { data: activeLoans = [], isLoading } = useQuery({
    queryKey: ['reader-loans', readerProfile?.id],
    queryFn: () => loansService.getByUser(readerProfile.id),
    enabled: Boolean(readerProfile?.id),
  })

  const { data: myNotifications = [] } = useQuery({
    queryKey: ['reader-notifications', readerProfile?.id],
    queryFn: () => notificationsService.getByUser(readerProfile.id),
    enabled: Boolean(readerProfile?.id),
  })

  const notifyMutation = useMutation({
    mutationFn: data => notificationsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reader-notifications'] })
      addToast('Notificación enviada a la biblioteca', 'success')
      setNotifyModal(null)
      setNewDate('')
      setMessage('')
    },
    onError: err => addToast(err.message, 'error'),
  })

  function handleNotify(e) {
    e.preventDefault()
    const days = getDaysLeft(notifyModal.due_date)
    const fine = days < 0 ? Math.abs(getDaysLeft(newDate || notifyModal.due_date)) * FINE_PER_DAY : 0
    notifyMutation.mutate({
      loan_id: notifyModal.id,
      user_id: readerProfile.id,
      new_return_date: newDate || null,
      message,
      fine_amount: fine,
    })
  }

  if (isLoading) return <Spinner center />

  return (
    <div style={{ maxWidth: '760px' }}>
      {/* Saludo */}
      <div style={{ marginBottom: '28px' }}>
        <h1 className="page-title">Mis préstamos</h1>
        <p className="page-subtitle">Hola, {readerProfile?.full_name ?? user?.email} — aquí puedes ver tus libros activos y notificar retrasos.</p>
      </div>

      {/* Préstamos activos */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-paper-3)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px' }}>Libros que tienes actualmente</h2>
        </div>

        {activeLoans.length === 0 ? (
          <EmptyState icon="📚" title="Sin préstamos activos" desc="No tienes libros prestados en este momento" />
        ) : (
          <div>
            {activeLoans.map(loan => {
              const days = getDaysLeft(loan.due_date)
              const fine = days < 0 ? Math.abs(days) * FINE_PER_DAY : 0
              const isOverdue = days < 0
              return (
                <div key={loan.id} style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--color-paper-2)',
                  background: isOverdue ? 'rgba(220,38,38,0.03)' : 'white',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px',
                }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '600', fontSize: '15px', color: 'var(--color-ink)', marginBottom: '4px' }}>
                      {loan.books?.title}
                    </p>
                    <p style={{ fontSize: '13px', color: 'var(--color-ink-3)', marginBottom: '8px' }}>
                      {loan.books?.author}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--color-ink-3)', flexWrap: 'wrap' }}>
                      <span>📅 Préstamo: {formatDate(loan.loan_date)}</span>
                      <span>⏰ Vence: {formatDate(loan.due_date)}</span>
                    </div>
                    {isOverdue && (
                      <div style={{ marginTop: '8px', background: 'var(--color-red-soft)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                        <p style={{ fontSize: '13px', color: 'var(--color-red)', fontWeight: '600' }}>
                          ⚠️ {Math.abs(days)} días de retraso · Multa estimada: ${fine.toLocaleString('es-CO')} COP
                        </p>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                    <span className={`badge ${isOverdue ? 'badge-red' : days <= 2 ? 'badge-amber' : 'badge-blue'}`}>
                      {isOverdue ? `${Math.abs(days)}d vencido` : days === 0 ? 'Vence hoy' : `${days}d restantes`}
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setNotifyModal(loan); setNewDate('') }}
                    >
                      {isOverdue ? '⚠️ Notificar retraso' : '📢 Avisar novedad'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Historial de notificaciones enviadas */}
      {myNotifications.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-paper-3)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px' }}>Mis notificaciones enviadas</h2>
          </div>
          <div>
            {myNotifications.map(n => (
              <div key={n.id} style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-paper-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                  <p style={{ fontSize: '13px', color: 'var(--color-ink)', fontWeight: '500' }}>
                    {n.loans?.books?.title ?? 'Libro'}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--color-ink-3)', marginTop: '2px' }}>
                    {n.message ?? 'Sin mensaje'} · {formatDate(n.created_at)}
                  </p>
                  {n.new_return_date && (
                    <p style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>
                      Nueva fecha propuesta: {formatDate(n.new_return_date)}
                    </p>
                  )}
                </div>
                <span className={`badge ${n.status === 'approved' ? 'badge-green' : n.status === 'rejected' ? 'badge-red' : 'badge-amber'}`}>
                  {n.status === 'pending' ? 'Pendiente' : n.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: notificar retraso */}
      <Modal open={Boolean(notifyModal)} onClose={() => setNotifyModal(null)} title="Notificar novedad al sistema">
        {notifyModal && (
          <form onSubmit={handleNotify}>
            <div style={{ background: 'var(--color-paper-2)', borderRadius: 'var(--radius)', padding: '14px', marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-ink)' }}>{notifyModal.books?.title}</p>
              <p style={{ fontSize: '12px', color: 'var(--color-ink-3)', marginTop: '2px' }}>
                Vence: {formatDate(notifyModal.due_date)}
              </p>
            </div>

            <div className="field">
              <label className="label">Nueva fecha estimada de devolución</label>
              <input
                className="input"
                type="date"
                value={newDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setNewDate(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label">Motivo o mensaje para la biblioteca *</label>
              <textarea
                className="input"
                required
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Explica el motivo del retraso..."
                style={{ minHeight: '90px' }}
              />
            </div>

            {newDate && getDaysLeft(notifyModal.due_date) < 0 && (
              <div style={{ background: 'var(--color-amber-soft)', borderRadius: 'var(--radius)', padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--color-amber)' }}>
                ⚠️ Se generará una multa estimada de <strong>
                  ${(Math.abs(getDaysLeft(notifyModal.due_date)) * FINE_PER_DAY).toLocaleString('es-CO')} COP
                </strong> por los días de retraso actuales. La biblioteca confirmará el monto exacto.
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setNotifyModal(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={notifyMutation.isPending}>
                {notifyMutation.isPending ? 'Enviando...' : 'Enviar notificación'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
