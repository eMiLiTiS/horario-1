import { useState, useEffect } from 'react'

// Subscribes to browser online/offline events.
// The setState calls are inside event callbacks — NOT synchronous in the effect body —
// which is the standard "external store subscription" pattern React recommends.
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return online
}
