import type { Role } from '@/types/domain'

export function getRoleHome(role: Role): string {
  switch (role) {
    case 'superadmin': return '/superadmin'
    case 'admin': return '/admin'
    case 'boss': return '/boss'
    case 'employee': return '/employee'
  }
}
