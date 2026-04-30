import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { useAuthStore } from '@/shared/stores/auth-store'
import type { Employee, Company } from '@/types/domain'

export interface EmployeeWithCompany {
  employee: Employee
  company: Company
}

export function useEmployee() {
  const profile = useAuthStore((s) => s.profile)

  return useQuery({
    queryKey: ['employee', profile?.id],
    enabled: !!profile?.id,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<EmployeeWithCompany> => {
      const { data: employee, error: empErr } = await supabase
        .from('employees')
        .select('*')
        .eq('profile_id', profile!.id)
        .single()

      if (empErr) throw new Error(empErr.message)

      const { data: company, error: compErr } = await supabase
        .from('companies')
        .select('*')
        .eq('id', employee.company_id)
        .single()

      if (compErr) throw new Error(compErr.message)

      return { employee: employee as Employee, company: company as Company }
    },
  })
}
