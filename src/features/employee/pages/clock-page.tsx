import { useQuery } from '@tanstack/react-query'
import { MapPin, RefreshCw, AlertTriangle, WifiOff } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { Button } from '@/shared/components/ui/button'
import { LoadingState } from '@/shared/components/ui/states'
import { Spinner } from '@/shared/components/ui/spinner'
import { getCurrentPosition, haversineMeters } from '@/shared/lib/geo'
import type { Company } from '@/types/domain'
import { useEmployee } from '../hooks/use-employee'
import { ClockCard } from '../components/clock-card'

const GPS_LOW_ACCURACY_THRESHOLD_M = 50

// ──────────────────────────────────────────────────────────────
// Inner component — renders only after company is resolved.
// GPS state lives in React Query: no useEffect, no setState-in-effect.
// ──────────────────────────────────────────────────────────────
function ClockPageInner({ company }: { company: Company }) {
  const hasCompanyGps = company.gps_lat != null && company.gps_lng != null

  const {
    data: geoPos,
    isFetching: geoLoading,
    error: geoError,
    refetch: refreshGeo,
  } = useQuery({
    queryKey: ['geo-position', company.id],
    enabled: hasCompanyGps,
    queryFn: getCurrentPosition,
    staleTime: 0,
    gcTime: 30_000,
    retry: false,
  })

  const distance =
    geoPos && company.gps_lat != null && company.gps_lng != null
      ? haversineMeters(geoPos.lat, geoPos.lng, company.gps_lat, company.gps_lng)
      : null

  // null = GPS not yet obtained; true = inside radius; false = outside radius
  const geoValid = distance != null ? distance <= company.gps_radius_meters : null

  const lowAccuracy =
    geoPos != null && geoPos.accuracy > GPS_LOW_ACCURACY_THRESHOLD_M

  return (
    <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Fichar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{company.name}</p>
      </div>

      {/* GPS indicator — only when company has GPS configured */}
      {hasCompanyGps && (
        <div
          className={cn(
            'rounded-xl border p-4 space-y-3',
            geoValid === true &&
              'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30',
            geoValid === false &&
              'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
            geoValid === null && !geoError && 'border-border bg-card',
            geoError && 'border-destructive/30 bg-destructive/5',
          )}
        >
          {/* Header row: icon + summary + refresh */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {geoLoading ? (
                <Spinner size="sm" />
              ) : geoError ? (
                <WifiOff className="h-4 w-4 text-muted-foreground" />
              ) : geoValid === false ? (
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <MapPin
                  className={cn(
                    'h-4 w-4',
                    geoValid === true
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-muted-foreground',
                  )}
                />
              )}
              <span className="text-sm font-medium">
                {geoLoading && 'Obteniendo ubicación…'}
                {!geoLoading && geoError && 'GPS no disponible'}
                {!geoLoading && !geoError && distance != null && `${Math.round(distance)} m del centro`}
                {!geoLoading && !geoError && distance == null && geoPos && 'Ubicación obtenida'}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              disabled={geoLoading}
              onClick={() => void refreshGeo()}
              aria-label="Actualizar ubicación"
            >
              <RefreshCw className={cn('h-4 w-4', geoLoading && 'animate-spin')} />
            </Button>
          </div>

          {/* GPS unavailable detail */}
          {!geoLoading && geoError && (
            <p className="text-xs text-muted-foreground">{(geoError as Error).message}</p>
          )}

          {/* Coordinates + accuracy */}
          {!geoLoading && geoPos && (
            <div className="flex gap-4 text-xs text-muted-foreground tabular-nums">
              <span>Lat {geoPos.lat.toFixed(5)}</span>
              <span>Lng {geoPos.lng.toFixed(5)}</span>
              <span className={cn(lowAccuracy && 'text-amber-600 dark:text-amber-400 font-medium')}>
                ±{Math.round(geoPos.accuracy)} m
              </span>
            </div>
          )}

          {/* Low accuracy warning (device precision issue, not about distance) */}
          {!geoLoading && lowAccuracy && (
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              Precisión GPS baja (±{Math.round(geoPos!.accuracy)} m) — espera en exterior para mejorarla
            </div>
          )}

          {/* Outside radius — explains why clocking is blocked */}
          {!geoLoading && geoValid === false && (
            <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              Estás fuera del radio permitido ({company.gps_radius_meters} m). No podrás fichar
              hasta acercarte al centro de trabajo.
            </div>
          )}
        </div>
      )}

      {/* ClockCard: pass gpsBlocked so buttons disable before the user even tries */}
      <ClockCard gpsBlocked={geoValid === false} />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Public export — waits for company before rendering the inner page.
// ──────────────────────────────────────────────────────────────
export function ClockPage() {
  const { data, isLoading } = useEmployee()

  if (isLoading || !data) return <LoadingState fullPage />

  return <ClockPageInner company={data.company} />
}
