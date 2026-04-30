import { useQuery } from '@tanstack/react-query'
import { formatInTimeZone } from 'date-fns-tz'
import { supabase } from '@/shared/lib/supabase'
import { TZ } from '@/shared/lib/time'
import type { TimeEntry } from '@/types/domain'

function todayStartISO(): string {
  const dateStr = formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd')
  const offset = formatInTimeZone(new Date(), TZ, 'xxx') // e.g. '+02:00'
  return `${dateStr}T00:00:00${offset}`
}

export function useTodayEntries(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['today-entries', employeeId],
    enabled: !!employeeId,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<TimeEntry[]> => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employeeId!)
        .gte('occurred_at', todayStartISO())
        .order('occurred_at', { ascending: true })

      if (error) throw new Error(error.message)
      return (data ?? []) as TimeEntry[]
    },
  })
}
