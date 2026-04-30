import { parseISO, differenceInMinutes, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'
import type { TimeEntry, WorkedTime } from '@/types/domain'

const TZ = import.meta.env.VITE_DEFAULT_TIMEZONE ?? 'Europe/Madrid'

export function formatDateTime(iso: string): string {
  return formatInTimeZone(parseISO(iso), TZ, 'dd/MM/yyyy HH:mm:ss', { locale: es })
}

export function formatDate(iso: string): string {
  return formatInTimeZone(parseISO(iso), TZ, 'dd/MM/yyyy', { locale: es })
}

export function formatTime(iso: string): string {
  return formatInTimeZone(parseISO(iso), TZ, 'HH:mm:ss')
}

export function formatHHMM(minutes: number): string {
  const h = Math.floor(Math.abs(minutes) / 60)
  const m = Math.abs(minutes) % 60
  const sign = minutes < 0 ? '-' : ''
  return `${sign}${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
}

export function todayRange(): { from: Date; to: Date } {
  const now = new Date()
  return { from: startOfDay(now), to: endOfDay(now) }
}

export function weekRange(date: Date = new Date()): { from: Date; to: Date } {
  return {
    from: startOfWeek(date, { weekStartsOn: 1 }),
    to: endOfWeek(date, { weekStartsOn: 1 }),
  }
}

export function computeWorkedTime(entries: TimeEntry[]): WorkedTime {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  )

  let worked_minutes = 0
  let break_minutes = 0
  // Tracks when the current work segment started (after clock_in or break_end)
  let work_segment_start: Date | null = null
  let break_segment_start: Date | null = null
  let last_action: string | null = null

  for (const entry of sorted) {
    const ts = new Date(entry.occurred_at)

    switch (entry.action) {
      case 'clock_in':
        work_segment_start = ts
        last_action = 'clock_in'
        break

      case 'break_start':
        if (work_segment_start) {
          worked_minutes += differenceInMinutes(ts, work_segment_start)
          work_segment_start = null
        }
        break_segment_start = ts
        last_action = 'break_start'
        break

      case 'break_end':
        if (break_segment_start) {
          break_minutes += differenceInMinutes(ts, break_segment_start)
          break_segment_start = null
        }
        work_segment_start = ts
        last_action = 'break_end'
        break

      case 'clock_out':
        if (work_segment_start) {
          worked_minutes += differenceInMinutes(ts, work_segment_start)
          work_segment_start = null
        }
        last_action = 'clock_out'
        break
    }
  }

  const is_complete = last_action === 'clock_out'
  return { worked_minutes, break_minutes, is_complete }
}

export function groupEntriesByDay(entries: TimeEntry[]): Record<string, TimeEntry[]> {
  // Group by local date in TZ to avoid UTC-date mismatch (e.g. 23:30 Madrid = next UTC day)
  const groups: Record<string, TimeEntry[]> = {}
  for (const entry of entries) {
    const day = formatInTimeZone(parseISO(entry.occurred_at), TZ, 'yyyy-MM-dd')
    if (!groups[day]) groups[day] = []
    groups[day].push(entry)
  }
  return groups
}

export function getNextAction(
  todayEntries: TimeEntry[],
): 'clock_in' | 'break_start' | 'break_end' | 'clock_out' | null {
  if (todayEntries.length === 0) return 'clock_in'
  const last = [...todayEntries].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  )[0]
  switch (last.action) {
    case 'clock_in':
    case 'break_end':
      // After clock_in or break_end the employee can start break or clock out.
      // ClockCard will show both options; this returns the primary "break" action.
      return 'break_start'
    case 'break_start':
      return 'break_end'
    case 'clock_out':
      return null
    default:
      return 'clock_in'
  }
}

// Returns whether the employee can also clock_out directly (not just break_start)
export function canClockOutDirectly(todayEntries: TimeEntry[]): boolean {
  if (todayEntries.length === 0) return false
  const last = [...todayEntries].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  )[0]
  return last.action === 'clock_in' || last.action === 'break_end'
}

export { TZ }
