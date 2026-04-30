import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Clock, ArrowLeft, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { resetPassword } from '@/shared/hooks/use-auth'

const schema = z.object({
  email: z.string().email('Email inválido'),
})

type FormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    try {
      await resetPassword(values.email)
      setSent(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al enviar el email'
      toast.error(msg)
    } finally {
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
            <CardTitle>Recuperar contraseña</CardTitle>
            <CardDescription>
              Te enviaremos un enlace para restablecer tu contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle className="h-10 w-10 text-success" />
                <p className="font-medium">Email enviado</p>
                <p className="text-sm text-muted-foreground">
                  Revisa tu bandeja de entrada y sigue las instrucciones del email.
                </p>
                <Link to="/login">
                  <Button variant="outline" size="sm" className="mt-2">
                    Volver al inicio
                  </Button>
                </Link>
              </div>
            ) : (
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
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Link to="/login" className="mt-4 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  )
}
