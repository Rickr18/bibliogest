import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient.js'
import { useAuthStore } from '../../store/index.js'
import { DEACTIVATION_REASONS } from '../../utils/constants.js'
import { getTodayBogota, getDaysLeft } from '../../utils/dates.js'

/* ── Literary quotes (random on each load) ──────────────────────────────── */
const QUOTES = [
  { text: 'Un lector vive mil vidas antes de morir. El que nunca lee vive solo una.', author: 'George R.R. Martin' },
  { text: 'Los libros son espejos: solo ves en ellos lo que ya llevas dentro.', author: 'Carlos Ruiz Zafón' },
  { text: 'Una habitación sin libros es como un cuerpo sin alma.', author: 'Marco Tulio Cicerón' },
  { text: 'La biblioteca es el templo de la memoria de la humanidad.', author: 'Umberto Eco' },
  { text: 'La lectura es un ejercicio de libertad.', author: 'Mario Vargas Llosa' },
  { text: 'Hay que leer mucho para escribir poco, y callar mucho para hablar bien.', author: 'Gabriel García Márquez' },
]

/* ── CSS book spine generator ───────────────────────────────────────────── */
const SPINE_COLORS = [
  '#7B3F2A','#2C4A6B','#4A3728','#3D5A3E','#6B2D3E',
  '#4B3E8A','#2A5C4A','#8B4513','#1B4F72','#5D4037',
  '#263238','#6A1520','#33691E','#4527A0','#00695C',
  '#4E342E','#1A237E','#B71C1C','#1B5E20','#7B1FA2',
  '#BF360C','#006064','#880E4F','#1565C0','#558B2F',
]

function makeBooks(n, seed) {
  return Array.from({ length: n }, (_, i) => ({
    w: 14 + ((seed + i * 13) % 16),
    h: 128 + ((seed + i * 11) % 72),
    c: SPINE_COLORS[(seed + i * 17) % SPINE_COLORS.length],
  }))
}

// Enough books to fill any screen width
const SHELF_A = makeBooks(55, 7)
const SHELF_B = makeBooks(55, 31)
const SHELF_C = makeBooks(55, 53)

/* ── BookShelf sub-component ────────────────────────────────────────────── */
function BookShelf({ books, opacity }) {
  return (
    <div style={{ opacity }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', padding: '0 4px' }}>
        {books.map((b, i) => (
          <div
            key={i}
            style={{
              width: b.w,
              height: b.h,
              flexShrink: 0,
              backgroundColor: b.c,
              borderRadius: '2px 2px 0 0',
              backgroundImage:
                'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 25%, rgba(0,0,0,0.1) 75%, rgba(0,0,0,0.28) 100%)',
            }}
          />
        ))}
      </div>
      <div style={{
        height: '15px',
        background: 'linear-gradient(180deg, #3d2a0c 0%, #5c3e18 45%, #3a2810 100%)',
        boxShadow: '0 5px 16px rgba(0,0,0,0.7)',
      }} />
    </div>
  )
}

/* ── Inactive account error component ───────────────────────────────────── */
const REASON_ICONS = {
  fine_pending:   '💸',
  rule_violation: '⚠️',
  doc_expired:    '📋',
  suspension:     '⏸️',
  voluntary:      '👋',
  other:          'ℹ️',
}

function InactiveError({ info }) {
  const label = DEACTIVATION_REASONS[info.reason]
  const icon  = REASON_ICONS[info.reason] ?? 'ℹ️'
  const contact = info.isReader
    ? 'Comunícate con un administrador o bibliotecario para regularizar tu situación y recuperar el acceso.'
    : 'Comunícate con el administrador del sistema para reactivar tu cuenta.'

  return (
    <div style={{
      marginBottom: '24px',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1.5px solid rgba(200,75,49,0.22)',
      boxShadow: '0 2px 16px rgba(200,75,49,0.1)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '11px 16px',
        background: 'linear-gradient(90deg, rgba(200,75,49,0.1) 0%, rgba(200,75,49,0.05) 100%)',
        borderBottom: '1px solid rgba(200,75,49,0.15)',
      }}>
        <span style={{ fontSize: '17px', lineHeight: 1 }}>🔒</span>
        <span style={{
          fontWeight: '700', fontSize: '14px',
          color: '#c84b31', letterSpacing: '0.01em',
          fontFamily: 'var(--font-display)',
        }}>
          Cuenta deshabilitada
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', background: '#fffaf9' }}>

        {/* Reason badge */}
        {label && (
          <div style={{ marginBottom: '12px' }}>
            <p style={{
              fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
              letterSpacing: '0.08em', color: '#b09a8e', marginBottom: '7px',
            }}>
              Motivo
            </p>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(200,75,49,0.09)', color: '#c84b31',
              fontSize: '13px', fontWeight: '600',
              padding: '6px 12px', borderRadius: '7px',
              border: '1px solid rgba(200,75,49,0.18)',
            }}>
              <span>{icon}</span>
              {label}
            </span>
          </div>
        )}

        {/* Fine amount */}
        {info.fineAmount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 14px', marginBottom: '12px',
            background: 'rgba(200,75,49,0.07)',
            borderRadius: '9px',
            border: '1px solid rgba(200,75,49,0.15)',
          }}>
            <span style={{ fontSize: '24px', lineHeight: 1 }}>💰</span>
            <div>
              <div style={{
                fontSize: '10px', color: '#b09a8e', fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px',
              }}>
                Multa pendiente
              </div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '22px', fontWeight: '700',
                color: '#c84b31', lineHeight: 1.1,
              }}>
                ${info.fineAmount.toLocaleString('es-CO')}
                <span style={{ fontSize: '13px', marginLeft: '4px', fontFamily: 'var(--font-body)' }}>COP</span>
              </div>
            </div>
          </div>
        )}

        {/* Action message */}
        <p style={{ fontSize: '12px', color: '#7a6560', lineHeight: '1.65', margin: 0 }}>
          {contact}
        </p>
      </div>
    </div>
  )
}

