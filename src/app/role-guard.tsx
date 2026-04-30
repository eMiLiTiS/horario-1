import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/use-auth'
import { LoadingState } from '@/shared/components/ui/states'
import { getRoleHome } from './role-utils'
import type { Role } from '@/types/domain'

interface RoleGuardProps {
  allow: Role[]
  children: React.ReactNode
}

export function RoleGuard({ allow, children }: RoleGuardProps) {
  const { profile, loading, session } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingState fullPage />

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!profile) {
    return <Navigate to="/login" replace />
  }

  if (!profile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Cuenta inactiva</h2>
          <p className="text-muted-foreground text-sm">
            Tu cuenta está pendiente de activación. Contacta con tu administrador.
          </p>
        </div>
      </div>
    )
  }

  if (!allow.includes(profile.role)) {
    return <Navigate to={getRoleHome(profile.role)} replace />
  }

  return <>{children}</>
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <LoadingState fullPage />
  if (session && profile) {
    return <Navigate to={getRoleHome(profile.role)} replace />
  }
  return <>{children}</>
}
