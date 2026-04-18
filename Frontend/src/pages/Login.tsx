import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { teacherLogin, studentLogin, adminLogin } from '@/services/api'

type Tab  = 'student' | 'teacher'
type Mode = 'signin' | 'admin'

const CO_PO_URL = 'https://acadia-co-po-mapping-system.vercel.app/login'

export default function Login() {
  const { user, login } = useAuth()
  const navigate        = useNavigate()

  const [tab,     setTab]     = useState<Tab>('student')
  const [mode,    setMode]    = useState<Mode>('signin')
  const [email,   setEmail]   = useState('')
  const [pwd,     setPwd]     = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [remember,setRemember]= useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!user) return
    const dest = user.role === 'teacher' ? '/teacher-dashboard'
               : user.role === 'admin'   ? '/admin-dashboard'
               : '/student-dashboard'
    navigate(dest, { replace: true })
  }, [user, navigate])

  // Reset form when switching tabs or modes
  useEffect(() => { setError(''); setEmail(''); setPwd('') }, [tab, mode])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      if (mode === 'admin') {
        const res = await adminLogin(email, pwd)
        login(res.user, res.token)
        navigate('/admin-dashboard', { replace: true })
      } else {
        const res = tab === 'teacher'
          ? await teacherLogin(email, pwd)
          : await studentLogin(email, pwd)
        if (remember) localStorage.setItem(`sa_rem_${tab}`, email)
        else          localStorage.removeItem(`sa_rem_${tab}`)
        login(res.user, res.token)
        navigate(tab === 'teacher' ? '/teacher-dashboard' : '/student-dashboard', { replace: true })
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your credentials.')
    } finally { setLoading(false) }
  }

  const ACCENT = mode === 'admin' ? '#7C3AED'
               : tab  === 'teacher' ? '#2563EB'
               : '#0D9488'
  const ACCENT2 = mode === 'admin' ? '#6D28D9'
                : tab  === 'teacher' ? '#1D4ED8'
                : '#0F766E'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#0F172A 0%,#1E293B 50%,#0F172A 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px',
      position: 'relative', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    }}>

      {/* Background dots */}
      {Array.from({length:16}).map((_,i) => (
        <div key={i} style={{
          position:'absolute', borderRadius:'50%', background:'rgba(255,255,255,.06)',
          width:`${3+(i%3)*2}px`, height:`${3+(i%3)*2}px`,
          left:`${(i*53)%100}%`, top:`${(i*37)%100}%`, pointerEvents:'none',
        }}/>
      ))}

      {/* Card */}
      <div style={{
        width:'100%', maxWidth:'440px', position:'relative', zIndex:1,
        animation:'slideUp .5s cubic-bezier(.16,1,.3,1) forwards',
      }}>
        <style>{`
          @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
          @keyframes spin{to{transform:rotate(360deg)}}
          input:focus{outline:none!important}
        `}</style>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'28px' }}>
          <div style={{
            width:'64px', height:'64px', margin:'0 auto 14px',
            background:`linear-gradient(135deg,${ACCENT},${ACCENT2})`,
            borderRadius:'18px', display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:`0 8px 24px ${ACCENT}44`, transition:'background .3s,box-shadow .3s',
          }}>
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" fill="white"/>
            </svg>
          </div>
          <h1 style={{ fontSize:'26px', fontWeight:'800', color:'white', margin:'0 0 4px', letterSpacing:'-.5px' }}>
            Smart Attendance
          </h1>
          <p style={{ fontSize:'14px', color:'rgba(255,255,255,.5)', margin:0 }}>
            QR-based attendance management
          </p>
        </div>

        {/* White card */}
        <div style={{
          background:'white', borderRadius:'20px',
          boxShadow:'0 24px 64px rgba(0,0,0,.3)', overflow:'hidden',
        }}>

          {/* Mode selector: Sign In | Admin */}
          <div style={{ display:'flex', padding:'8px 8px 0', background:'#F8FAFC', gap:'4px' }}>
            <button onClick={() => setMode('signin')}
              style={{
                flex:1, padding:'11px', border:'none', borderRadius:'10px',
                fontSize:'14px', fontWeight:'600', cursor:'pointer', transition:'all .2s',
                background: mode === 'signin' ? 'white' : 'transparent',
                color: mode === 'signin' ? (tab === 'teacher' ? '#2563EB' : '#0D9488') : '#94A3B8',
                boxShadow: mode === 'signin' ? '0 1px 6px rgba(0,0,0,.1)' : 'none',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
              }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Sign In
            </button>
            <button onClick={() => setMode('admin')}
              style={{
                flex:1, padding:'11px', border:'none', borderRadius:'10px',
                fontSize:'14px', fontWeight:'600', cursor:'pointer', transition:'all .2s',
                background: mode === 'admin' ? 'white' : 'transparent',
                color: mode === 'admin' ? '#7C3AED' : '#94A3B8',
                boxShadow: mode === 'admin' ? '0 1px 6px rgba(0,0,0,.1)' : 'none',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
              }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              Admin
            </button>
          </div>

          {/* Sub-tabs for Sign In (Student / Teacher) */}
          {mode === 'signin' && (
            <div style={{ display:'flex', padding:'6px 8px 0', background:'#F8FAFC', gap:'4px' }}>
              {(['student','teacher'] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{
                    flex:1, padding:'9px', border:'none', borderRadius:'8px',
                    fontSize:'13px', fontWeight:'600', cursor:'pointer', transition:'all .2s',
                    background: tab === t ? (t === 'teacher' ? '#2563EB' : '#0D9488') : 'transparent',
                    color: tab === t ? 'white' : '#94A3B8',
                    boxShadow: tab === t ? `0 2px 8px ${t === 'teacher' ? '#2563EB' : '#0D9488'}44` : 'none',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:'6px',
                  }}>
                  {t === 'student'
                    ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998a12.078 12.078 0 01.665-6.479L12 14z"/></svg>
                    : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/></svg>
                  }
                  {t === 'student' ? 'Student' : 'Teacher'}
                </button>
              ))}
            </div>
          )}

          {/* Admin badge */}
          {mode === 'admin' && (
            <div style={{ padding:'10px 20px 0', background:'#F8FAFC' }}>
              <div style={{
                background:'linear-gradient(135deg,#EDE9FE,#DDD6FE)', border:'1px solid #C4B5FD',
                borderRadius:'8px', padding:'8px 14px', display:'flex', alignItems:'center', gap:'8px',
              }}>
                <span style={{ fontSize:'16px' }}>🔐</span>
                <span style={{ fontSize:'12px', color:'#5B21B6', fontWeight:'600' }}>Admin Access — Restricted</span>
              </div>
            </div>
          )}

          <form onSubmit={submit} style={{ padding:'20px 28px 0' }}>
            {error && (
              <div style={{
                background:'#FEF2F2', border:'1px solid #FECACA', color:'#DC2626',
                borderRadius:'10px', padding:'11px 14px', fontSize:'13px',
                marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px',
              }}>
                <span style={{ fontSize:'16px' }}>⚠</span> {error}
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom:'14px' }}>
              <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#475569', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'.06em' }}>
                {mode === 'admin' ? 'Admin Email' : tab === 'teacher' ? 'Email Address' : 'Registration Email'}
              </label>
              <div style={{ position:'relative' }}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth="1.5"
                  style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)' }}>
                  <path strokeLinecap="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
                </svg>
                <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={mode === 'admin' ? 'admin@college.com' : tab === 'teacher' ? 'teacher@college.com' : 'your@email.com'}
                  style={{ width:'100%', padding:'11px 13px 11px 38px', border:'1.5px solid #E2E8F0', borderRadius:'10px', fontSize:'14px', color:'#0F172A', background:'white', boxSizing:'border-box', transition:'border .2s' }}
                  onFocus={e => (e.target as HTMLInputElement).style.borderColor = ACCENT}
                  onBlur={e  => (e.target as HTMLInputElement).style.borderColor = '#E2E8F0'}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom:'16px' }}>
              <label style={{ display:'block', fontSize:'12px', fontWeight:'600', color:'#475569', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'.06em' }}>
                Password
              </label>
              <div style={{ position:'relative' }}>
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth="1.5"
                  style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"/>
                </svg>
                <input type={showPwd ? 'text' : 'password'} required value={pwd} onChange={e => setPwd(e.target.value)}
                  placeholder="••••••••"
                  style={{ width:'100%', padding:'11px 42px 11px 38px', border:'1.5px solid #E2E8F0', borderRadius:'10px', fontSize:'14px', color:'#0F172A', background:'white', boxSizing:'border-box', transition:'border .2s' }}
                  onFocus={e => (e.target as HTMLInputElement).style.borderColor = ACCENT}
                  onBlur={e  => (e.target as HTMLInputElement).style.borderColor = '#E2E8F0'}
                />
                <button type="button" onClick={() => setShowPwd(p => !p)}
                  style={{ position:'absolute', right:'13px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8', fontSize:'18px', lineHeight:1, padding:0 }}>
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Remember me (only for signin mode) */}
            {mode === 'signin' && (
              <div style={{ marginBottom:'18px' }}>
                <label style={{ display:'flex', alignItems:'center', gap:'7px', fontSize:'13px', color:'#64748B', cursor:'pointer' }}>
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                    style={{ width:'14px', height:'14px', accentColor:ACCENT }}/>
                  Remember me
                </label>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{
                width:'100%', padding:'13px', border:'none', borderRadius:'11px',
                background:`linear-gradient(135deg,${ACCENT},${ACCENT2})`,
                color:'white', fontSize:'15px', fontWeight:'700', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                boxShadow:`0 4px 16px ${ACCENT}44`, opacity: loading ? .75 : 1, transition:'opacity .2s',
                marginBottom:'20px',
              }}>
              {loading
                ? <><span style={{ width:'16px', height:'16px', border:'2px solid rgba(255,255,255,.4)', borderTopColor:'white', borderRadius:'50%', display:'inline-block', animation:'spin .6s linear infinite' }}/>Signing in…</>
                : mode === 'admin' ? '🔐 Sign in as Admin'
                : `Sign in as ${tab === 'teacher' ? 'Teacher' : 'Student'}`
              }
            </button>
          </form>

          {/* Footer hint inside card */}
          <div style={{ padding:'0 28px 20px', textAlign:'center' }}>
            <p style={{ fontSize:'12px', color:'#CBD5E1', margin:0 }}>
              {mode === 'admin'
                ? 'Admin credentials are managed by the system administrator.'
                : 'Your credentials are provided by your institution administrator.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign:'center', color:'rgba(255,255,255,.3)', fontSize:'12px', marginTop:'20px' }}>
          © {new Date().getFullYear()} Smart Attendance Management System
        </p>
      </div>

      {/* ── CO PO Attainment button — bottom right ── */}
      <a
        href={CO_PO_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '11px 18px',
          background: 'linear-gradient(135deg,#7C3AED,#6D28D9)',
          color: 'white',
          borderRadius: '50px',
          fontSize: '13px',
          fontWeight: '700',
          textDecoration: 'none',
          boxShadow: '0 4px 20px rgba(124,58,237,.5)',
          transition: 'all .2s',
          zIndex: 100,
          letterSpacing: '.01em',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLAnchorElement
          el.style.transform = 'translateY(-2px)'
          el.style.boxShadow = '0 8px 28px rgba(124,58,237,.6)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLAnchorElement
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = '0 4px 20px rgba(124,58,237,.5)'
        }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2" style={{ flexShrink:0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
        </svg>
        CO PO Attainment
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,.7)" strokeWidth="2.5" style={{ flexShrink:0 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"/>
        </svg>
      </a>
    </div>
  )
}