import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient.js'
import { useAuthStore, useUIStore } from '../../store/index.js'

export function ChangePasswordPage() {
  const user = useAuthStore(s => s.user)
  const addToast = useUIStore(s => s.addToast)
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const role = user?.user_metadata?.role ?? 'staff'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.updateUser({ password: form.password })
      if (authError) throw authError

      await supabase
        .from('users')
        .update({ must_change_password: false, temp_password_set: false })
        .eq('auth_id', user.id)

      addToast('Contraseña actualizada correctamente', 'success')
      navigate(role === 'reader' ? '/my-loans' : '/dashboard')
    } catch (err) {
      setError(err.message ?? 'Error al cambiar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '480px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cambiar contraseña</h1>
          <p className="page-subtitle">Establece una contraseña personal segura</p>
        </div>
      </div>

      <div className="card" style={{ padding: '28px' }}>
        <div style={{
          background: 'var(--color-amber-soft)', borderRadius: 'var(--radius)',
          padding: '12px 16px', marginBottom: '24px',
          fontSize: '13px', color: 'var(--color-amber)',
          border: '1px solid var(--color-amber)',
        }}>
          🔐 Por seguridad, elige una contraseña que solo tú conozcas y no compartas con nadie.
        </div>

        {error && (
          <div style={{
            background: 'var(--color-red-soft)', color: 'var(--color-red)',
            padding: '12px', borderRadius: 'var(--radius)',
            fontSize: '13px', marginBottom: '20px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="label">Nueva contraseña</label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Mínimo 8 caracteres"
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label className="label">Confirmar contraseña</label>
            <input
              className="input"
              type="password"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Repite la contraseña"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate(role === 'reader' ? '/my-loans' : '/dashboard')}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
