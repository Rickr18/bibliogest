import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/index.js'
import { notificationsService } from '../../services/usersService.js'

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
  const user = useAuthStore((s) => s.user)

  const role = user?.user_metadata?.role ?? 'staff'
  const isReader = role === 'reader'

  // Conteo de notificaciones pendientes (solo staff/admin)
  const { data: pending = [] } = useQuery({
    queryKey: ['notifications-pending-count'],
    queryFn: () => notificationsService.getAll({ status: 'pending' }),
    enabled: !isReader,
    refetchInterval: 30_000,   // refresca cada 30 s
    staleTime: 15_000,
  })
  const pendingCount = pending.length

  const title = TITLES[pathname]
    ?? (pathname.startsWith('/books/') ? 'Detalle del libro'
       : pathname.startsWith('/users/') ? 'Usuario'
       : 'BiblioGest')

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

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

        {/* Campana de notificaciones — solo staff/admin */}
        {!isReader && (
          <button
            onClick={() => navigate('/notifications')}
            title={pendingCount > 0 ? `${pendingCount} notificación(es) pendiente(s)` : 'Sin notificaciones pendientes'}
            style={{
              position: 'relative',
              width: '36px', height: '36px',
              borderRadius: '50%',
              border: '1px solid var(--color-paper-3)',
              background: pathname === '/notifications' ? 'var(--color-paper-2)' : 'transparent',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '17px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-paper-2)'}
            onMouseLeave={e => e.currentTarget.style.background = pathname === '/notifications' ? 'var(--color-paper-2)' : 'transparent'}
          >
            🔔
            {pendingCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-3px', right: '-3px',
                minWidth: '18px', height: '18px',
                borderRadius: '9px',
                background: 'var(--color-red)',
                color: 'white',
                fontSize: '10px',
                fontWeight: '700',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 4px',
                lineHeight: 1,
                border: '2px solid white',
              }}>
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </button>
        )}

        {/* Avatar + email */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px',
              borderRadius: '50%',
              background: 'var(--color-accent)',
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: '600',
            }}>
              {user.email?.[0]?.toUpperCase() ?? 'B'}
            </div>
            <span style={{ fontSize: '13px', color: 'var(--color-ink-3)' }}>{user.email}</span>
          </div>
        )}
      </div>
    </header>
  )
}
