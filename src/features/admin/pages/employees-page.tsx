import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, UserCheck, UserX, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { LoadingState, ErrorState, EmptyState } from '@/shared/components/ui/states'
import { cn } from '@/shared/utils/cn'
import { useEmployeesList, useCreateEmployee } from '../hooks/use-employees-list'
import type { ContractType } from '@/types/domain'

const CONTRACT_LABELS: Record<ContractType, string> = {
  full_time: 'Completa',
  part_time: 'Parcial',
  temporal: 'Temporal',
}

const selectClass = cn(
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1',
  'text-sm shadow-sm transition-colors',
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
  'disabled:cursor-not-allowed disabled:opacity-50',
)

const createSchema = z.object({
  first_name: z.string().min(1, 'Obligatorio'),
  last_name: z.string().min(1, 'Obligatorio'),
  email: z.string().email('Email inválido'),
  hire_date: z.string().min(1, 'Obligatorio'),
  position: z.string(),
  department: z.string(),
  contract_type: z.string(),
  weekly_hours: z.number({ message: 'Número requerido' }).min(1, 'Mínimo 1 h').max(168),
})

type CreateFormValues = z.infer<typeof createSchema>

function CreateEmployeeForm({ onClose }: { onClose: () => void }) {
  const createEmployee = useCreateEmployee()
  const today = new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      weekly_hours: 40,
      hire_date: today,
      position: '',
      department: '',
      contract_type: '',
    },
  })

  async function onSubmit(values: CreateFormValues) {
    try {
      await createEmployee.mutateAsync({
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        hire_date: values.hire_date,
        position: values.position,
        department: values.department,
        contract_type: (values.contract_type || null) as ContractType | null,
        weekly_hours: values.weekly_hours,
      })
      toast.success('Empleado creado. Cuando se registre con este email, la cuenta se vinculará automáticamente.')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear empleado')
    }
  }

  return (
    <Card className="mb-6 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Nuevo empleado</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input placeholder="Ana" {...register('first_name')} />
              {errors.first_name && (
                <p className="text-xs text-destructive">{errors.first_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Apellido *</Label>
              <Input placeholder="García" {...register('last_name')} />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" placeholder="ana@empresa.com" {...register('email')} />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Debe coincidir con el email que use al registrarse
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Fecha de alta *</Label>
              <Input type="date" {...register('hire_date')} />
              {errors.hire_date && (
                <p className="text-xs text-destructive">{errors.hire_date.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Input placeholder="Dependiente" {...register('position')} />
            </div>

            <div className="space-y-1.5">
              <Label>Departamento</Label>
              <Input placeholder="Ventas" {...register('department')} />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de contrato</Label>
              <select className={selectClass} {...register('contract_type')}>
                <option value="">Sin especificar</option>
                <option value="full_time">Jornada completa</option>
                <option value="part_time">Media jornada</option>
                <option value="temporal">Temporal</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Horas semanales</Label>
              <Input type="number" min="1" max="168" step="0.5" {...register('weekly_hours', { valueAsNumber: true })} />
              {errors.weekly_hours && (
                <p className="text-xs text-destructive">{errors.weekly_hours.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={createEmployee.isPending}>
              {createEmployee.isPending ? 'Guardando...' : 'Crear empleado'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function EmployeesPage({ readOnly }: { readOnly?: boolean }) {
  const [showCreate, setShowCreate] = useState(false)
  const { data: employees = [], isLoading, error, refetch } = useEmployeesList()

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />

  const active = employees.filter((e) => e.is_active).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Empleados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {employees.length} en total · {active} activos
          </p>
        </div>
        {!readOnly && !showCreate && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo
          </Button>
        )}
      </div>

      {/* Inline create form */}
      {showCreate && !readOnly && (
        <CreateEmployeeForm onClose={() => setShowCreate(false)} />
      )}

      {/* Empty state */}
      {employees.length === 0 && !showCreate && (
        <EmptyState
          title="No hay empleados"
          description={
            readOnly
              ? 'No se han creado empleados todavía.'
              : 'Crea el primer empleado de tu empresa.'
          }
          action={
            !readOnly ? (
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1.5" />
                Nuevo empleado
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Employees list */}
      {employees.length > 0 && (
        <div className="rounded-xl border bg-card divide-y">
          {employees.map((emp) => {
            const hasAccount = emp.profile_id !== null

            return (
              <div key={emp.id} className="flex items-center gap-3 px-4 py-3">
                {/* Avatar */}
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0 select-none">
                  {emp.first_name[0]?.toUpperCase()}
                  {emp.last_name[0]?.toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {emp.first_name} {emp.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {emp.email ?? '—'}
                    {emp.position ? ` · ${emp.position}` : ''}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 shrink-0">
                  {emp.contract_type && (
                    <Badge variant="outline" className="text-xs hidden sm:flex">
                      {CONTRACT_LABELS[emp.contract_type]}
                    </Badge>
                  )}

                  {hasAccount ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <UserCheck className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Con cuenta</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <UserX className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Sin cuenta</span>
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info note */}
      {!readOnly && employees.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Los empleados deben registrarse en <strong>/signup</strong> con el mismo email para vincular su cuenta automáticamente.
        </p>
      )}
    </div>
  )
}
