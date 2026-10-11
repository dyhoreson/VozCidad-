import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, openAuthModal } = useAuth()
  const location = useLocation()

  useEffect(() => {
    if (!loading && !user) openAuthModal()
  }, [loading, user, openAuthModal])

  if (loading) return <div className="route-loading" role="status">Verificando sua sessão…</div>
  if (!user) return <Navigate to="/" replace state={{ authRequired: true, from: location.pathname }} />
  return children
}
