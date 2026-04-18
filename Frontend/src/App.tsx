import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Login            from '@/pages/Login'
import TeacherDashboard from '@/features/dashboards/TeacherDashboard'
import StudentDashboard from '@/features/dashboards/StudentDashboard'
import AdminDashboard   from '@/features/dashboards/AdminDashboard'
import ProtectedRoute   from '@/features/components/ProtectedRoute'

export default function App() {
  const { isLoading } = useAuth()

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    </div>
  )

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/teacher-dashboard"
        element={
          <ProtectedRoute role="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student-dashboard"
        element={
          <ProtectedRoute role="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}