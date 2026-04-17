// If VITE_API_URL is set (in Vercel), it uses that. Otherwise, defaults to /api for local dev.
const B = import.meta.env.VITE_API_URL || '/api'

/** Read stored token + user id and return auth headers for every request. */
function getAuthHeaders(): HeadersInit {
  try {
    const token   = localStorage.getItem('sa_token')
    const userStr = localStorage.getItem('sa_user')
    if (token && userStr) {
      const user = JSON.parse(userStr)
      return {
        'Authorization': `Bearer ${token}`,
        'X-User-ID': String(user.id),
      }
    }
  } catch { /* ignore */ }
  return {}
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const url = `${B}${path}`
  let r: Response
  try {
    r = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),   // ← attach token on every request
        ...opts.headers,
      },
      ...opts,
    })
  } catch (networkErr: any) {
    throw new Error(`Network error calling ${url}: ${networkErr.message}`)
  }

  // Try to parse as JSON; if it fails, show the raw response for debugging
  let d: any
  try {
    d = await r.json()
  } catch {
    const text = await r.text().catch(() => '(unreadable)')
    throw new Error(`Server returned non-JSON (status ${r.status}) from ${url}. Response: ${text.slice(0, 200)}`)
  }

  if (!r.ok) throw new Error((d as any).error || 'Request failed')
  return d as T
}

export const teacherLogin = (email: string, password: string) =>
  req<{ user: any; token: string }>('/teacher-login-json', { method:'POST', body:JSON.stringify({email,password}) })

export const studentLogin = (email: string, password: string) =>
  req<{ user: any; token: string }>('/student-login-json', { method:'POST', body:JSON.stringify({email,password}) })

export const startSession = (date: string, session_number: number, subject: string, semester: string) =>
  req<{ status: string }>('/start-session', { method:'POST', body:JSON.stringify({date,session_number,subject,semester}) })

export const stopSession = () =>
  req<{ status: string }>('/stop-session', { method:'POST' })

export const getCurrentToken = () =>
  req<{ session_id: string; token: string }>('/current-token')

export const getAttendanceCount = () =>
  req<{ marked: number; total: number; session: string }>('/attendance-count')

// subject+semester filters so each selection shows its own records
export const getAttendanceTable = (subject?: string, semester?: string) => {
  const params = new URLSearchParams()
  if (subject)  params.set('subject',  subject)
  if (semester) params.set('semester', semester)
  const qs = params.toString() ? '?' + params.toString() : ''
  return req<{ columns: string[]; rows: any[] }>(`/get-attendance-table${qs}`)
}

export const deleteAttendance = (student_id: number, date?: string, session_number?: number) =>
  req<{ status: string }>('/delete-attendance', { method:'DELETE', body:JSON.stringify({student_id,date,session_number}) })

export const deleteAttendanceSession = (date: string, session_number: number) =>
  req<{ status: string }>('/delete-attendance-session', { method:'DELETE', body:JSON.stringify({date,session_number}) })

export const markAttendance = (session_id: string, token: string) =>
  req<{ message: string }>('/mark-attendance', { method:'POST', body:JSON.stringify({session_id,token}) })

export const getMyAttendance = () =>
  req<{ columns: string[]; rows: any[] }>('/my-attendance')

export const exportUrl = (subject?: string, semester?: string) => {
  const p = new URLSearchParams()
  if (subject)  p.set('subject',  subject)
  if (semester) p.set('semester', semester)
  // Pass token + user_id as query params because <a href> doesn't send headers
  try {
    const token   = localStorage.getItem('sa_token')
    const userStr = localStorage.getItem('sa_user')
    if (token && userStr) {
      const user = JSON.parse(userStr)
      p.set('token',   token)
      p.set('user_id', String(user.id))
    }
  } catch { /* ignore */ }
  return `${B}/export-excel${p.toString() ? '?'+p.toString() : ''}`
}
