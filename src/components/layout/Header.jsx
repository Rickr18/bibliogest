import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/index.js'
import { supabase } from '../../services/supabaseClient.js'
import { notificationsService } from '../../services/usersService.js'
import { USER_ROLES, PRINCIPAL_ADMIN_ID } from '../../utils/constants.js'

const TITLES = {
  '/dashboard':        'Dashboard',
  '/books':            'Inventario de libros',
  '/books/new':        'Nuevo libro',
  '/loans':            'Préstamos',
  '/loans/new':        'Nuevo préstamo',
  '/notifications':    'Notificaciones de retraso',
  '/users':            'Usuarios',
  '/users/new':        'Nuevo usuario',
  '/reports':          'Reportes',
  '/categories':       'Categorías',
  '/my-loans':         'Mis préstamos',
  '/change-password':  'Cambiar contraseña',
}

export function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const currentProfile = useAuthStore(s => s.profile)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  const logout = useAuthStore(s => s.logout)

  const role = currentProfile?.role ?? 'staff'
  const isReader = role === 'reader'
  const isActorPrincipalAdmin = currentProfile?.id === PRINCIPAL_ADMIN_ID

  async function handleLogout() {
    await supabase.auth.signOut()
    logout()
    navigate('/login')
  }

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  // Conteo de notificaciones pendientes (solo staff/admin)
  const { data: pending = [] } = useQuery({
    queryKey: ['notifications-pending-count'],
    queryFn: () => notificationsService.getAll({ status: 'pending' }),
    enabled: !isReader,
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
  const pendingCount = pending.length

  const title = TITLES[pathname]
    ?? (pathname.startsWith('/books/') ? 'Detalle del libro'
       : pathname.startsWith('/users/') ? 'Usuario'
       : 'BiblioGest')

  const initials = currentProfile?.full_name
    ? currentProfile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'B'

  const roleBadgeStyle = {
    display: 'inline-block',
    fontSize: '10px', fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    padding: '2px 7px', borderRadius: '4px',
    background: role === 'admin'
      ? 'rgba(200,75,49,0.12)'
      : role === 'staff'
        ? 'rgba(217,119,6,0.12)'
        : 'rgba(59,130,246,0.12)',
    color: role === 'admin'
      ? 'var(--color-accent)'
      : role === 'staff'
        ? 'var(--color-amber)'
        : 'var(--color-blue)',
  }

  const menuBtnStyle = {
    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
    padding: '9px 14px', border: 'none', background: 'transparent',
    borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left',
    fontSize: '13px', color: 'var(--color-ink)', transition: 'background 0.12s',
  }

  return (
    <header style={{
      height: '64px',
      background: 'white',
      borderBottom: '1px solid var(--color-paper-3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 30,
    }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--color-ink)' }}>
        {title}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

        {/* Campana de notificaciones — solo staff/admin */}
        {!isReader && (
          <button
            onClick={() => navigate('/notifications')}
            title={pendingCount > 0 ? `${pendingCount} notificación(es) pendiente(s)` : 'Sin notificaciones pendientes'}
            style={{
              position: 'relative', width: '36px', height: '36px',
              borderRadius: '50%', border: '1px solid var(--color-paper-3)',
              background: pathname === '/notifications' ? 'var(--color-paper-2)' : 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '17px', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-paper-2)'}
            onMouseLeave={e => e.currentTarget.style.background = pathname === '/notifications' ? 'var(--color-paper-2)' : 'transparent'}
          >
            🔔
            {pendingCount > 0 && (
              <span style={{
                position: 'absolute', top: '-3px', right: '-3px',
                minWidth: '18px', height: '18px', borderRadius: '9px',
                background: 'var(--color-red)', color: 'white',
                fontSize: '10px', fontWeight: '700',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px', lineHeight: 1, border: '2px solid white',
              }}>
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </button>
        )}

        {/* Perfil — clic o hover abre el menú */}
        {user && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onMouseEnter={() => setShowMenu(true)}
              onClick={() => setShowMenu(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: showMenu ? 'var(--color-paper-2)' : 'transparent',
                border: '1px solid ' + (showMenu ? 'var(--color-paper-3)' : 'transparent'),
                borderRadius: 'var(--radius)', padding: '5px 10px 5px 6px',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseLeave={e => {
                // No cerramos al salir — solo click-outside cierra
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'var(--color-accent)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '700', flexShrink: 0,
              }}>
                {initials}
              </div>
              {/* Nombre y rol */}
              <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-ink)', whiteSpace: 'nowrap', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentProfile?.full_name ?? user.email}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--color-ink-4)' }}>
                  {USER_ROLES[role] ?? 'Staff'}
                  {isActorPrincipalAdmin && (
                    <span style={{ marginLeft: '4px', color: 'var(--color-accent)' }}>★</span>
                  )}
                </p>
              </div>
              <span style={{ fontSize: '9px', color: 'var(--color-ink-4)', marginLeft: '2px' }}>
                {showMenu ? '▲' : '▼'}
              </span>
            </button>

            {/* Dropdown de perfil */}
            {showMenu && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                background: 'white', borderRadius: '10px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
                border: '1px solid var(--color-paper-3)',
                minWidth: '260px', zIndex: 50, overflow: 'hidden',
              }}>

                {/* Cabecera del perfil */}
                <div style={{ padding: '16px', background: 'var(--color-paper)', borderBottom: '1px solid var(--color-paper-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: 'var(--color-accent)', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: '700', flexShrink: 0,
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-ink)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentProfile?.full_name ?? '—'}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--color-ink-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <span style={roleBadgeStyle}>
                    {USER_ROLES[role] ?? 'Staff'}
                    {isActorPrincipalAdmin && ' · Principal'}
                  </span>

                  {/* Descripción/notas del perfil */}
                  {currentProfile?.notes && (
                    <p style={{
                      fontSize: '12px', color: 'var(--color-ink-3)',
                      marginTop: '10px', lineHeight: '1.5',
                      paddingTop: '10px', borderTop: '1px solid var(--color-paper-3)',
                    }}>
                      {currentProfile.notes.length > 120
                        ? currentProfile.notes.slice(0, 120) + '…'
                        : currentProfile.notes}
                    </p>
                  )}
                </div>

                {/* Acciones */}
                <div style={{ padding: '6px' }}>
                  <button
                    style={menuBtnStyle}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-paper-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { navigate('/change-password'); setShowMenu(false) }}
                  >
                    <span style={{ fontSize: '15px' }}>🔑</span>
                    Cambiar contraseña
                  </button>

                  {!isReader && currentProfile?.id && (
                    <button
                      style={menuBtnStyle}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-paper-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => { navigate(`/users/${currentProfile.id}`); setShowMenu(false) }}
                    >
                      <span style={{ fontSize: '15px' }}>👤</span>
                      Ver mis datos
                    </button>
                  )}

                  <div style={{ height: '1px', background: 'var(--color-paper-3)', margin: '4px 2px' }} />

                  <button
                    style={{ ...menuBtnStyle, color: 'var(--color-accent)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,75,49,0.07)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    onClick={() => { setShowMenu(false); handleLogout() }}
                  >
                    <span style={{ fontSize: '15px' }}>↪</span>
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
