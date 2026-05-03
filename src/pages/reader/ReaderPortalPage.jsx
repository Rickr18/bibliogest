import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { loansService } from '../../services/loansService.js'
import { notificationsService } from '../../services/usersService.js'
import { useAuthStore, useUIStore } from '../../store/index.js'
import { formatDate, getDaysLeft, getDueDateFromToday } from '../../utils/dates.js'
import { LoanStatusBadge, Spinner, EmptyState } from '../../components/ui/Misc.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { PRINCIPAL_ADMIN_ID } from '../../utils/constants.js'

const FINE_PER_DAY = 500

export function ReaderPortalPage() {
  const currentProfile = useAuthStore(s => s.profile)
  const addToast = useUIStore(s => s.addToast)
  const [notifyModal, setNotifyModal] = useState(null)
  const [newDate, setNewDate] = useState('')
  const [message, setMessage] = useState('')
  const qc = useQueryClient()

  const isReader = currentProfile?.role === 'reader'
  const isStaff  = currentProfile?.role === 'staff'
  const isAdminNormal = currentProfile?.role === 'admin' && currentProfile?.id !== PRINCIPAL_ADMIN_ID
  const isPrincipalAdmin = currentProfile?.id === PRINCIPAL_ADMIN_ID

  const { data: activeLoans = [], isLoading } = useQuery({
    queryKey: ['my-loans', currentProfile?.id],
    queryFn: () => loansService.getByUser(currentProfile.id),
    enabled: Boolean(currentProfile?.id),
  })

  const { data: myNotifications = [] } = useQuery({
    queryKey: ['my-notifications', currentProfile?.id],
    queryFn: () => notificationsService.getByUser(currentProfile.id),
    enabled: Boolean(currentProfile?.id),
  })

  const notifyMutation = useMutation({
    mutationFn: data => notificationsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-notifications'] })
      addToast('Notificación enviada al sistema', 'success')
      setNotifyModal(null)
      setNewDate('')
      setMessage('')
    },
    onError: err => addToast(err.message, 'error'),
  })

  function handleNotify(e) {
    e.preventDefault()
    const daysLate = getDaysLeft(notifyModal.due_date)
    // Multa = días vencidos desde due_date hasta HOY (no hasta la nueva fecha propuesta)
    const fine = daysLate < 0 ? Math.abs(daysLate) * FINE_PER_DAY : 0
    notifyMutation.mutate({
      loan_id: notifyModal.id,
      user_id: currentProfile.id,
      new_return_date: newDate || null,
      message,
      fine_amount: fine,
    })
  }

  if (isLoading) return <Spinner center />

  // Aviso de jerarquía de aprobación para staff/admin
  const approvalNotice = (() => {
    if (isReader) return null
    if (isPrincipalAdmin) return null   // el admin principal no tiene restricción de auto-aprobación
    if (isAdminNormal) return {
      text: 'Como administrador, la extensión de tus préstamos debe ser aprobada por el administrador principal. No puedes aprobarla tú mismo.',
      color: 'var(--color-accent)',
      bg: 'var(--color-accent-soft)',
    }
    if (isStaff) return {
      text: 'Como bibliotecario, la extensión de tus préstamos debe ser aprobada por un administrador. No puedes aprobarla tú mismo.',
      color: 'var(--color-amber)',
      bg: 'var(--color-amber-soft)',
    }
    return null
  })()

  const greetingLabel = isReader
    ? 'aquí puedes ver tus libros activos y notificar retrasos.'
    : 'aquí puedes ver los libros que tienes prestados.'

  return (
    <div style={{ maxWidth: '760px' }}>
      {/* Saludo */}
      <div style={{ marginBottom: '28px' }}>
        <h1 className="page-title">Mis préstamos</h1>
        <p className="page-subtitle">Hola, {currentProfile?.full_name ?? '—'} — {greetingLabel}</p>
      </div>

      {/* Aviso jerarquía aprobación (solo staff/admin normal) */}
      {approvalNotice && (
        <div style={{
          background: approvalNotice.bg,
          border: `1px solid ${approvalNotice.color}`,
          borderRadius: 'var(--radius)', padding: '12px 16px',
          fontSize: '13px', color: approvalNotice.color,
          marginBottom: '20px', lineHeight: '1.5',
        }}>
          ℹ️ {approvalNotice.text}
        </div>
      )}

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
              <div key={n.id} style={{
                padding: '14px 20px', borderBottom: '1px solid var(--color-paper-2)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
              }}>
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

            {/* Aviso extra para staff/admin en el modal */}
            {approvalNotice && (
              <div style={{
                background: approvalNotice.bg, borderRadius: 'var(--radius)',
                padding: '10px 14px', fontSize: '12px', color: approvalNotice.color,
                marginBottom: '16px', lineHeight: '1.4',
              }}>
                ℹ️ Esta solicitud quedará pendiente de aprobación por{' '}
                {isAdminNormal ? 'el administrador principal' : 'un administrador'}.
              </div>
            )}

            <div className="field">
              <label className="label">Nueva fecha estimada de devolución</label>
              <input className="input" type="date" value={newDate}
                min={getDueDateFromToday(0)}
                onChange={e => setNewDate(e.target.value)} required />
            </div>

            <div className="field">
              <label className="label">Motivo o mensaje *</label>
              <textarea className="input" required value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Explica el motivo del retraso..."
                style={{ minHeight: '90px' }} />
            </div>

            {getDaysLeft(notifyModal.due_date) < 0 && (
              <div style={{
                background: 'var(--color-amber-soft)', borderRadius: 'var(--radius)',
                padding: '12px', marginBottom: '16px', fontSize: '13px', color: 'var(--color-amber)',
              }}>
                ⚠️ Multa acumulada hasta hoy: <strong>
                  ${(Math.abs(getDaysLeft(notifyModal.due_date)) * FINE_PER_DAY).toLocaleString('es-CO')} COP
                </strong> ({Math.abs(getDaysLeft(notifyModal.due_date))} días · $500/día). La biblioteca confirmará el monto exacto.
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
