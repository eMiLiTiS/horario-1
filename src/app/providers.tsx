import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { queryClient } from '@/shared/lib/query-client'
import { useAuthInit } from '@/shared/hooks/use-auth'

function AuthInitializer({ children }: { children: React.ReactNode }) {
  useAuthInit()
  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        {children}
        <Toaster richColors position="top-right" />
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </AuthInitializer>
    </QueryClientProvider>
  )
}
