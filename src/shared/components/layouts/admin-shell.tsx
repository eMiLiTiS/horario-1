import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Calendar, Monitor, AlertCircle,
  BarChart2, Settings, Building2, LogOut, Menu, X, Clock,
} from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { Button } from '@/shared/components/ui/button'
import { Separator } from '@/shared/components/ui/separator'
import { useAuth, signOut } from '@/shared/hooks/use-auth'
import { toast } from 'sonner'

interface AdminShellProps {
  readOnly?: boolean
  superadmin?: boolean
}

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/employees', label: 'Empleados', icon: Users },
  { to: '/admin/schedules', label: 'Horarios', icon: Calendar },
  { to: '/admin/monitor', label: 'Monitor', icon: Monitor },
  { to: '/admin/incidents', label: 'Incidencias', icon: AlertCircle },
  { to: '/admin/reports', label: 'Reportes', icon: BarChart2 },
  { to: '/admin/settings', label: 'Ajustes', icon: Settings },
]

const bossNav = [
  { to: '/boss', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/boss/employees', label: 'Empleados', icon: Users },
  { to: '/boss/schedules', label: 'Horarios', icon: Calendar },
  { to: '/boss/monitor', label: 'Monitor', icon: Monitor },
  { to: '/boss/reports', label: 'Reportes', icon: BarChart2 },
]

const superadminNav = [
  { to: '/superadmin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/superadmin/companies', label: 'Empresas', icon: Building2 },
]

export function AdminShell({ readOnly = false, superadmin = false }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { profile } = useAuth()
  const navigate = useNavigate()

  const navItems = superadmin ? superadminNav : readOnly ? bossNav : adminNav

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login')
    } catch {
      toast.error('Error al cerrar sesión')
    }
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex h-[var(--topbar-height)] items-center px-4 gap-2 shrink-0">
        <Clock className="h-5 w-5 text-primary" />
        <span className="font-semibold text-foreground">Horario</span>
        {readOnly && (
          <span className="ml-auto text-xs text-muted-foreground border rounded px-1.5 py-0.5">Vista</span>
        )}
      </div>
      <Separator />

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <Separator />
      <div className="p-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
            {profile?.first_name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.first_name} {profile?.last_name}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[var(--sidebar-width)] border-r shrink-0">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[var(--sidebar-width)] bg-background border-r z-50">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="flex lg:hidden h-[var(--topbar-height)] items-center px-4 border-b gap-3 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <span className="font-semibold">Horario</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
