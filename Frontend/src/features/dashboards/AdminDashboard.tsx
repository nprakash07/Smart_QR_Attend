import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  adminGetTeachers, adminCreateTeacher, adminDeleteTeacher,
  adminGetStudents, adminCreateStudent, adminDeleteStudent,
} from '@/services/api'

type Teacher = { id: number; email: string }
type Student  = { id: number; name: string; email: string; reg_no: string }
type Tab = 'teachers' | 'students'

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate          = useNavigate()

  const [tab,      setTab]      = useState<Tab>('teachers')
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState<{ text: string; ok: boolean } | null>(null)

  // ── Teacher form ───────────────────────────────────────────
  const [tEmail, setTEmail] = useState('')
  const [tPwd,   setTPwd]   = useState('')
  const [tErr,   setTErr]   = useState('')

  // ── Student form ───────────────────────────────────────────
  const [sName,  setSName]  = useState('')
  const [sEmail, setSEmail] = useState('')
  const [sReg,   setSReg]   = useState('')
  const [sPwd,   setSPwd]   = useState('')
  const [sErr,   setSErr]   = useState('')

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 3500)
  }

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [t, s] = await Promise.all([adminGetTeachers(), adminGetStudents()])
      setTeachers(t); setStudents(s)
    } catch (e: any) { flash(e.message || 'Failed to load data', false) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/', { replace: true }); return }
    loadAll()
  }, [user, navigate, loadAll])

  const handleLogout = () => { logout(); navigate('/', { replace: true }) }

  // ── Create teacher ─────────────────────────────────────────
  const submitTeacher = async (e: React.FormEvent) => {
    e.preventDefault(); setTErr('')
    if (!tEmail || !tPwd) { setTErr('Email and password are required'); return }
    try {
      await adminCreateTeacher(tEmail.trim(), tPwd)
      setTEmail(''); setTPwd('')
      flash('Teacher account created ✅')
      loadAll()
    } catch (e: any) { setTErr(e.message || 'Failed') }
  }

  // ── Create student ─────────────────────────────────────────
  const submitStudent = async (e: React.FormEvent) => {
    e.preventDefault(); setSErr('')
    if (!sName || !sEmail || !sReg || !sPwd) { setSErr('All fields are required'); return }
    try {
      await adminCreateStudent(sName.trim(), sEmail.trim(), sReg.trim(), sPwd)
      setSName(''); setSEmail(''); setSReg(''); setSPwd('')
      flash('Student account created ✅')
      loadAll()
    } catch (e: any) { setSErr(e.message || 'Failed') }
  }

  const deleteTeacher = async (id: number, email: string) => {
    if (!confirm(`Delete teacher "${email}"? This cannot be undone.`)) return
    try { await adminDeleteTeacher(id); flash('Teacher deleted'); loadAll() }
    catch (e: any) { flash(e.message || 'Delete failed', false) }
  }

  const deleteStudent = async (id: number, name: string) => {
    if (!confirm(`Delete student "${name}"? All their attendance records will also be deleted.`)) return
    try { await adminDeleteStudent(id); flash('Student deleted'); loadAll() }
    catch (e: any) { flash(e.message || 'Delete failed', false) }
  }

  const BLUE = '#2563EB'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#0F172A 0%,#1E293B 60%,#0F172A 100%)',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      color: 'white',
    }}>
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .admin-input{width:100%;padding:10px 13px;border:1.5px solid #334155;border-radius:9px;
          font-size:14px;color:white;background:#1E293B;box-sizing:border-box;outline:none;transition:border .2s}
        .admin-input:focus{border-color:${BLUE}}
        .admin-input::placeholder{color:#475569}
        .del-btn{background:none;border:none;cursor:pointer;color:#94A3B8;padding:5px;border-radius:6px;
          transition:all .15s;display:flex;align-items:center;justify-content:center}
        .del-btn:hover{background:#FEF2F2;color:#DC2626}
        .tab-btn{flex:1;padding:11px;border:none;border-radius:10px;font-size:14px;font-weight:600;
          cursor:pointer;transition:all .2s}
        .row-item{display:flex;align-items:center;justify-content:space-between;padding:11px 14px;
          border-radius:10px;background:#1E293B;border:1px solid #334155;animation:fadeIn .3s}
        .row-item:hover{border-color:#475569}
      `}</style>

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'16px 28px', background:'rgba(15,23,42,.9)',
        borderBottom:'1px solid rgba(255,255,255,.07)', backdropFilter:'blur(12px)',
        position:'sticky', top:0, zIndex:50,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{
            width:'38px', height:'38px', borderRadius:'10px',
            background:`linear-gradient(135deg,${BLUE},#1D4ED8)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:`0 4px 14px ${BLUE}44`,
          }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <div>
            <h1 style={{ margin:0, fontSize:'17px', fontWeight:'800', letterSpacing:'-.3px' }}>Admin Panel</h1>
            <p style={{ margin:0, fontSize:'12px', color:'#64748B' }}>Smart Attendance Management</p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <span style={{ fontSize:'13px', color:'#64748B' }}>Logged in as <strong style={{ color:'#94A3B8' }}>{user?.email}</strong></span>
          <button onClick={handleLogout} style={{
            padding:'8px 16px', border:'1px solid #334155', borderRadius:'8px',
            background:'transparent', color:'#94A3B8', fontSize:'13px', fontWeight:'600',
            cursor:'pointer', transition:'all .2s',
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='#1E293B'; (e.currentTarget as HTMLButtonElement).style.color='white' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='transparent'; (e.currentTarget as HTMLButtonElement).style.color='#94A3B8' }}
          >Sign Out</button>
        </div>
      </div>

      {/* ── Flash ───────────────────────────────────────────── */}
      {msg && (
        <div style={{
          position:'fixed', top:'72px', left:'50%', transform:'translateX(-50%)',
          background: msg.ok ? '#022C22' : '#450A0A',
          border: `1px solid ${msg.ok ? '#166534' : '#7F1D1D'}`,
          color: msg.ok ? '#4ADE80' : '#FCA5A5',
          padding:'11px 20px', borderRadius:'10px', fontSize:'14px', fontWeight:'600',
          zIndex:200, animation:'fadeIn .3s', boxShadow:'0 8px 24px rgba(0,0,0,.4)',
          whiteSpace:'nowrap',
        }}>{msg.text}</div>
      )}

      <div style={{ maxWidth:'960px', margin:'0 auto', padding:'32px 24px' }}>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'28px' }}>
          {[
            { label:'Total Teachers', count: teachers.length, color: BLUE, icon:'👨‍🏫' },
            { label:'Total Students', count: students.length, color:'#0D9488', icon:'🎓' },
          ].map(card => (
            <div key={card.label} style={{
              background:`linear-gradient(135deg,${card.color}22,${card.color}11)`,
              border:`1px solid ${card.color}44`, borderRadius:'14px', padding:'20px 24px',
              display:'flex', alignItems:'center', gap:'16px',
            }}>
              <span style={{ fontSize:'32px' }}>{card.icon}</span>
              <div>
                <div style={{ fontSize:'28px', fontWeight:'800', color:'white' }}>{card.count}</div>
                <div style={{ fontSize:'13px', color:'#94A3B8' }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'6px', background:'#0F172A', padding:'6px', borderRadius:'12px', marginBottom:'24px' }}>
          {(['teachers','students'] as Tab[]).map(t => (
            <button key={t} className="tab-btn" onClick={() => setTab(t)} style={{
              background: tab === t ? (t === 'teachers' ? BLUE : '#0D9488') : 'transparent',
              color: tab === t ? 'white' : '#64748B',
              boxShadow: tab === t ? `0 2px 10px ${t === 'teachers' ? BLUE : '#0D9488'}44` : 'none',
            }}>
              {t === 'teachers' ? '👨‍🏫 Teachers' : '🎓 Students'}
            </button>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px', alignItems:'start' }}>

          {/* ── List column ────────────────────────────────── */}
          <div style={{ background:'#0F172A', border:'1px solid #1E293B', borderRadius:'16px', overflow:'hidden' }}>
            <div style={{ padding:'18px 20px', borderBottom:'1px solid #1E293B', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h2 style={{ margin:0, fontSize:'15px', fontWeight:'700' }}>
                {tab === 'teachers' ? `Teachers (${teachers.length})` : `Students (${students.length})`}
              </h2>
              {loading && <div style={{ width:'16px', height:'16px', border:'2px solid #334155', borderTopColor:BLUE, borderRadius:'50%', animation:'spin .6s linear infinite' }}/>}
            </div>
            <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:'8px', maxHeight:'480px', overflowY:'auto' }}>
              {tab === 'teachers'
                ? teachers.length === 0
                  ? <p style={{ color:'#475569', textAlign:'center', margin:'24px 0', fontSize:'14px' }}>No teachers yet</p>
                  : teachers.map(t => (
                    <div key={t.id} className="row-item">
                      <div>
                        <div style={{ fontSize:'13px', fontWeight:'600', color:'white' }}>{t.email}</div>
                        <div style={{ fontSize:'11px', color:'#475569', marginTop:'2px' }}>ID: {t.id}</div>
                      </div>
                      <button className="del-btn" onClick={() => deleteTeacher(t.id, t.email)} title="Delete teacher">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                : students.length === 0
                  ? <p style={{ color:'#475569', textAlign:'center', margin:'24px 0', fontSize:'14px' }}>No students yet</p>
                  : students.map(s => (
                    <div key={s.id} className="row-item">
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'13px', fontWeight:'600', color:'white', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.name}</div>
                        <div style={{ fontSize:'11px', color:'#64748B', marginTop:'1px' }}>{s.reg_no} · {s.email}</div>
                      </div>
                      <button className="del-btn" onClick={() => deleteStudent(s.id, s.name)} title="Delete student">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
              }
            </div>
          </div>

          {/* ── Create form column ──────────────────────────── */}
          <div style={{ background:'#0F172A', border:'1px solid #1E293B', borderRadius:'16px', overflow:'hidden' }}>
            <div style={{ padding:'18px 20px', borderBottom:'1px solid #1E293B' }}>
              <h2 style={{ margin:0, fontSize:'15px', fontWeight:'700' }}>
                {tab === 'teachers' ? '➕ Add New Teacher' : '➕ Add New Student'}
              </h2>
            </div>
            <div style={{ padding:'20px' }}>
              {tab === 'teachers' ? (
                <form onSubmit={submitTeacher} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                  {tErr && <div style={{ background:'#450A0A', border:'1px solid #7F1D1D', color:'#FCA5A5', borderRadius:'8px', padding:'10px 13px', fontSize:'13px' }}>{tErr}</div>}
                  <div>
                    <label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:'#64748B', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'.06em' }}>Email Address</label>
                    <input className="admin-input" type="email" required placeholder="teacher@college.com"
                      value={tEmail} onChange={e => setTEmail(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:'#64748B', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'.06em' }}>Password</label>
                    <input className="admin-input" type="text" required placeholder="Set a password"
                      value={tPwd} onChange={e => setTPwd(e.target.value)} />
                  </div>
                  <button type="submit" style={{
                    padding:'12px', border:'none', borderRadius:'10px',
                    background:`linear-gradient(135deg,${BLUE},#1D4ED8)`,
                    color:'white', fontSize:'14px', fontWeight:'700', cursor:'pointer',
                    boxShadow:`0 4px 16px ${BLUE}44`, transition:'opacity .2s',
                  }}>Create Teacher Account</button>
                </form>
              ) : (
                <form onSubmit={submitStudent} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                  {sErr && <div style={{ background:'#450A0A', border:'1px solid #7F1D1D', color:'#FCA5A5', borderRadius:'8px', padding:'10px 13px', fontSize:'13px' }}>{sErr}</div>}
                  <div>
                    <label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:'#64748B', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'.06em' }}>Full Name</label>
                    <input className="admin-input" type="text" required placeholder="Student Full Name"
                      value={sName} onChange={e => setSName(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:'#64748B', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'.06em' }}>Registration Email</label>
                    <input className="admin-input" type="email" required placeholder="2301109011@college.com"
                      value={sEmail} onChange={e => setSEmail(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:'#64748B', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'.06em' }}>Registration No.</label>
                    <input className="admin-input" type="text" required placeholder="2301109011"
                      value={sReg} onChange={e => setSReg(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:'11px', fontWeight:'600', color:'#64748B', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'.06em' }}>Password</label>
                    <input className="admin-input" type="text" required placeholder="Set a password"
                      value={sPwd} onChange={e => setSPwd(e.target.value)} />
                  </div>
                  <button type="submit" style={{
                    padding:'12px', border:'none', borderRadius:'10px',
                    background:'linear-gradient(135deg,#0D9488,#0F766E)',
                    color:'white', fontSize:'14px', fontWeight:'700', cursor:'pointer',
                    boxShadow:'0 4px 16px rgba(13,148,136,.4)', transition:'opacity .2s',
                  }}>Create Student Account</button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
