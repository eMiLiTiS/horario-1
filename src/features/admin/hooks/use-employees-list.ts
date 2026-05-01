import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { useAuthStore } from '@/shared/stores/auth-store'
import type { Employee, ContractType } from '@/types/domain'

export function useEmployeesList() {
  return useQuery({
    queryKey: ['admin-employees'],
    staleTime: 60_000,
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('first_name', { ascending: true })

      if (error) throw new Error(error.message)
      return (data ?? []) as Employee[]
    },
  })
}

export interface CreateEmployeeInput {
  first_name: string
  last_name: string
  email: string
  hire_date: string
  position: string
  department: string
  contract_type: ContractType | null
  weekly_hours: number
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  const profile = useAuthStore((s) => s.profile)

  return useMutation({
    mutationFn: async (input: CreateEmployeeInput) => {
      if (!profile?.company_id) throw new Error('Tu perfil no tiene empresa asignada')

      const { error } = await supabase.from('employees').insert({
        company_id: profile.company_id,
        first_name: input.first_name.trim(),
        last_name: input.last_name.trim(),
        email: input.email.trim().toLowerCase() || null,
        hire_date: input.hire_date,
        position: input.position.trim() || null,
        department: input.department.trim() || null,
        contract_type: input.contract_type || null,
        weekly_hours: input.weekly_hours,
      })

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-employees'] })
    },
  })
}
