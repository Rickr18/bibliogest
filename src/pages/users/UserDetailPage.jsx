import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersService } from '../../services/usersService.js'
import { useAuthStore, useUIStore } from '../../store/index.js'
import { formatDate, getDaysLeft } from '../../utils/dates.js'
import { LoanStatusBadge, Spinner, EmptyState, ReputationBadge } from '../../components/ui/Misc.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { USER_ROLES, PRINCIPAL_ADMIN_ID, FINE_PER_DAY_COP } from '../../utils/constants.js'

export function UserDetailPage() {
  const { id } = useParams()
  const qc = useQueryClient()
  const addToast = useUIStore(s => s.addToast)
  const currentUser = useAuthStore(s => s.user)
  const currentProfile = useAuthStore(s => s.profile)
  const currentUserRole = currentProfile?.role ?? 'staff'
  // PRINCIPAL_ADMIN_ID es users.id → comparar con currentProfile?.id (también users.id)
  const isActorPrincipalAdmin = currentProfile?.id === PRINCIPAL_ADMIN_ID

  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const [resetResult, setResetResult] = useState(null)

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersService.getById(id),
  })

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['user-history', id],
    queryFn: () => usersService.getLoanHistory(id),
    enabled: Boolean(id),
  })

  const { data: reputation } = useQuery({
    queryKey: ['user-reputation', id],
    queryFn: () => usersService.getReputation(id),
    enabled: Boolean(id),
  })

  // ── Permiso para generar clave temporal ──────────────────────────────────
  // - Solo si el usuario objetivo tiene cuenta de acceso (auth_id)
  // - Nadie se puede resetear a sí mismo por esta vía
  // - Admin principal  → puede resetear cualquier usuario (reader, staff, admin)
  // - Admin normal     → puede resetear reader y staff; NO otros admins
  // - Bibliotecario    → solo puede resetear lectores (reader)
  const isSelf = user?.auth_id === currentUser?.id
  const targetRole = user?.role
  const canResetPassword = Boolean(
    user?.auth_id &&
    !isSelf &&
    (
      isActorPrincipalAdmin ||
      (currentUserRole === 'admin' && targetRole !== 'admin') ||
      (currentUserRole === 'staff' && targetRole === 'reader')
    )
  )

  const resetMutation = useMutation({
    mutationFn: () => usersService.resetPassword(id, {
      actorRole: currentUserRole,
      targetRole,
      actorAuthId: currentUser?.id ?? null,
    }),
    onSuccess: result => {
      setShowConfirmReset(false)
      setResetResult(result)
      qc.invalidateQueries({ queryKey: ['user', id] })
    },
    onError: err => {
      setShowConfirmReset(false)
      addToast(err.message, 'error')
    },
  })

  if (isLoading) return <Spinner center />
  if (!user) return <EmptyState title="Usuario no encontrado" />

  const active = history.filter(l => l.status === 'active' || l.status === 'renewed')
  const returned = history.filter(l => l.status === 'returned')
  const overdue = history.filter(l =>
    l.status === 'overdue' || (l.status === 'active' && getDaysLeft(l.due_date) < 0)
  )

  const totalFine = overdue.reduce((sum, l) => {
    const days = getDaysLeft(l.due_date)
    return sum + (days < 0 ? Math.abs(days) * FINE_PER_DAY_COP : 0)
  }, 0)

  const initials = user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* ── Header ── */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'var(--color-accent)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', fontWeight: '600', flexShrink: 0,
          }}>
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
              <span className={`badge ${
                user.role === 'admin' && user.id !== PRINCIPAL_ADMIN_ID ? 'badge-green' :
                user.role === 'admin' ? 'badge-red' :
                user.role === 'staff' ? 'badge-amber' : 'badge-gray'
              }`} style={{ fontSize: '11px' }}>
                {USER_ROLES[user.role]}
              </span>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {canResetPassword && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowConfirmReset(true)}
              title="Generar nueva contraseña temporal para este usuario"
            >
              🔑 Generar clave temporal
            </button>
          )}
          <Link to={`/loans/new?userId=${id}`} className="btn btn-primary">+ Nuevo préstamo</Link>
          <Link to={`/users/${id}/edit`} className="btn btn-secondary">Editar</Link>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: totalFine > 0 ? '12px' : '24px' }}>
        {[
          { label: 'Total préstamos', value: history.length, color: 'var(--color-blue)' },
          { label: 'Activos',         value: active.length,  color: 'var(--color-accent)' },
          { label: 'Devueltos',       value: returned.length, color: 'var(--color-green)' },
          { label: 'Vencidos',        value: overdue.length,
            color: overdue.length > 0 ? 'var(--color-red)' : 'var(--color-green)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card" style={{ borderLeft: `3px solid ${color}`, padding: '14px 16px' }}>
            <p className="stat-label" style={{ fontSize: '10px' }}>{label}</p>
            <p className="stat-value" style={{ fontSize: '24px', color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Alerta de multa ── */}
      {totalFine > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--color-red-soft)', border: '1px solid #fca5a5',
          borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '24px',
          gap: '12px', flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-red)', marginBottom: '2px' }}>
              ⚠️ Multa acumulada: ${totalFine.toLocaleString('es-CO')} COP
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-red)', opacity: 0.8 }}>
              {overdue.length} préstamo{overdue.length !== 1 ? 's' : ''} vencido{overdue.length !== 1 ? 's' : ''} · $500/día de retraso
            </p>
          </div>
          {user.role === 'reader' && user.active && (
            <Link to={`/users/${id}/edit?action=suspend`} className="btn btn-danger" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
              Inhabilitar cuenta
            </Link>
          )}
        </div>
      )}

      {/* ── Datos de contacto ── */}
      <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '14px' }}>
          Datos de contacto
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            ['Correo',     user.email ?? '—'],
            ['Teléfono',   user.phone ?? '—'],
            ['Estado',     user.active ? 'Activo' : 'Inactivo'],
          ].map(([label, val]) => (
            <div key={label}>
              <p style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-ink-4)', marginBottom: '2px' }}>
                {label}
              </p>
              <p style={{ fontSize: '14px', color: 'var(--color-ink)' }}>{val}</p>
            </div>
          ))}
        </div>
        {user.notes && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-paper-3)' }}>
            <p style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-ink-4)', marginBottom: '4px' }}>
              Notas
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-ink-2)' }}>{user.notes}</p>
          </div>
        )}
      </div>

      {/* ── Reputación ── */}
      {reputation && (
        <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '14px' }}>
            Comportamiento de préstamos
          </h3>
          <ReputationBadge reputation={reputation} showDetail />
        </div>
      )}

      {/* ── Historial de préstamos ── */}
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
              {history.map(loan => {
                  // Fecha de referencia real (antes de renovaciones)
                  const refDate = loan.original_due_date || loan.due_date
                  const returnedLate = loan.status === 'returned' && loan.return_date && loan.return_date > refDate

                  // Badge de estado enriquecido
                  let badge
                  if (loan.status === 'returned' && returnedLate) {
                    badge = <span className="badge badge-red" style={{ fontSize: '11px' }}>Devuelto con retraso</span>
                  } else if (loan.status === 'returned') {
                    badge = <span className="badge badge-green" style={{ fontSize: '11px' }}>Devuelto a tiempo</span>
                  } else {
                    badge = <LoanStatusBadge status={loan.status} dueDate={loan.due_date} />
                  }

                  // Construir texto del tooltip
                  const tooltipParts = []
                  if (returnedLate) {
                    const daysLate = Math.round((new Date(loan.return_date) - new Date(refDate + 'T12:00:00')) / 86400000)
                    tooltipParts.push(`${daysLate} día${daysLate !== 1 ? 's' : ''} de retraso`)
                  }
                  if (loan.fine_amount > 0) {
                    if (loan.fine_waived) {
                      tooltipParts.push(`Multa condonada: $${Number(loan.fine_amount).toLocaleString('es-CO')} COP`)
                      if (loan.fine_waived_reason) tooltipParts.push(`Motivo: ${loan.fine_waived_reason}`)
                    } else {
                      tooltipParts.push(`Multa cobrada: $${Number(loan.fine_amount).toLocaleString('es-CO')} COP`)
                    }
                  }
                  const tooltipText = tooltipParts.join(' · ')

                  return (
                  <tr key={loan.id}>
                    <td style={{ fontWeight: '500', color: 'var(--color-ink)' }}>{loan.book_title}</td>
                    <td style={{ fontSize: '12px', color: 'var(--color-ink-3)' }}>{loan.book_author}</td>
                    <td style={{ fontSize: '13px' }}>{formatDate(loan.loan_date)}</td>
                    <td style={{ fontSize: '13px' }}>{formatDate(refDate)}</td>
                    <td style={{ fontSize: '13px' }}>{loan.return_date ? formatDate(loan.return_date) : '—'}</td>
                    <td>
                      <div title={tooltipText || undefined} style={{ cursor: tooltipText ? 'help' : 'default', display: 'inline-flex', flexDirection: 'column', gap: '3px' }}>
                        {badge}
                        {loan.fine_amount > 0 && (
                          <span style={{ fontSize: '10px', color: loan.fine_waived ? 'var(--color-ink-3)' : 'var(--color-red)', fontStyle: 'italic' }}>
                            {loan.fine_waived ? 'Multa condonada' : `Multa $${Number(loan.fine_amount).toLocaleString('es-CO')}`}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: confirmación de reset ── */}
      <Modal
        open={showConfirmReset}
        onClose={() => setShowConfirmReset(false)}
        title="Generar clave temporal"
        width="460px"
      >
        <div>
          <p style={{ fontSize: '14px', color: 'var(--color-ink-2)', marginBottom: '16px', lineHeight: '1.6' }}>
            ¿Estás seguro de que deseas generar una nueva clave temporal para{' '}
            <strong>{user.full_name}</strong>?
          </p>
          <div style={{
            background: 'var(--color-amber-soft)', borderRadius: 'var(--radius)',
            padding: '12px 14px', fontSize: '13px', color: 'var(--color-amber)',
            marginBottom: '24px', lineHeight: '1.5',
          }}>
            ⚠️ La contraseña actual del usuario quedará <strong>inactiva de inmediato</strong>.
            Deberá cambiarla al iniciar sesión con la nueva clave.
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setShowConfirmReset(false)}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? 'Generando...' : 'Sí, generar clave'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: resultado del reset ── */}
      <Modal
        open={Boolean(resetResult)}
        onClose={() => setResetResult(null)}
        title="Nueva clave temporal generada"
        width="480px"
      >
        {resetResult && (
          <div>
            <p style={{ fontSize: '14px', color: 'var(--color-ink-2)', marginBottom: '20px', lineHeight: '1.6' }}>
              Se ha generado una nueva clave temporal para{' '}
              <strong>{resetResult.name}</strong>. Compártela de forma segura.
              El usuario deberá cambiarla al iniciar sesión.
            </p>

            <div style={{
              background: 'var(--color-paper-2)', borderRadius: 'var(--radius)',
              padding: '16px', marginBottom: '12px',
            }}>
              <div className="field-row" style={{ marginBottom: 0 }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-ink-4)', marginBottom: '4px' }}>
                    Correo
                  </p>
                  <p style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--color-ink)' }}>
                    {resetResult.email}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-ink-4)', marginBottom: '4px' }}>
                    Clave temporal
                  </p>
                  <p style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: '700', color: 'var(--color-accent)', letterSpacing: '0.12em' }}>
                    {resetResult.tempPassword}
                  </p>
                </div>
              </div>
            </div>

            <div style={{
              background: 'var(--color-red-soft)', borderRadius: 'var(--radius)',
              padding: '10px 14px', fontSize: '12px', color: 'var(--color-red)', marginBottom: '20px',
            }}>
              🔒 Esta contraseña solo se muestra una vez. Cópiala antes de cerrar esta ventana.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(resetResult.tempPassword)
                  addToast('Contraseña copiada al portapapeles', 'success')
                }}
              >
                Copiar contraseña
              </button>
              <button className="btn btn-primary" onClick={() => setResetResult(null)}>
                Entendido, cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
