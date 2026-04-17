import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { Role } from '@/types'
import type { ReactNode } from 'react'

export default function ProtectedRoute({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  if (user.role !== role)
    return <Navigate to={user.role === 'teacher' ? '/teacher-dashboard' : '/student-dashboard'} replace />
  return <>{children}</>
}