import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/index.js'

export function ProtectedRoute({ children }) {
  const session = useAuthStore((s) => s.session)
  if (!session) return <Navigate to="/login" replace />
  return children
}
