import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useLogin } from '@/features/auth/hooks/useAuth'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { routePaths } from '@/routes/routePaths'

// Mirrors the backend LoginRequest rules.
const loginSchema = z.object({
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const token = useAuthStore((s) => s.token)
  const login = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  if (token) {
    return <Navigate to={routePaths.dashboard} replace />
  }

  const onSubmit = (values: LoginForm) => {
    login.mutate({ ...values, device_name: 'web' })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img
            src="/logo-gracia.svg"
            alt="Gracia Pharmindo"
            className="mx-auto mb-2 h-14 w-14"
          />
          <CardTitle className="text-2xl">Absensi Gracia</CardTitle>
          <CardDescription>Masuk untuk melanjutkan ke aplikasi absensi</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="nama@sky.test" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending && <Spinner className="h-4 w-4" />}
              Masuk
            </Button>
          </form>

          <div className="mt-6 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Akun demo (password: password)</p>
            <p>hrd@sky.test · direktur@sky.test</p>
            <p>admin.teknologi-informasi@sky.test · karyawan1@sky.test</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
