import { useState } from 'react'
import { Loader2, LogOut, MapPin, AlertTriangle, CheckCircle2, WifiOff } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardContent } from '@/shared/components/ui/card'
import { LoadingState, ErrorState } from '@/shared/components/ui/states'
import { getNextAction, canClockOutDirectly, computeWorkedTime, formatHHMM } from '@/shared/lib/time'
import { ACTION_LABELS } from '@/types/domain'
import type { TimeEntryAction } from '@/types/domain'
import { useOnlineStatus } from '@/shared/hooks/use-online-status'
import { useEmployee } from '../hooks/use-employee'
import { useTodayEntries } from '../hooks/use-today-entries'
import { useClockAction, type ClockResult } from '../hooks/use-clock-action'

// ── Types ─────────────────────────────────────────────────────

type ClockStatus = 'idle' | 'working' | 'on_break' | 'done'

function deriveStatus(nextAction: TimeEntryAction | null, entryCount: number): ClockStatus {
  if (entryCount === 0) return 'idle'
  if (nextAction === null) return 'done'
  if (nextAction === 'break_end') return 'on_break'
  return 'working'
}

const STATUS_LABEL: Record<ClockStatus, string> = {
  idle: 'Fuera',
  working: 'Trabajando',
  on_break: 'En descanso',
  done: 'Jornada completada',
}

const STATUS_CLASS: Record<ClockStatus, string> = {
  idle: 'border-transparent bg-secondary text-secondary-foreground',
  working: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  on_break: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  done: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
}

// ── Component ─────────────────────────────────────────────────

interface ClockCardProps {
  /**
   * Pass true when the live GPS preview (ClockPage) shows the employee
   * is outside the company's allowed radius. Pre-emptively disables buttons
   * so the user doesn't have to wait 12 s for GPS only to get a block error.
   * The mutation itself always blocks independently as a second layer.
   */
  gpsBlocked?: boolean
}

export function ClockCard({ gpsBlocked = false }: ClockCardProps) {
  const { data, isLoading: empLoading, error: empError, refetch } = useEmployee()
  const { data: entries = [], isLoading: entriesLoading } = useTodayEntries(data?.employee.id)
  const clock = useClockAction()
  const isOnline = useOnlineStatus()
  const [lastGps, setLastGps] = useState<ClockResult | null>(null)

  // ── Loading / Error gates ──────────────────────────────────

  if (empLoading || entriesLoading) return <LoadingState />
  if (empError) {
    return <ErrorState message={(empError as Error).message} onRetry={() => refetch()} />
  }

  // ── Derived state ──────────────────────────────────────────

  const nextAction = getNextAction(entries)
  const canOut = canClockOutDirectly(entries)
  const status = deriveStatus(nextAction, entries.length)
  const { worked_minutes } = computeWorkedTime(entries)

  // Buttons are disabled if: mutation pending, offline, or GPS blocks the location.
  const isDisabled = clock.isPending || !isOnline || gpsBlocked

  // ── Action handler ─────────────────────────────────────────

  async function handleClock(action: TimeEntryAction) {
    if (!data || isDisabled) return
    // Reset previous GPS result so stale data isn't shown during new attempt.
    setLastGps(null)
    try {
      const result = await clock.mutateAsync({
        employeeId: data.employee.id,
        companyId: data.company.id,
        action,
        company: data.company,
      })
      setLastGps(result)
    } catch {
      // Error surfaced via clock.isError below.
    }
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <Card>
      <CardContent className="pt-5 pb-5 space-y-4">

        {/* Status + worked time */}
        <div className="flex items-center justify-between">
          <Badge className={cn(STATUS_CLASS[status])}>{STATUS_LABEL[status]}</Badge>
          {worked_minutes > 0 && (
            <span className="text-sm tabular-nums text-muted-foreground">
              {formatHHMM(worked_minutes)} trabajados
            </span>
          )}
        </div>

        {/* Action buttons */}
        {status !== 'done' && nextAction && (
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              className="w-full"
              disabled={isDisabled}
              onClick={() => handleClock(nextAction)}
            >
              {clock.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Obteniendo GPS…</>
              ) : (
                ACTION_LABELS[nextAction]
              )}
            </Button>

            {canOut && nextAction !== 'clock_out' && (
              <Button
                variant="outline"
                className="w-full"
                disabled={isDisabled}
                onClick={() => handleClock('clock_out')}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {ACTION_LABELS.clock_out}
              </Button>
            )}
          </div>
        )}

        {/* Jornada completada */}
        {status === 'done' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
            Jornada registrada correctamente
          </div>
        )}

        {/* ── Feedback section ───────────────────────────── */}

        {/* Offline warning — highest priority */}
        {!isOnline && (
          <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            Sin conexión a internet. Conéctate para poder fichar.
          </div>
        )}

        {/* GPS out-of-radius warning (pre-emptive, from ClockPage live preview) */}
        {isOnline && gpsBlocked && (
          <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Estás fuera del radio de fichaje. Acércate al centro de trabajo.
          </div>
        )}

        {/* Success confirmation */}
        {clock.isSuccess && !clock.isPending && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            Fichaje registrado correctamente
          </div>
        )}

        {/* GPS result from last successful clock */}
        {lastGps && clock.isSuccess && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              {lastGps.distance_meters != null
                ? `${Math.round(lastGps.distance_meters)} m del centro de trabajo`
                : 'Posición registrada'}
            </div>
            {/* Low accuracy warning: GPS position is imprecise, not about distance */}
            {lastGps.accuracy != null && lastGps.accuracy > 50 && (
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Precisión GPS baja (±{Math.round(lastGps.accuracy)} m) — el fichaje se ha registrado
              </div>
            )}
          </div>
        )}

        {/* Mutation error */}
        {clock.isError && (
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{(clock.error as Error)?.message ?? 'Error al registrar el fichaje'}</span>
          </div>
        )}

      </CardContent>
    </Card>
  )
}
