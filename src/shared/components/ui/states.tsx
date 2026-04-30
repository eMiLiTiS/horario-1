import { Spinner } from './spinner'
import { Button } from './button'

interface LoadingStateProps {
  message?: string
  fullPage?: boolean
}

export function LoadingState({ message = 'Cargando...', fullPage = false }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-muted-foreground ${fullPage ? 'min-h-screen' : 'min-h-40 w-full'}`}>
      <Spinner size="lg" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Algo salió mal',
  message = 'Ha ocurrido un error inesperado.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-40 w-full text-center px-4">
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-destructive">{title}</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-40 w-full text-center px-4 py-8">
      {icon && <div className="text-muted-foreground opacity-40">{icon}</div>}
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-foreground">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && action}
    </div>
  )
}
