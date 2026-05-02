import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { signIn } from '@/shared/hooks/use-auth'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    if (import.meta.env.DEV) {
      console.log('[Login] onSubmit — calling signIn for', values.email)
    }

    setLoading(true)
    setError(null)

    try {
      await signIn(values.email, values.password)
      // Success path: supabase.auth.onAuthStateChange fires → RoleGuard redirects.
      if (import.meta.env.DEV) {
        console.log('[Login] signIn resolved — awaiting auth redirect')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al iniciar sesión'
      if (import.meta.env.DEV) {
        console.error('[Login] signIn error:', msg)
      }
      toast.error(msg)
      setError(msg)
    } finally {
      // Always unlock the button — never leave it frozen.
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Clock className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold tracking-tight">Horario</span>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Iniciar sesión</CardTitle>
            <CardDescription>Accede a tu cuenta de control horario</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@empresa.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              {/* Inline error — visible even if the toast is dismissed */}
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Empleado nuevo?{' '}
          <Link to="/signup" className="text-primary hover:underline">
            Crea tu cuenta
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Horario © {new Date().getFullYear()} — Control horario laboral
        </p>
      </div>
    </div>
  )
}
