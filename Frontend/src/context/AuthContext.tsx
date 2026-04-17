import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User } from '@/types'

interface Ctx {
  user: User | null
  token: string | null
  login: (u: User, t: string) => void
  logout: () => void
  isLoading: boolean
}

const AuthCtx = createContext<Ctx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]    = useState<User | null>(null)
  const [token,     setToken]   = useState<string | null>(null)
  const [isLoading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const u = localStorage.getItem('sa_user')
      const t = localStorage.getItem('sa_token')
      if (u && t) { setUser(JSON.parse(u)); setToken(t) }
    } catch { localStorage.removeItem('sa_user'); localStorage.removeItem('sa_token') }
    setLoading(false)
  }, [])

  const login = (u: User, t: string) => {
    setUser(u); setToken(t)
    localStorage.setItem('sa_user',  JSON.stringify(u))
    localStorage.setItem('sa_token', t)
  }

  const logout = () => {
    setUser(null); setToken(null)
    localStorage.removeItem('sa_user')
    localStorage.removeItem('sa_token')
  }

  return <AuthCtx.Provider value={{ user, token, login, logout, isLoading }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => {
  const c = useContext(AuthCtx)
  if (!c) throw new Error('useAuth outside AuthProvider')
  return c
}