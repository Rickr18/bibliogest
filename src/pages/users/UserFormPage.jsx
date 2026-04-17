import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersService } from '../../services/usersService.js'
import { useAuthStore, useUIStore } from '../../store/index.js'
import { PRINCIPAL_ADMIN_ID, DEACTIVATION_REASONS } from '../../utils/constants.js'
import { Spinner } from '../../components/ui/Misc.jsx'
import { Modal } from '../../components/ui/Modal.jsx'

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefghjkmnpqrstwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function UserFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const addToast = useUIStore(s => s.addToast)
  const currentUser = useAuthStore(s => s.user)
  const currentProfile = useAuthStore(s => s.profile)

  // Fuente de verdad del rol: tabla users (no user_metadata, que puede estar vacío)
  const currentUserRole = currentProfile?.role ?? 'staff'
  // PRINCIPAL_ADMIN_ID es users.id → comparar con currentProfile?.id (también users.id)
  const isActorPrincipalAdmin = currentProfile?.id === PRINCIPAL_ADMIN_ID

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '',
    document_id: '', role: 'reader', notes: '', active: true,
    deactivation_reason: null,
  })
  const [createdStaff, setCreatedStaff] = useState(null)
  const [showConfirmReset, setShowConfirmReset] = useState(false)
  const [resetResult, setResetResult] = useState(null)

  const { data: existing, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersService.getById(id),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) setForm({
      full_name: existing.full_name ?? '', email: existing.email ?? '',
      phone: existing.phone ?? '', document_id: existing.document_id ?? '',
      role: existing.role ?? 'reader', notes: existing.notes ?? '',
      active: existing.active ?? true,
      deactivation_reason: existing.deactivation_reason ?? null,
    })
  }, [existing])

  // ── Cálculo de permisos ───────────────────────────────────────────────────
  // isSelf: el usuario logueado edita su propio perfil
  const isSelf = isEdit && Boolean(existing?.auth_id) && existing?.auth_id === currentUser?.id
  // isPrincipalAdmin: el usuario DESTINO es el admin raíz (comparar users.id)
  const isPrincipalAdmin = isEdit && existing?.id === PRINCIPAL_ADMIN_ID
  // isFullyLocked: ningún actor (salvo el propio admin raíz) puede editar nada del admin principal
  const isFullyLocked = isPrincipalAdmin && !isActorPrincipalAdmin

  // Opciones de rol que el actor puede asignar
  // ┌──────────────────────┬──────────────────────────────────────┐
  // │ Actor                │ Puede asignar                        │
  // ├──────────────────────┼──────────────────────────────────────┤
  // │ Admin principal      │ reader, staff, admin (cualquiera)    │
  // │ Admin normal         │ reader, staff (no admin)             │
  // │ Bibliotecario        │ reader (solo al crear)               │
  // └──────────────────────┴──────────────────────────────────────┘
  const assignableRoles = (() => {
    if (!isEdit) {
      // Creando un usuario nuevo
      if (isActorPrincipalAdmin) return ['reader', 'staff', 'admin']
      if (currentUserRole === 'admin') return ['reader', 'staff']
      return ['reader'] // staff
    }
    // Editando un usuario existente
    if (isPrincipalAdmin) return [] // el rol del admin raíz es inmutable
    if (isActorPrincipalAdmin) return ['reader', 'staff', 'admin']
    if (currentUserRole === 'admin') {
      // Admin normal: no puede tocar usuarios que ya son admin
      if (existing?.role === 'admin') return []
      return ['reader', 'staff']
    }
    return [] // staff no puede cambiar roles
  })()

  const canChangeRole = assignableRoles.length > 0

  // Estado (activo/inactivo) — quién puede tocarlo y sobre quién
  // ┌─────────────────────┬──────────────────────────────────────────────┐
  // │ Actor               │ Puede cambiar estado de…                     │
  // ├─────────────────────┼──────────────────────────────────────────────┤
  // │ Admin principal     │ Cualquier usuario EXCEPTO sí mismo           │
  // │ Admin normal        │ Lectores y bibliotecarios (no otros admins)  │
  // │ Bibliotecario       │ Solo lectores (no self, no staff, no admin)  │
  // └─────────────────────┴──────────────────────────────────────────────┘
  const canChangeActive = isEdit && (() => {
    if (isPrincipalAdmin) return false                              // admin raíz: nadie puede cambiar su estado
    if (isActorPrincipalAdmin) return true                         // admin principal puede cambiar el estado de cualquiera
    if (currentUserRole === 'admin') return existing?.role !== 'admin'  // admin normal: no otros admins
    if (currentUserRole === 'staff') return existing?.role === 'reader' && !isSelf  // staff: solo lectores
    return false
  })()

  // Mensaje de bloqueo del campo Rol
  const roleLockReason = (() => {
    if (!isEdit || canChangeRole) return null
    if (isPrincipalAdmin)
      return 'El administrador principal no puede cambiar de rol.'
    if (currentUserRole === 'admin' && existing?.role === 'admin')
      return 'Solo el administrador principal puede modificar el rol de otro administrador.'
    if (currentUserRole === 'staff')
      return 'Para cambiar el rol de este usuario, debes contactar a un administrador.'
    return null
  })()

  // Permiso para mostrar el botón "Generar clave temporal"
  const targetRole = existing?.role
  const canResetPassword = isEdit && Boolean(
    existing?.auth_id &&
    !isSelf &&
    (
      isActorPrincipalAdmin ||
      (currentUserRole === 'admin' && targetRole !== 'admin') ||
      (currentUserRole === 'staff' && targetRole === 'reader')
    )
  )

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: data => usersService.createWithAuth(data),
    onSuccess: result => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setCreatedStaff(result)
    },
    onError: err => addToast(err.message, 'error'),
  })

  const editMutation = useMutation({
    mutationFn: ({ updates, isSelf: selfFlag }) =>
      usersService.update(id, updates, {
        role: currentUserRole,
        isSelf: selfFlag,
        actorId: currentProfile?.id ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      addToast('Usuario actualizado', 'success')
      navigate('/users')
    },
    onError: err => addToast(err.message, 'error'),
  })

  const resetMutation = useMutation({
    mutationFn: () => usersService.resetPassword(id, {
      actorRole: currentUserRole,
      targetRole,
      actorAuthId: currentUser?.id ?? null,
    }),
    onSuccess: result => {
      setShowConfirmReset(false)
      setResetResult(result)
    },
    onError: err => {
      setShowConfirmReset(false)
      addToast(err.message, 'error')
    },
  })

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  function handleSubmit(e) {
    e.preventDefault()
    if (isFullyLocked) return   // guard — nunca debe llegar aquí

    if (isEdit) {
      const updates = {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        document_id: form.document_id,
        notes: form.notes,
      }
      if (canChangeRole) updates.role = form.role
      if (canChangeActive) {
        updates.active = form.active
        // Guardar razón al desactivar; limpiar al reactivar (el trigger DB también lo hace)
        updates.deactivation_reason = form.active ? null : (form.deactivation_reason || null)
      }
      editMutation.mutate({ updates, isSelf })
      return
    }

    if (!form.email) { addToast('El correo electrónico es obligatorio', 'warning'); return }
    const tempPassword = generateTempPassword()
    createMutation.mutate({ ...form, tempPassword })
  }

  const isPending = createMutation.isPending || editMutation.isPending

  if (isEdit && isLoading) return <Spinner center />

  return (
    <div style={{ maxWidth: '640px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? 'Editar usuario' : 'Registrar usuario'}</h1>
          <p className="page-subtitle">
            {isEdit ? `Editando: ${existing?.full_name ?? '...'}` : 'Completa los datos del usuario'}
          </p>
        </div>
        {/* Botón clave temporal en la vista de edición */}
        {canResetPassword && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowConfirmReset(true)}
            title="Generar nueva contraseña temporal para este usuario"
          >
            🔑 Generar clave temporal
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Alerta: perfil completamente bloqueado ── */}
        {isFullyLocked && (
          <div style={{
            background: 'var(--color-red-soft)', border: '1px solid var(--color-red)',
            borderRadius: 'var(--radius)', padding: '14px 18px', marginBottom: '20px',
            display: 'flex', alignItems: 'flex-start', gap: '12px',
          }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>🔒</span>
            <div>
              <p style={{ fontWeight: '600', color: 'var(--color-red)', fontSize: '14px', marginBottom: '4px' }}>
                Perfil protegido — sin permisos de edición
              </p>
              <p style={{ fontSize: '13px', color: 'var(--color-red)', lineHeight: '1.5' }}>
                Este es el administrador principal del sistema. Ningún campo puede ser modificado
                por otro usuario. Solo el propio administrador principal puede editar sus datos.
              </p>
            </div>
          </div>
        )}

        {/* ── Datos personales ── */}
        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '20px' }}>
            Datos personales
          </h3>
          <div className="field">
            <label className="label">Nombre completo *</label>
            <input className="input" required value={form.full_name} disabled={isFullyLocked}
              onChange={e => set('full_name', e.target.value)} placeholder="Nombre y apellidos" />
          </div>
          <div className="field">
            <label className="label">Número de documento *</label>
            <input className="input" required value={form.document_id} disabled={isFullyLocked}
              onChange={e => set('document_id', e.target.value)} placeholder="Cédula o carné estudiantil" />
          </div>
          <div className="field-row">
            <div className="field">
              <label className="label">
                Correo electrónico {form.role !== 'reader' ? '*' : ''}
              </label>
              <input className="input" type="email" value={form.email} disabled={isFullyLocked}
                onChange={e => set('email', e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
            <div className="field">
              <label className="label">Teléfono</label>
              <input className="input" type="tel" value={form.phone} disabled={isFullyLocked}
                onChange={e => set('phone', e.target.value)} placeholder="300 000 0000" />
            </div>
          </div>
          <div className="field">
            <label className="label">Notas internas</label>
            <textarea className="input" value={form.notes} disabled={isFullyLocked}
              onChange={e => set('notes', e.target.value)} placeholder="Observaciones..." />
          </div>
        </div>

        {/* ── Rol y acceso ── */}
        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '16px' }}>
            Rol y acceso
          </h3>

          {/* Aviso: staff creando usuario */}
          {!isEdit && currentUserRole === 'staff' && (
            <div style={{
              background: 'var(--color-amber-soft)', borderRadius: 'var(--radius)',
              padding: '10px 14px', fontSize: '13px', color: 'var(--color-amber)',
              border: '1px solid currentColor', marginBottom: '16px',
            }}>
              ⚠️ Como bibliotecario solo puedes registrar usuarios con rol <strong>Lector</strong>.
              Para crear bibliotecarios o administradores, contacta a un administrador.
            </div>
          )}

          {/* Aviso: staff editándose a sí mismo */}
          {isEdit && isSelf && currentUserRole === 'staff' && (
            <div style={{
              background: 'var(--color-amber-soft)', borderRadius: 'var(--radius)',
              padding: '10px 14px', fontSize: '13px', color: 'var(--color-amber)',
              border: '1px solid currentColor', marginBottom: '16px',
            }}>
              ℹ️ Estás editando tu propio perfil. Solo puedes modificar tus <strong>datos personales</strong>.
              El rol y el estado no están disponibles.
            </div>
          )}

          {/* Aviso: admin principal protegido */}
          {isEdit && isPrincipalAdmin && (
            <div style={{
              background: 'var(--color-red-soft)', borderRadius: 'var(--radius)',
              padding: '10px 14px', fontSize: '13px', color: 'var(--color-red)',
              border: '1px solid currentColor', marginBottom: '16px',
            }}>
              🔒 Este es el administrador principal del sistema. Su rol y estado no pueden modificarse.
            </div>
          )}

          {/* Aviso: admin normal intentando editar a otro admin */}
          {isEdit && !isPrincipalAdmin && currentUserRole === 'admin' && !isActorPrincipalAdmin && existing?.role === 'admin' && (
            <div style={{
              background: 'var(--color-amber-soft)', borderRadius: 'var(--radius)',
              padding: '10px 14px', fontSize: '13px', color: 'var(--color-amber)',
              border: '1px solid currentColor', marginBottom: '16px',
            }}>
              ⚠️ Solo el administrador principal puede modificar el rol de otro administrador.
            </div>
          )}

          <div className="field-row">
            {/* Campo Rol */}
            <div className="field">
              <label className="label">Rol {canChangeRole || !isEdit ? '*' : ''}</label>

              {canChangeRole || !isEdit ? (
                <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
                  {assignableRoles.length > 0
                    ? assignableRoles.map(r => (
                        <option key={r} value={r}>
                          {r === 'reader' ? 'Lector' : r === 'staff' ? 'Bibliotecario' : 'Administrador'}
                        </option>
                      ))
                    : (
                        // Creando como staff → solo lector
                        <option value="reader">Lector</option>
                      )
                  }
                </select>
              ) : (
                // Solo lectura
                <div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px',
                    background: 'var(--color-paper-2)',
                    border: '1px solid var(--color-paper-3)',
                    borderRadius: 'var(--radius)',
                    fontSize: '14px', color: 'var(--color-ink-2)',
                  }}>
                    <span style={{ color: 'var(--color-ink-4)' }}>🔒</span>
                    <span>
                      {form.role === 'admin' ? 'Administrador'
                        : form.role === 'staff' ? 'Bibliotecario'
                        : 'Lector'}
                    </span>
                  </div>
                  {roleLockReason && (
                    <p style={{ fontSize: '12px', color: 'var(--color-ink-4)', marginTop: '5px', lineHeight: '1.4' }}>
                      {roleLockReason}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Campo Estado */}
            {canChangeActive && (
              <div className="field">
                <label className="label">Estado</label>
                <select className="input" value={String(form.active)}
                  onChange={e => {
                    const active = e.target.value === 'true'
                    setForm(f => ({ ...f, active, deactivation_reason: active ? null : f.deactivation_reason }))
                  }}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            )}
          </div>

          {/* Razón de desactivación — solo al marcar como inactivo */}
          {canChangeActive && !form.active && (
            <div className="field" style={{ marginTop: '4px' }}>
              <label className="label">Razón de desactivación</label>
              <select
                className="input"
                value={form.deactivation_reason ?? ''}
                onChange={e => set('deactivation_reason', e.target.value || null)}
              >
                <option value="">Seleccionar razón (opcional)</option>
                {Object.entries(DEACTIVATION_REASONS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              {form.deactivation_reason === 'fine_pending' && (
                <p style={{ fontSize: '12px', color: 'var(--color-amber)', marginTop: '5px', lineHeight: '1.4' }}>
                  ⚠️ Al usar esta razón, el usuario verá el monto de su multa al intentar iniciar sesión.
                </p>
              )}
            </div>
          )}

          {/* Aviso informativo al crear */}
          {!isEdit && (
            <div style={{
              background: 'var(--color-amber-soft)', borderRadius: 'var(--radius)',
              padding: '12px', fontSize: '13px', color: 'var(--color-amber)',
              border: '1px solid currentColor',
            }}>
              🔐 Todos los usuarios reciben una <strong>cuenta de acceso con contraseña temporal</strong>.
              {form.role === 'reader' && ' Los lectores solo verán su portal de préstamos.'}
              {form.role === 'staff' && ' Los bibliotecarios tendrán acceso al panel de administración.'}
              {form.role === 'admin' && ' Los administradores tendrán acceso completo al sistema.'}
              {' '}La contraseña se mostrará al crear el usuario. El correo es obligatorio.
            </div>
          )}
        </div>

        {/* ── Acciones ── */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/users')}>
            {isFullyLocked ? 'Volver' : 'Cancelar'}
          </button>
          {!isFullyLocked && (
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar usuario'}
            </button>
          )}
        </div>
      </form>

      {/* ── Modal: contraseña temporal al crear usuario ── */}
      <Modal
        open={Boolean(createdStaff)}
        onClose={() => { setCreatedStaff(null); navigate('/users') }}
        title="¡Usuario creado con acceso al sistema!"
      >
        {createdStaff && (
          <div>
            <p style={{ fontSize: '14px', color: 'var(--color-ink-2)', marginBottom: '20px' }}>
              El usuario <strong>{createdStaff.user.full_name}</strong> fue creado correctamente.
              Comparte estas credenciales de forma segura. Deberá cambiar la contraseña en su primer inicio de sesión.
            </p>
            <div style={{ background: 'var(--color-paper-2)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '16px' }}>
              <div className="field-row" style={{ marginBottom: 0 }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-ink-4)', marginBottom: '4px' }}>Correo</p>
                  <p style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--color-ink)' }}>{createdStaff.user.email}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-ink-4)', marginBottom: '4px' }}>Contraseña temporal</p>
                  <p style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: '700', color: 'var(--color-accent)', letterSpacing: '0.1em' }}>{createdStaff.tempPassword}</p>
                </div>
              </div>
            </div>
            <div style={{ background: 'var(--color-red-soft)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: '12px', color: 'var(--color-red)', marginBottom: '20px' }}>
              ⚠️ Esta contraseña solo se muestra una vez. Cópiala ahora.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary"
                onClick={() => { navigator.clipboard?.writeText(createdStaff.tempPassword); addToast('Contraseña copiada', 'success') }}>
                Copiar contraseña
              </button>
              <button className="btn btn-primary"
                onClick={() => { setCreatedStaff(null); navigate('/users') }}>
                Entendido, cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: confirmación reset de clave ── */}
      <Modal
        open={showConfirmReset}
        onClose={() => setShowConfirmReset(false)}
        title="Generar clave temporal"
        width="460px"
      >
        <div>
          <p style={{ fontSize: '14px', color: 'var(--color-ink-2)', marginBottom: '16px', lineHeight: '1.6' }}>
            ¿Estás seguro de que deseas generar una nueva clave temporal para{' '}
            <strong>{existing?.full_name}</strong>?
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
            <button className="btn btn-ghost" onClick={() => setShowConfirmReset(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}>
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
              Se ha generado una nueva clave temporal para <strong>{resetResult.name}</strong>.
              Compártela de forma segura. El usuario deberá cambiarla al iniciar sesión.
            </p>
            <div style={{ background: 'var(--color-paper-2)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '12px' }}>
              <div className="field-row" style={{ marginBottom: 0 }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-ink-4)', marginBottom: '4px' }}>Correo</p>
                  <p style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--color-ink)' }}>{resetResult.email}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-ink-4)', marginBottom: '4px' }}>Clave temporal</p>
                  <p style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: '700', color: 'var(--color-accent)', letterSpacing: '0.12em' }}>{resetResult.tempPassword}</p>
                </div>
              </div>
            </div>
            <div style={{ background: 'var(--color-red-soft)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: '12px', color: 'var(--color-red)', marginBottom: '20px' }}>
              🔒 Esta contraseña solo se muestra una vez. Cópiala antes de cerrar esta ventana.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary"
                onClick={() => { navigator.clipboard?.writeText(resetResult.tempPassword); addToast('Contraseña copiada al portapapeles', 'success') }}>
                Copiar contraseña
              </button>
              <button className="btn btn-primary" onClick={() => setResetResult(null)}>Entendido, cerrar</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
