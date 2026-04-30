import { Outlet, NavLink } from 'react-router-dom'
import { Home, Clock, Calendar, History, User } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

const navItems = [
  { to: '/employee', label: 'Inicio', icon: Home, end: true },
  { to: '/employee/clock', label: 'Fichar', icon: Clock },
  { to: '/employee/schedule', label: 'Horario', icon: Calendar },
  { to: '/employee/history', label: 'Historial', icon: History },
  { to: '/employee/profile', label: 'Perfil', icon: User },
]

export function EmployeeShell() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 overflow-y-auto pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm safe-bottom z-50">
        <div className="flex h-[var(--bottom-nav-height)] items-stretch">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