/* ── Main LoginPage ──────────────────────────────────────────────────────── */
export function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [loginError, setLoginError] = useState(null) // null | 'credentials' | { inactive obj }
  const navigate = useNavigate()
  const { setUser, setSession, setProfile } = useAuthStore()
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])

  function clearError() { if (loginError) setLoginError(null) }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setLoginError(null)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setLoginError('credentials')
    } else {
      setUser(data.user)
      setSession(data.session)

      const { data: profile } = await supabase
        .from('users')
        .select('id, role, full_name, active, must_change_password, deactivation_reason')
        .eq('auth_id', data.user.id)
        .single()

      if (profile?.active === false) {
        const info = {
          reason: profile.deactivation_reason,
          fineAmount: 0,
          isReader: profile.role === 'reader',
        }

        if (profile.deactivation_reason === 'fine_pending' && profile.role === 'reader') {
          const today = await getTodayBogota()
          const { data: overdueLoans } = await supabase
            .from('loans').select('due_date')
            .eq('user_id', profile.id).lt('due_date', today)
            .in('status', ['active', 'renewed', 'overdue'])

          info.fineAmount = (overdueLoans ?? []).reduce((sum, loan) => {
            const days = Math.abs(getDaysLeft(loan.due_date))
            return sum + days * 500
          }, 0)
        }

        await supabase.auth.signOut()
        setLoginError(info)
        setLoading(false)
        return
      }

      setProfile(profile ?? null)
      if (profile?.must_change_password)   navigate('/change-password')
      else if (profile?.role === 'reader') navigate('/my-loans')
      else                                 navigate('/dashboard')
    }
    setLoading(false)
  }

  const isInactive = loginError && typeof loginError === 'object'

  return (
    <>
      {/* ── Scoped CSS ─────────────────────────────────────────────────── */}
      <style>{`
        /* Layout root */
        .bl-root {
          min-height: 100vh;
          display: flex;
          background: #090b10;
          font-family: var(--font-body);
        }

        /* ── Left panel (atmospheric) ─────────────────────────────────── */
        .bl-left {
          width: 54%;
          position: relative;
          overflow: hidden;
          background: linear-gradient(185deg, #07090e 0%, #0c1019 55%, #090c14 100%);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          flex-shrink: 0;
        }

        /* ── Right panel (form) ───────────────────────────────────────── */
        .bl-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 56px 48px;
          background: linear-gradient(158deg, #faf8f5 0%, #f0ebe0 100%);
          position: relative;
          overflow-y: auto;
        }
        .bl-right::before {
          content: '';
          position: absolute; inset: 0; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Cpath d='M0 8L8 0' stroke='%231a1a2e' stroke-width='0.25' opacity='0.07'/%3E%3C/svg%3E");
        }

        /* ── Input ────────────────────────────────────────────────────── */
        .bl-input {
          width: 100%;
          padding: 12px 14px 12px 44px;
          border: 1.5px solid #ddd5c8;
          border-radius: 10px;
          font-size: 14px;
          color: var(--color-ink);
          background: rgba(255,255,255,0.65);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          font-family: var(--font-body);
          box-sizing: border-box;
        }
        .bl-input:focus {
          border-color: var(--color-accent);
          background: #ffffff;
          box-shadow: 0 0 0 3.5px rgba(200,75,49,0.11);
        }
        .bl-input::placeholder { color: #c8bfb4; }

        /* ── Button ───────────────────────────────────────────────────── */
        .bl-btn {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #c84b31 0%, #a83828 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s;
          font-family: var(--font-display);
          letter-spacing: 0.03em;
          position: relative;
          overflow: hidden;
        }
        .bl-btn::after {
          content: '';
          position: absolute; top: 0; left: -100%; width: 55%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.45s ease;
        }
        .bl-btn:hover::after { left: 150%; }
        .bl-btn:hover:not(:disabled) {
          box-shadow: 0 7px 24px rgba(200,75,49,0.38);
          transform: translateY(-1px);
        }
        .bl-btn:active:not(:disabled) { transform: translateY(0); box-shadow: none; }
        .bl-btn:disabled { opacity: 0.62; cursor: not-allowed; }

        /* ── Eye toggle ───────────────────────────────────────────────── */
        .bl-eye {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; padding: 4px;
          color: #c8bfb4; font-size: 15px; transition: color 0.15s; line-height: 1;
        }
        .bl-eye:hover { color: var(--color-accent); }

        /* ── Entrance animations ──────────────────────────────────────── */
        @keyframes bl-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .bl-a0 { animation: bl-in 0.45s ease both; }
        .bl-a1 { animation: bl-in 0.45s 0.08s ease both; }
        .bl-a2 { animation: bl-in 0.45s 0.16s ease both; }
        .bl-a3 { animation: bl-in 0.45s 0.24s ease both; }
        .bl-a4 { animation: bl-in 0.45s 0.32s ease both; }

        @keyframes bl-quote {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .bl-quote { animation: bl-quote 0.9s 0.5s ease both; }

        /* ── Spinner ──────────────────────────────────────────────────── */
        @keyframes bl-spin { to { transform: rotate(360deg); } }
        .bl-spinner {
          display: inline-block;
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: bl-spin 0.7s linear infinite;
          vertical-align: middle;
        }

        /* ── Responsive ───────────────────────────────────────────────── */
        @media (max-width: 768px) {
          .bl-left { display: none !important; }
          .bl-right { padding: 52px 24px; }
          .bl-mobile-logo { display: flex !important; }
        }
      `}</style>

      <div className="bl-root">

        {/* ══════════════════════════════════════════════════════════════
            LEFT PANEL — atmospheric library
        ══════════════════════════════════════════════════════════════ */}
        <div className="bl-left">

          {/* Ambient color gradients */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `
              radial-gradient(ellipse at 28% 14%, rgba(200,75,49,0.15) 0%, transparent 48%),
              radial-gradient(ellipse at 72% 88%, rgba(75,55,120,0.11) 0%, transparent 42%),
              radial-gradient(ellipse at 55% 52%, rgba(14,28,50,0.55) 0%, transparent 65%)
            `,
          }} />

          {/* Vignette on the sides of the shelves */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
            backgroundImage: `
              linear-gradient(90deg, rgba(8,10,14,0.7) 0%, transparent 18%, transparent 82%, rgba(8,10,14,0.7) 100%),
              linear-gradient(0deg, rgba(8,10,14,0.55) 0%, transparent 30%)
            `,
          }} />

          {/* BiblioGest logo */}
          <div style={{
            position: 'absolute', top: '40px', left: '44px',
            display: 'flex', alignItems: 'center', gap: '14px', zIndex: 10,
          }}>
            <div style={{
              width: '44px', height: '44px',
              background: 'rgba(200,75,49,0.14)',
              border: '1.5px solid rgba(200,75,49,0.28)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            }}>📖</div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '700',
                color: '#f0ece4', letterSpacing: '0.01em', lineHeight: 1.2,
              }}>BiblioGest</div>
              <div style={{
                fontSize: '10px', color: 'rgba(240,236,228,0.35)',
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>Sistema de Biblioteca</div>
            </div>
          </div>

          {/* ── Book shelves ── */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1 }}>
            <BookShelf books={SHELF_A} opacity={0.62} />
          </div>
          <div style={{ position: 'absolute', bottom: '112px', left: '-10px', right: 0, zIndex: 1 }}>
            <BookShelf books={SHELF_B} opacity={0.44} />
          </div>
          <div style={{ position: 'absolute', bottom: '226px', left: '6px', right: 0, zIndex: 1 }}>
            <BookShelf books={SHELF_C} opacity={0.28} />
          </div>

          {/* Quote glass card */}
          <div className="bl-quote" style={{
            position: 'relative', zIndex: 10,
            margin: '0 44px 52px',
            padding: '22px 28px 20px',
            background: 'rgba(255,255,255,0.046)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: '18px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07)',
          }}>
            {/* Opening quote mark */}
            <span style={{
              display: 'block',
              fontFamily: 'Georgia, serif',
              fontSize: '52px', lineHeight: '0.7',
              color: 'rgba(200,75,49,0.6)',
              marginBottom: '16px',
            }}>"</span>

            <p style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: '16px',
              color: 'rgba(242,238,230,0.88)',
              lineHeight: '1.72',
              margin: '0 0 18px',
            }}>
              {quote.text}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                height: '1px', width: '20px',
                background: 'rgba(200,75,49,0.55)', flexShrink: 0,
              }} />
              <span style={{
                fontSize: '11px',
                color: 'rgba(240,236,228,0.4)',
                letterSpacing: '0.06em',
              }}>
                {quote.author}
              </span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT PANEL — login form
        ══════════════════════════════════════════════════════════════ */}
        <div className="bl-right">

          {/* Mobile-only logo (hidden on desktop via CSS) */}
          <div
            className="bl-mobile-logo"
            style={{
              display: 'none',
              position: 'absolute', top: '32px', left: '50%', transform: 'translateX(-50%)',
              alignItems: 'center', gap: '10px',
            }}
          >
            <span style={{ fontSize: '28px' }}>📖</span>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '22px',
              color: 'var(--color-ink)', fontWeight: '700',
            }}>BiblioGest</span>
          </div>

          {/* Form card */}
          <div style={{ width: '100%', maxWidth: '380px', position: 'relative', zIndex: 1 }}>

            {/* Heading */}
            <div className="bl-a0" style={{ marginBottom: '32px' }}>
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '30px', fontWeight: '700',
                color: 'var(--color-ink)',
                margin: '0 0 8px', lineHeight: 1.15,
              }}>
                Bienvenido de vuelta
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--color-ink-3)', margin: 0, lineHeight: 1.6 }}>
                Ingresa tus credenciales para acceder al sistema
              </p>
            </div>

            {/* ── Error: wrong credentials ── */}
            {loginError === 'credentials' && (
              <div className="bl-a0" style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                background: 'rgba(200,75,49,0.07)',
                border: '1.5px solid rgba(200,75,49,0.2)',
                borderRadius: '10px', padding: '12px 14px',
                marginBottom: '22px',
              }}>
                <span style={{ fontSize: '15px', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
                <div>
                  <p style={{
                    fontSize: '13px', fontWeight: '600',
                    color: 'var(--color-accent)', margin: '0 0 3px',
                  }}>
                    Credenciales incorrectas
                  </p>
                  <p style={{ fontSize: '12px', color: '#8a4a40', margin: 0, lineHeight: 1.55 }}>
                    Verifica tu correo y contraseña e intenta nuevamente.
                  </p>
                </div>
              </div>
            )}

            {/* ── Error: inactive account ── */}
            {isInactive && <InactiveError info={loginError} />}

            {/* ── Form ── */}
            <form onSubmit={handleLogin}>

              {/* Email */}
              <div className="bl-a1" style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block', fontSize: '11px', fontWeight: '700',
                  letterSpacing: '0.07em', textTransform: 'uppercase',
                  color: 'var(--color-ink-3)', marginBottom: '8px',
                }}>
                  Correo electrónico
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '14px', top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '14px', color: '#c8bfb4',
                    pointerEvents: 'none', lineHeight: 1,
                  }}>✉</span>
                  <input
                    className="bl-input"
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearError() }}
                    placeholder="usuario@biblioteca.co"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="bl-a2" style={{ marginBottom: '26px' }}>
                <label style={{
                  display: 'block', fontSize: '11px', fontWeight: '700',
                  letterSpacing: '0.07em', textTransform: 'uppercase',
                  color: 'var(--color-ink-3)', marginBottom: '8px',
                }}>
                  Contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '14px', top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '14px', color: '#c8bfb4',
                    pointerEvents: 'none', lineHeight: 1,
                  }}>🔐</span>
                  <input
                    className="bl-input"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearError() }}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="bl-eye"
                    onClick={() => setShowPass(v => !v)}
                    title={showPass ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPass ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="bl-a3">
                <button type="submit" className="bl-btn" disabled={loading}>
                  {loading ? (
                    <span style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: '10px',
                    }}>
                      <span className="bl-spinner" />
                      Verificando...
                    </span>
                  ) : (
                    'Ingresar al sistema'
                  )}
                </button>
              </div>
            </form>

            {/* Footer divider */}
            <div className="bl-a4" style={{
              display: 'flex', alignItems: 'center',
              gap: '12px', marginTop: '28px',
            }}>
              <div style={{ flex: 1, height: '1px', background: '#d8d0c4' }} />
              <p style={{
                fontSize: '11px', color: '#c8bfb4',
                margin: 0, whiteSpace: 'nowrap',
              }}>
                Solo personal autorizado
              </p>
              <div style={{ flex: 1, height: '1px', background: '#d8d0c4' }} />
            </div>

          </div>
        </div>

      </div>
    </>
  )
}
