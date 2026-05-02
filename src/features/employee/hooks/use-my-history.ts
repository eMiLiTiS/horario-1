import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import type { TimeEntry } from '@/types/domain'

const HISTORY_DAYS = 30

export function useMyHistory(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['my-history', employeeId],
    enabled: !!employeeId,
    staleTime: 60_000,
    queryFn: async (): Promise<TimeEntry[]> => {
      const from = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', employeeId!)
        .gte('occurred_at', from)
        .order('occurred_at', { ascending: false })

      if (error) throw new Error(error.message)
      return (data ?? []) as TimeEntry[]
    },
  })
}
