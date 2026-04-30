import { es } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import { LoadingState, ErrorState } from '@/shared/components/ui/states'
import { formatTime } from '@/shared/lib/time'
import { TZ } from '@/shared/lib/time'
import { ACTION_LABELS } from '@/types/domain'
import { useEmployee } from '../hooks/use-employee'
import { useTodayEntries } from '../hooks/use-today-entries'
import { ClockCard } from '../components/clock-card'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 13) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export function EmployeeDashboardPage() {
  const { data, isLoading, error, refetch } = useEmployee()
  const { data: entries = [] } = useTodayEntries(data?.employee.id)

  if (isLoading) return <LoadingState fullPage />
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />

  const firstName = data?.employee.first_name || data?.employee.email?.split('@')[0] || 'Empleado'
  const dateLabel = formatInTimeZone(new Date(), TZ, "EEEE, d 'de' MMMM", { locale: es })

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground capitalize">{dateLabel}</p>
        <h1 className="text-2xl font-bold mt-0.5">
          {greeting()}, {firstName}
        </h1>
      </div>

      {/* Clock widget */}
      <ClockCard />

      {/* Today's entries */}
      {entries.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Fichajes de hoy
          </h2>
          <div className="divide-y rounded-xl border bg-card">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm">{ACTION_LABELS[e.action]}</span>
                <span className="text-sm tabular-nums text-muted-foreground font-mono">
                  {formatTime(e.occurred_at)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
