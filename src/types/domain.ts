export type Role = 'superadmin' | 'admin' | 'boss' | 'employee'

export type TimeEntryAction = 'clock_in' | 'break_start' | 'break_end' | 'clock_out'

export type TimeEntryMethod = 'mobile' | 'qr' | 'kiosk' | 'manual'

export type IncidentType = 'correction' | 'absence' | 'late' | 'extra_hours' | 'other'

export type IncidentStatus = 'pending' | 'approved' | 'rejected'

export type ContractType = 'full_time' | 'part_time' | 'temporal'

export type LeaveType = 'vacation' | 'sick' | 'personal' | 'other'

export interface Company {
  id: string
  name: string
  slug: string
  tax_id: string | null
  address: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
  timezone: string
  gps_lat: number | null
  gps_lng: number | null
  gps_radius_meters: number
  work_day_hours: number
  is_active: boolean
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  company_id: string | null
  role: Role
  first_name: string
  last_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Employee {
  id: string
  company_id: string
  profile_id: string | null
  employee_code: string | null
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  position: string | null
  department: string | null
  hire_date: string
  contract_type: ContractType | null
  weekly_hours: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Schedule {
  id: string
  company_id: string
  employee_id: string
  name: string
  effective_from: string
  effective_until: string | null
  is_active: boolean
  created_at: string
}

export interface Shift {
  id: string
  schedule_id: string
  company_id: string
  day_of_week: number
  start_time: string
  end_time: string
  break_minutes: number
  is_working_day: boolean
}

export interface TimeEntry {
  id: string
  company_id: string
  employee_id: string
  action: TimeEntryAction
  occurred_at: string
  gps_lat: number | null
  gps_lng: number | null
  gps_accuracy: number | null
  gps_valid: boolean | null
  device_info: Record<string, unknown> | null
  ip_address: string | null
  notes: string | null
  method: TimeEntryMethod
  is_corrected: boolean
  correction_ref: string | null
  created_at: string
}

export interface Incident {
  id: string
  company_id: string
  employee_id: string
  type: IncidentType
  description: string
  original_entry_id: string | null
  corrected_action: TimeEntryAction | null
  corrected_timestamp: string | null
  status: IncidentStatus
  resolved_by: string | null
  resolved_at: string | null
  created_by: string
  created_at: string
}

export interface AuditLog {
  id: string
  company_id: string | null
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface WorkedTime {
  worked_minutes: number
  break_minutes: number
  is_complete: boolean
}

export const DAY_NAMES: Record<number, string> = {
  0: 'Lunes',
  1: 'Martes',
  2: 'Miércoles',
  3: 'Jueves',
  4: 'Viernes',
  5: 'Sábado',
  6: 'Domingo',
}

export const ACTION_LABELS: Record<TimeEntryAction, string> = {
  clock_in: 'Entrada',
  break_start: 'Inicio descanso',
  break_end: 'Fin descanso',
  clock_out: 'Salida',
}

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: 'Superadmin',
  admin: 'Administrador',
  boss: 'Jefe',
  employee: 'Empleado',
}
