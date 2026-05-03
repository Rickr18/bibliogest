import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useNavigate } from 'react-router-dom'
import { useUIStore, useAuthStore } from '../../store/index.js'

const NAV_ADMIN = [
  { to: '/dashboard',     icon: '⊞',  label: 'Dashboard' },
  { to: '/books',         icon: '📚', label: 'Libros' },
  { to: '/categories',    icon: '🏷️', label: 'Categorías' },
  {
    group: true, to: '/loans', icon: '📋', label: 'Préstamos',
    children: [{ to: '/my-loans', icon: '📖', label: 'Mis préstamos' }],
  },
  { to: '/notifications', icon: '📬', label: 'Notificaciones' },
  { to: '/users',         icon: '👤', label: 'Usuarios' },
  { to: '/reports',       icon: '📊', label: 'Reportes' },
  { to: '/fines',         icon: '💰', label: 'Multas' },
]

const NAV_READER = [
  { to: '/my-loans', icon: '📚', label: 'Mis préstamos' },
]

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { profile } = useAuthStore()
  const navigate = useNavigate()

  const [loansHovered, setLoansHovered] = useState(false)
  const [toggleHovered, setToggleHovered] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState(null)
  const toggleBtnRef = useRef(null)

  const role = profile?.role ?? 'staff'
  const isReader = role === 'reader'
  const NAV = isReader ? NAV_READER : NAV_ADMIN

  const linkStyle = (isActive) => ({
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 12px', borderRadius: 'var(--radius)',
    textDecoration: 'none', fontSize: '14px', fontWeight: '500',
    whiteSpace: 'nowrap',
    color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
    background: isActive ? 'rgba(200,75,49,0.85)' : 'transparent',
    transition: 'all 0.15s',
  })

  const hoverOn = (e) => {
    if (!e.currentTarget.style.background.includes('200,75,49')) {
      e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
      e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
    }
  }
  const hoverOff = (e) => {
    if (!e.currentTarget.style.background.includes('200,75,49')) {
      e.currentTarget.style.background = 'transparent'
      e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
    }
  }

  function handleToggleEnter() {
    setToggleHovered(true)
    if (!sidebarOpen && toggleBtnRef.current) {
      const rect = toggleBtnRef.current.getBoundingClientRect()
      setTooltipStyle({
        position: 'fixed',
        top: rect.top + rect.height / 2,
        left: rect.right + 10,
        transform: 'translateY(-50%)',
        background: 'rgba(20,20,40,0.95)',
        color: 'white',
        fontSize: '12px',
        padding: '5px 12px',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        pointerEvents: 'none',
        letterSpacing: '0.01em',
      })
    }
  }

  function handleToggleLeave() {
    setToggleHovered(false)
    setTooltipStyle(null)
  }

  return (
    <>
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: sidebarOpen ? '240px' : '64px',
        background: 'var(--color-ink)', display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease', zIndex: 40, overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: '12px', minHeight: '64px',
        }}>
          <span style={{ fontSize: '22px', flexShrink: 0 }}>📖</span>
          {sidebarOpen && (
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'white', whiteSpace: 'nowrap' }}>
              BiblioGest
            </span>
          )}
        </div>

        {sidebarOpen && (
          <div style={{ padding: '8px 16px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{
              fontSize: '10px', fontWeight: '600', letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', paddingBottom: '8px',
            }}>
              {isReader ? 'Portal lector' : 'Administración'}
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV.map((item) => {
            if (item.group && item.children) {
              return (
                <div
                  key={item.to}
                  onMouseEnter={() => setLoansHovered(true)}
                  onMouseLeave={() => setLoansHovered(false)}
                >
                  <NavLink
                    to={item.to}
                    style={({ isActive }) => linkStyle(isActive)}
                    onMouseEnter={hoverOn}
                    onMouseLeave={hoverOff}
                  >
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                    {sidebarOpen && (
                      <>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        <span style={{
                          fontSize: '10px',
                          opacity: loansHovered ? 0.9 : 0.4,
                          transition: 'opacity 0.15s, transform 0.15s',
                          display: 'inline-block',
                          transform: loansHovered ? 'rotate(180deg)' : 'none',
                        }}>▾</span>
                      </>
                    )}
                  </NavLink>

                  {loansHovered && sidebarOpen && (
                    <div style={{ paddingLeft: '12px', marginTop: '2px' }}>
                      {item.children.map(child => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          style={({ isActive }) => ({
                            ...linkStyle(isActive),
                            fontSize: '13px',
                            padding: '8px 12px',
                          })}
                          onMouseEnter={hoverOn}
                          onMouseLeave={hoverOff}
                        >
                          <span style={{ fontSize: '14px', flexShrink: 0 }}>{child.icon}</span>
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => linkStyle(isActive)}
                onMouseEnter={hoverOn}
                onMouseLeave={hoverOff}
              >
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icon}</span>
                {sidebarOpen && item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* Toggle button */}
        <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            ref={toggleBtnRef}
            onClick={toggleSidebar}
            onMouseEnter={handleToggleEnter}
            onMouseLeave={handleToggleLeave}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: 'var(--radius)',
              border: 'none',
              background: toggleHovered ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: toggleHovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)',
              fontSize: '14px', cursor: 'pointer',
              width: '100%', whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '20px', flexShrink: 0, lineHeight: 1 }}>
              {sidebarOpen ? '◀' : '▶'}
            </span>
            {sidebarOpen && (
              <span style={{ fontSize: '13px' }}>Ocultar panel</span>
            )}
          </button>
        </div>
      </aside>

      {/* Portal tooltip — visible fuera del aside cuando está colapsado */}
      {tooltipStyle && createPortal(
        <div style={tooltipStyle}>
          Mostrar panel lateral
        </div>,
        document.body
      )}
    </>
  )
}
