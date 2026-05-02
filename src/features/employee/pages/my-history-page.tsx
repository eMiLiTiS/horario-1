import { parseISO } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'
import { Clock, LogIn, LogOut, Pause, Play, MapPin, AlertTriangle } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { Badge } from '@/shared/components/ui/badge'
import { LoadingState, ErrorState, EmptyState } from '@/shared/components/ui/states'
import { groupEntriesByDay, computeWorkedTime, formatHHMM, formatTime, TZ } from '@/shared/lib/time'
import { ACTION_LABELS } from '@/types/domain'
import type { TimeEntry, TimeEntryAction } from '@/types/domain'
import { useEmployee } from '../hooks/use-employee'
import { useMyHistory } from '../hooks/use-my-history'

// ── Action metadata ────────────────────────────────────────────

const ACTION_ICON: Record<TimeEntryAction, React.ElementType> = {
  clock_in: LogIn,
  break_start: Pause,
  break_end: Play,
  clock_out: LogOut,
}

const ACTION_ICON_CLASS: Record<TimeEntryAction, string> = {
  clock_in: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  break_start: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  break_end: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  clock_out: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

// ── Entry row ─────────────────────────────────────────────────

function EntryRow({ entry }: { entry: TimeEntry }) {
  const Icon = ACTION_ICON[entry.action]

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className={cn('h-7 w-7 rounded-full flex items-center justify-center shrink-0', ACTION_ICON_CLASS[entry.action])}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{ACTION_LABELS[entry.action]}</p>
        {entry.is_corrected && (
          <p className="text-xs text-amber-600 dark:text-amber-400">Fichaje corregido</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {entry.gps_valid === false && (
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-label="Fuera de radio GPS" />
        )}
        {entry.gps_valid === true && (
          <MapPin className="h-3.5 w-3.5 text-emerald-500" aria-label="GPS válido" />
        )}
        <span className="text-sm tabular-nums text-muted-foreground font-mono">
          {formatTime(entry.occurred_at)}
        </span>
      </div>
    </div>
  )
}

// ── Day card ──────────────────────────────────────────────────

function DayCard({ day, entries }: { day: string; entries: TimeEntry[] }) {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  )
  const { worked_minutes, break_minutes, is_complete } = computeWorkedTime(sorted)
  const dayLabel = formatInTimeZone(
    parseISO(`${day}T12:00:00`),
    TZ,
    "EEEE, d 'de' MMMM",
    { locale: es },
  )

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Day header */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/40 border-b">
        <div className="min-w-0">
          <p className="text-sm font-semibold capitalize truncate">{dayLabel}</p>
          {worked_minutes > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatHHMM(worked_minutes)} trabajadas
              {break_minutes > 0 && ` · ${formatHHMM(break_minutes)} descanso`}
            </p>
          )}
        </div>
        <div className="shrink-0 ml-3">
          {is_complete ? (
            <Badge className="text-xs border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              Completada
            </Badge>
          ) : worked_minutes > 0 ? (
            <Badge className="text-xs border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              Incompleta
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Entries */}
      <div className="divide-y">
        {sorted.map((entry) => (
          <EntryRow key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export function MyHistoryPage() {
  const {
    data: empData,
    isLoading: empLoading,
    error: empError,
    refetch: empRefetch,
  } = useEmployee()

  const {
    data: entries = [],
    isLoading: histLoading,
    error: histError,
    refetch: histRefetch,
  } = useMyHistory(empData?.employee.id)

  const isLoading = empLoading || histLoading
  const error = empError ?? histError

  if (isLoading) return <LoadingState fullPage />
  if (error) {
    return (
      <ErrorState
        message={(error as Error).message}
        onRetry={() => {
          empRefetch()
          histRefetch()
        }}
      />
    )
  }

  const groups = groupEntriesByDay(entries)
  const days = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Mi historial</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Últimos 30 días</p>
      </div>

      {days.length === 0 ? (
        <EmptyState
          title="Sin fichajes"
          description="No hay fichajes registrados en los últimos 30 días."
          icon={<Clock className="h-10 w-10" />}
        />
      ) : (
        <div className="space-y-4">
          {days.map((day) => (
            <DayCard key={day} day={day} entries={groups[day]} />
          ))}
        </div>
      )}
    </div>
  )
}
