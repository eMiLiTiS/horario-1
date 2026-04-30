import { Navigate } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/use-auth'
import { LoadingState } from '@/shared/components/ui/states'
import { getRoleHome } from './role-utils'

export function RootRedirect() {
  const { profile, loading } = useAuth()
  if (loading) return <LoadingState fullPage />
  if (!profile) return <Navigate to="/login" replace />
  return <Navigate to={getRoleHome(profile.role)} replace />
}
