import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient.js'
import { useAuthStore } from '../../store/index.js'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { setUser, setSession } = useAuthStore()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.')
    } else {
      setUser(data.user)
      setSession(data.session)

      // Obtener perfil para saber si debe cambiar contraseña y a dónde redirigir
      const { data: profile } = await supabase
        .from('users')
        .select('role, must_change_password')
        .eq('auth_id', data.user.id)
        .single()

      if (profile?.must_change_password) {
        navigate('/change-password')
      } else if (profile?.role === 'reader') {
        navigate('/my-loans')
      } else {
        navigate('/dashboard')
      }
    }
    setLoading(false)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-ink)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Background pattern */}
      <div
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(200,75,49,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(200,75,49,0.08) 0%, transparent 40%)',
        }}
      />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📖</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', color: 'white', marginBottom: '8px' }}>
            BiblioGest
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px' }}>
            Sistema de control de préstamos
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          }}
        >
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', marginBottom: '24px', color: 'var(--color-ink)' }}>
            Iniciar sesión
          </h2>

          {error && (
            <div
              style={{
                background: 'var(--color-red-soft)', color: 'var(--color-red)',
                padding: '12px', borderRadius: 'var(--radius)',
                fontSize: '13px', marginBottom: '20px',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="field">
              <label className="label">Correo electrónico</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@biblioteca.co"
                required
                autoFocus
              />
            </div>

            <div className="field">
              <label className="label">Contraseña</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Ingresar al sistema'}
            </button>
          </form>

          <p style={{ fontSize: '12px', color: 'var(--color-ink-4)', textAlign: 'center', marginTop: '20px' }}>
            Solo personal autorizado de la biblioteca
          </p>
        </div>
      </div>
    </div>
  )
}
