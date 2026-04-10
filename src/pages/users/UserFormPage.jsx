import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersService } from '../../services/usersService.js'
import { useUIStore } from '../../store/index.js'
import { Spinner, EmptyState } from '../../components/ui/Misc.jsx'
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

  const [form, setForm] = useState({
    full_name: '', email: '', phone: '',
    document_id: '', role: 'reader', notes: '', active: true,
  })
  const [createdStaff, setCreatedStaff] = useState(null) // muestra la contraseña temporal

  const { data: existing, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersService.getById(id),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) setForm({
      full_name: existing.full_name ?? '', email: existing.email ?? '',
      phone: existing.phone ?? '', document_id: existing.document_id ?? '',
      role: existing.role ?? 'reader', notes: existing.notes ?? '', active: existing.active ?? true,
    })
  }, [existing])

  const createMutation = useMutation({
    mutationFn: data => usersService.createWithAuth(data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setCreatedStaff(result) // mostrar modal con contraseña temporal
    },
    onError: err => addToast(err.message, 'error'),
  })

  const editMutation = useMutation({
    mutationFn: data => usersService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); addToast('Usuario actualizado', 'success'); navigate('/users') },
    onError: err => addToast(err.message, 'error'),
  })

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  function handleSubmit(e) {
    e.preventDefault()
    if (isEdit) { editMutation.mutate(form); return }

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
          <p className="page-subtitle">{isEdit ? `Editando: ${existing?.full_name ?? '...'}` : 'Completa los datos del usuario'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '20px' }}>Datos personales</h3>

          <div className="field">
            <label className="label">Nombre completo *</label>
            <input className="input" required value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Nombre y apellidos" />
          </div>
          <div className="field">
            <label className="label">Número de documento *</label>
            <input className="input" required value={form.document_id} onChange={e => set('document_id', e.target.value)} placeholder="Cédula o carné estudiantil" />
          </div>
          <div className="field-row">
            <div className="field">
              <label className="label">Correo electrónico {form.role !== 'reader' ? '*' : ''}</label>
              <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@ejemplo.com" />
            </div>
            <div className="field">
              <label className="label">Teléfono</label>
              <input className="input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="300 000 0000" />
            </div>
          </div>
          <div className="field">
            <label className="label">Notas internas</label>
            <textarea className="input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Observaciones..." />
          </div>
        </div>

        <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', marginBottom: '16px' }}>Rol y acceso</h3>

          <div className="field-row">
            <div className="field">
              <label className="label">Rol *</label>
              <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="reader">Lector</option>
                <option value="staff">Bibliotecario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            {isEdit && (
              <div className="field">
                <label className="label">Estado</label>
                <select className="input" value={String(form.active)} onChange={e => set('active', e.target.value === 'true')}>
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </div>
            )}
          </div>

          {/* Aviso según rol */}
          {!isEdit && (
            <div style={{ background: 'var(--color-amber-soft)', borderRadius: 'var(--radius)', padding: '12px', fontSize: '13px', color: 'var(--color-amber)', border: '1px solid currentColor' }}>
              🔐 Todos los usuarios reciben una <strong>cuenta de acceso con contraseña temporal</strong>.
              {form.role === 'reader' && ' Los lectores solo verán su portal de préstamos.'}
              {form.role === 'staff' && ' Los bibliotecarios tendrán acceso al panel de administración.'}
              {form.role === 'admin' && ' Los administradores tendrán acceso completo al sistema.'}
              {' '}La contraseña se mostrará al crear el usuario. El correo es obligatorio.
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/users')}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={isPending}>
            {isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar usuario'}
          </button>
        </div>
      </form>

      {/* Modal: mostrar contraseña temporal del staff creado */}
      <Modal open={Boolean(createdStaff)} onClose={() => { setCreatedStaff(null); navigate('/users') }} title="¡Usuario creado con acceso al sistema!">
        {createdStaff && (
          <div>
            <p style={{ fontSize: '14px', color: 'var(--color-ink-2)', marginBottom: '20px' }}>
              El usuario <strong>{createdStaff.user.full_name}</strong> fue creado. Comparte estas credenciales de forma segura. Deberá cambiar la contraseña en su primer inicio de sesión.
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
              <button className="btn btn-secondary" onClick={() => { navigator.clipboard?.writeText(createdStaff.tempPassword); addToast('Contraseña copiada', 'success') }}>
                Copiar contraseña
              </button>
              <button className="btn btn-primary" onClick={() => { setCreatedStaff(null); navigate('/users') }}>
                Entendido, cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
