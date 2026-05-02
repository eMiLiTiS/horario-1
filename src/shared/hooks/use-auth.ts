import { useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useAuthStore } from '@/shared/stores/auth-store'
import type { Profile } from '@/types/domain'

const AUTH_INIT_TIMEOUT_MS = 8_000
const SIGN_IN_TIMEOUT_MS = 10_000

// Controlled dev-only logger — stripped in production by Vite tree-shaking.
function devLog(msg: string, ...args: unknown[]): void {
  if (import.meta.env.DEV) {
    console.log(`[Auth] ${msg}`, ...args)
  }
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error || !data) return null
  return data as Profile
}

/**
 * Removes any Supabase session token from localStorage whose access_token
 * has already expired.
 *
 * WHY: When an expired session exists in localStorage, Supabase's
 * autoRefreshToken tries to renew it before processing any new auth
 * operation. That refresh acquires the internal auth lock. If the refresh
 * request hangs (stale service worker, network issue), signInWithPassword
 * queues behind the held lock and never makes its HTTP request — the button
 * appears frozen with no Network activity.
 *
 * By removing the expired entry first, signInWithPassword finds no session
 * to refresh and proceeds immediately.
 */
function clearExpiredSupabaseSession(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (!key?.startsWith('sb-') || !key.endsWith('-auth-token')) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed: { expires_at?: number } = JSON.parse(raw)
      if (
        typeof parsed.expires_at === 'number' &&
        Date.now() / 1000 > parsed.expires_at
      ) {
        localStorage.removeItem(key)
        devLog('Cleared expired session from localStorage (lock-deadlock prevention):', key)
      }
    }
  } catch {
    // localStorage unavailable or JSON parse error — ignore.
  }
}

export function useAuthInit() {
  const { setSession, setProfile, setLoading, reset } = useAuthStore()

  useEffect(() => {
    // If onAuthStateChange never fires (stale SW, no network) release the
    // loading gate after AUTH_INIT_TIMEOUT_MS so the UI never freezes.
    const timeout = setTimeout(() => {
      devLog('Auth init timeout reached — releasing loading gate')
      setLoading(false)
    }, AUTH_INIT_TIMEOUT_MS)

    // Supabase v2: onAuthStateChange emits INITIAL_SESSION on first subscription.
    // We rely on this alone — no separate getSession() call — to avoid a second
    // competing lock acquisition during init that would further delay signIn.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      devLog('onAuthStateChange', event, session?.user?.id ?? 'no user')
      clearTimeout(timeout)
      setSession(session)
      if (session?.user) {
        try {
          const profile = await fetchProfile(session.user.id)
          setProfile(profile)
        } catch {
          // fetchProfile failed (RLS, network) — treat as unauthenticated.
          setProfile(null)
        }
      } else {
        reset()
      }
      setLoading(false)
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [setSession, setProfile, setLoading, reset])
}

export function useAuth() {
  return useAuthStore()
}

export async function signIn(email: string, password: string): Promise<void> {
  devLog('signIn called', { email })

  // Step 1: clear any expired cached session to unblock the Supabase auth lock.
  clearExpiredSupabaseSession()

  let timeoutId: ReturnType<typeof setTimeout> | null = null

  try {
    devLog('calling supabase.auth.signInWithPassword…')

    // Step 2: race the actual request against a hard timeout.
    // If the lock is still held after SIGN_IN_TIMEOUT_MS, reject with a
    // human-readable error instead of leaving the button frozen forever.
    const { error } = await Promise.race([
      supabase.auth.signInWithPassword({ email, password }),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () =>
            reject(
              new Error(
                'Tiempo de espera agotado. Recarga la página o abre en modo incógnito.',
              ),
            ),
          SIGN_IN_TIMEOUT_MS,
        )
      }),
    ])

    devLog('signInWithPassword resolved', { hasError: !!error })
    if (error) throw error
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId)
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}
