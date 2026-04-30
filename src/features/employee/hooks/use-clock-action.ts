import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { getCurrentPosition, getDeviceInfo, haversineMeters } from '@/shared/lib/geo'
import type { Company, TimeEntryAction } from '@/types/domain'

interface ClockParams {
  employeeId: string
  companyId: string
  action: TimeEntryAction
  company: Company
}

export interface ClockResult {
  gps_valid: boolean | null
  distance_meters: number | null
  accuracy: number | null
}

// Dev-only logger — stripped to a no-op in production builds by Vite.
function devLog(msg: string, data?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.log(`[ClockAction] ${msg}`, data ?? '')
  }
}

export function useClockAction() {
  const qc = useQueryClient()
  // Ref-level guard: prevents concurrent mutations even if caller ignores isPending.
  // React Query's isPending handles UI; this handles programmatic double-calls.
  const inflightRef = useRef(false)

  return useMutation({
    mutationFn: async ({ employeeId, companyId, action, company }: ClockParams): Promise<ClockResult> => {
      devLog('start', { action, employeeId })

      if (inflightRef.current) {
        devLog('blocked — already inflight', { action })
        throw new Error('Hay un fichaje en curso. Espera un momento.')
      }
      inflightRef.current = true

      try {
        let gps_lat: number | null = null
        let gps_lng: number | null = null
        let gps_accuracy: number | null = null
        let gps_valid: boolean | null = null
        let distance_meters: number | null = null

        const companyHasGps = company.gps_lat != null && company.gps_lng != null

        // ── GPS phase ────────────────────────────────────────────
        // getCurrentPosition always resolves or rejects within 5.5 s (see geo.ts).
        // If it rejects for ANY reason (denied, unavailable, timeout, browser hang),
        // the catch lets the clock proceed with null GPS fields.
        devLog('requesting GPS')
        try {
          const pos = await getCurrentPosition()
          gps_lat = pos.lat
          gps_lng = pos.lng
          gps_accuracy = pos.accuracy
          devLog('GPS success', { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy })

          if (companyHasGps) {
            distance_meters = haversineMeters(pos.lat, pos.lng, company.gps_lat!, company.gps_lng!)
            gps_valid = distance_meters <= company.gps_radius_meters
          } else {
            gps_valid = true
          }
        } catch (gpsError) {
          // GPS unavailable — allowed to clock with null fields.
          // Hard-block only fires when GPS IS obtained and gps_valid === false.
          devLog('GPS timeout/error', { message: (gpsError as Error).message })
        }

        // ── GPS radius enforcement ───────────────────────────────
        // gps_valid = null  → GPS not obtained → allow (user may have denied)
        // gps_valid = true  → inside radius (or no company GPS) → allow
        // gps_valid = false → outside radius → block
        if (gps_valid === false) {
          const dist = distance_meters != null ? Math.round(distance_meters) : '?'
          throw new Error(
            `Estás a ${dist} m del centro de trabajo (radio permitido: ${company.gps_radius_meters} m). Acércate para poder fichar.`,
          )
        }

        // ── Supabase insert ──────────────────────────────────────
        devLog('before insert', { action, employeeId, companyId, gps_valid, gps_accuracy })
        const { error } = await supabase.from('time_entries').insert({
          employee_id: employeeId,
          company_id: companyId,
          action,
          occurred_at: new Date().toISOString(),
          gps_lat,
          gps_lng,
          gps_accuracy,
          gps_valid,
          device_info: getDeviceInfo(),
          method: 'mobile',
        })

        if (error) {
          devLog('insert error', { message: error.message, code: error.code })
          throw new Error(error.message)
        }

        devLog('insert success', { action })
        return { gps_valid, distance_meters, accuracy: gps_accuracy }
      } finally {
        // Runs unconditionally: success, GPS block throw, insert error, or any
        // unexpected exception. Guarantees isPending resets and no double-fire lock.
        devLog('finally reset', { action })
        inflightRef.current = false
      }
    },
    onSuccess: (_, { employeeId }) => {
      qc.invalidateQueries({ queryKey: ['today-entries', employeeId] })
    },
  })
}
