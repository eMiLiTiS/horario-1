import { useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useAuthStore } from '@/shared/stores/auth-store'
import type { Profile } from '@/types/domain'

// Seconds before we force-unlock the UI if Supabase never responds.
const AUTH_INIT_TIMEOUT_MS = 8_000

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error || !data) return null
  return data as Profile
}

export function useAuthInit() {
  const { setSession, setProfile, setLoading, reset } = useAuthStore()

  useEffect(() => {
    // Safety net: if getSession never resolves (stale SW, network issue, etc.)
    // we release the loading lock so the UI never freezes permanently.
    const timeout = setTimeout(() => {
      setLoading(false)
    }, AUTH_INIT_TIMEOUT_MS)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timeout)
      setSession(session)
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setProfile(profile)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setProfile(profile)
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

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
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
