import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { Role } from '@/types'
import type { ReactNode } from 'react'

const ROLE_DASH: Record<Role, string> = {
  teacher: '/teacher-dashboard',
  student: '/student-dashboard',
  admin:   '/admin-dashboard',
}

export default function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  if (user.role !== role)
    return <Navigate to={ROLE_DASH[user.role] ?? '/'} replace />
  return <>{children}</>
}