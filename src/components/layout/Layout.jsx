import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar.jsx'
import { Header } from './Header.jsx'
import { ToastContainer } from '../ui/Toast.jsx'
import { useUIStore } from '../../store/index.js'

export function Layout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-paper)' }}>
      <Sidebar />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          marginLeft: sidebarOpen ? '240px' : '64px',
          transition: 'margin-left 0.25s ease',
          minHeight: '100vh',
        }}
      >
        <Header />
        <main style={{ flex: 1, padding: '28px 32px', maxWidth: '1280px', width: '100%' }}>
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
