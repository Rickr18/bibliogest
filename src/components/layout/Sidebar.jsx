import { NavLink, useNavigate } from 'react-router-dom'
import { useUIStore, useAuthStore } from '../../store/index.js'
import { supabase } from '../../services/supabaseClient.js'

const NAV_ADMIN = [
  { to: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { to: '/books', icon: '📚', label: 'Libros' },
  { to: '/categories', icon: '🏷️', label: 'Categorías' },
  { to: '/loans', icon: '📋', label: 'Préstamos' },
  { to: '/notifications', icon: '📬', label: 'Notificaciones' },
  { to: '/users', icon: '👤', label: 'Usuarios' },
  { to: '/reports', icon: '📊', label: 'Reportes' },
  { to: '/change-password', icon: '🔑', label: 'Cambiar contraseña' },
]

const NAV_READER = [
  { to: '/my-loans', icon: '📚', label: 'Mis préstamos' },
  { to: '/change-password', icon: '🔑', label: 'Cambiar contraseña' },
]

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { logout, user } = useAuthStore()
  const navigate = useNavigate()

  // Determinar si es lector (reader) o staff/admin
  // Esto se resolvería con el perfil de usuario; por ahora usamos metadata de Supabase Auth
  const role = user?.user_metadata?.role ?? 'staff'
  const isReader = role === 'reader'
  const NAV = isReader ? NAV_READER : NAV_ADMIN

  async function handleLogout() {
    await supabase.auth.signOut()
    logout()
    navigate('/login')
  }

  const linkStyle = (isActive) => ({
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 12px', borderRadius: 'var(--radius)',
    textDecoration: 'none', fontSize: '14px', fontWeight: '500',
    whiteSpace: 'nowrap',
    color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
    background: isActive ? 'rgba(200,75,49,0.85)' : 'transparent',
    transition: 'all 0.15s',
  })

  return (
    <aside style={{
      position: 'fixed', top: 0, left: 0, bottom: 0,
      width: sidebarOpen ? '240px' : '64px',
      background: 'var(--color-ink)', display: 'flex', flexDirection: 'column',
      transition: 'width 0.25s ease', zIndex: 40, overflow: 'hidden',
    }}>
      <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '12px', minHeight: '64px' }}>
        <span style={{ fontSize: '22px', flexShrink: 0 }}>📖</span>
        {sidebarOpen && <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'white', whiteSpace: 'nowrap' }}>BiblioGest</span>}
      </div>

      {sidebarOpen && (
        <div style={{ padding: '8px 16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', paddingBottom: '8px' }}>
            {isReader ? 'Portal lector' : 'Administración'}
          </p>
        </div>
      )}

      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {NAV.map(({ to, icon, label }) => (
          <NavLink key={to} to={to}
            style={({ isActive }) => linkStyle(isActive)}
            onMouseEnter={e => { if (!e.currentTarget.style.background.includes('200,75,49')) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)' } }}
            onMouseLeave={e => { if (!e.currentTarget.style.background.includes('200,75,49')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' } }}
          >
            <span style={{ fontSize: '16px', flexShrink: 0 }}>{icon}</span>
            {sidebarOpen && label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
          borderRadius: 'var(--radius)', border: 'none', background: 'transparent',
          color: 'rgba(255,255,255,0.45)', fontSize: '14px', cursor: 'pointer',
          width: '100%', whiteSpace: 'nowrap', transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
        >
          <span style={{ flexShrink: 0 }}>↪</span>
          {sidebarOpen && 'Cerrar sesión'}
        </button>
      </div>

      <button onClick={toggleSidebar} style={{
        position: 'absolute', bottom: '72px',
        right: sidebarOpen ? '12px' : '50%', transform: sidebarOpen ? 'none' : 'translateX(50%)',
        width: '28px', height: '28px', borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: '12px', transition: 'all 0.25s',
      }}>
        {sidebarOpen ? '‹' : '›'}
      </button>
    </aside>
  )
}
