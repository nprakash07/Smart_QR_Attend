import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  getAttendanceTable, startSession, stopSession,
  getCurrentToken, getAttendanceCount,
  deleteAttendanceSession, exportUrl,
} from '@/services/api'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import QRCode from 'qrcode'

// ── Semester / Subject data ───────────────────────────────────
const SEMESTERS: Record<string,string[]> = {
  'Semester 1': ['Mathematics I','Physics I','English','Programming Fundamentals'],
  'Semester 2': ['Mathematics II','Physics II','Data Structures','Digital Electronics'],
  'Semester 3': ['Algorithms','Database Systems','Operating Systems','Computer Networks'],
  'Semester 4': ['Software Engineering','Machine Learning','Web Technologies','Compiler Design'],
}
const CLASSES = [
  { label:'Computer Science 101', code:'CS101', students:25, type:'Programming' },
  { label:'Data Structures',      code:'DS101', students:30, type:'Core'        },
  { label:'Mathematics',          code:'MATH',  students:28, type:'Foundation'  },
]
const todayStr = () => new Date().toISOString().split('T')[0]
type Tab = 'dashboard'|'attendance'|'online'|'assignments'|'quizzes'|'reports'

// ── Theme ─────────────────────────────────────────────────────
type Theme = { bg:string; surface:string; card:string; border:string; text:string; muted:string; subtle:string }

const LIGHT: Theme = {
  bg:'#F8FAFC', surface:'#FFFFFF', card:'#FFFFFF',
  border:'#E2E8F0', text:'#0F172A', muted:'#64748B', subtle:'#F1F5F9',
}
const DARK: Theme = {
  bg:'#0F172A', surface:'#1E293B', card:'#1E293B',
  border:'#334155', text:'#F1F5F9', muted:'#94A3B8', subtle:'#0F172A',
}

const TABS: {id:Tab;label:string;icon:string}[] = [
  {id:'dashboard',   label:'Dashboard',    icon:'📊'},
  {id:'attendance',  label:'Attendance',   icon:'✅'},
  {id:'online',      label:'Online Class', icon:'🎥'},
  {id:'assignments', label:'Assignments',  icon:'📝'},
  {id:'quizzes',     label:'Quizzes',      icon:'❓'},
  {id:'reports',     label:'Reports',      icon:'📋'},
]

export default function TeacherDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [dark,     setDark]     = useState(() => localStorage.getItem('sa_dark')==='1')
  const [tab,      setTab]      = useState<Tab>('dashboard')
  const [semester, setSemester] = useState(Object.keys(SEMESTERS)[0])
  const [subject,  setSubject]  = useState(SEMESTERS[Object.keys(SEMESTERS)[0]][0])
  const [selClass, setSelClass] = useState(CLASSES[0].label)
  const [table,    setTable]    = useState<{columns:string[];rows:any[]}>({columns:[],rows:[]})
  const [active,   setActive]   = useState(false)
  const [date,     setDate]     = useState(todayStr())
  const [sessN,    setSessN]    = useState(1)
  const [starting, setStarting] = useState(false)
  const [count,    setCount]    = useState({marked:0,total:0})
  const [tokenStr, setTokenStr] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const T = dark ? DARK : LIGHT
  const ACCENT = '#2563EB'

  useEffect(() => {
    localStorage.setItem('sa_dark', dark ? '1' : '0')
    document.body.style.background = T.bg
  }, [dark])

  useEffect(() => { setSubject(SEMESTERS[semester][0]) }, [semester])

  const loadTable = useCallback(async () => {
    try { const d = await getAttendanceTable(subject, semester); setTable(d) } catch {}
  }, [subject, semester])

  // reload table whenever subject or semester changes
  useEffect(() => { loadTable() }, [loadTable])

  const drawQR = useCallback(async () => {
    try {
      const d = await getCurrentToken()
      if (canvasRef.current && d.session_id && d.token) {
        await QRCode.toCanvas(canvasRef.current, JSON.stringify(d), {
          width:200, margin:2, color:{ dark:dark?'#F1F5F9':'#0F172A', light:dark?'#1E293B':'#FFFFFF' }
        })
        setTokenStr(d.token.slice(0,10)+'…')
      }
    } catch {}
  }, [dark])

  const fetchCount = useCallback(async () => {
    try { const d = await getAttendanceCount(); setCount({marked:d.marked,total:d.total}) } catch {}
  }, [])

  useEffect(() => {
    if (!active) return
    drawQR(); fetchCount()
    const qi=setInterval(drawQR,15000); const ci=setInterval(fetchCount,3000)
    return () => { clearInterval(qi); clearInterval(ci) }
  }, [active, drawQR, fetchCount])

  const handleStart = async () => {
    if (!date) { alert('Select a date'); return }
    setStarting(true)
    try { await startSession(date, sessN, subject, semester); setActive(true) }
    catch (e:any) { alert(e.message) }
    finally { setStarting(false) }
  }

  const handleStop = async () => {
    try { await stopSession() } finally { setActive(false); loadTable() }
  }

  const totalStudents = table.rows.length
  const totalCols     = table.columns.length
  const totalPresent  = table.rows.reduce((a:number,r:any)=>a+table.columns.filter((c:string)=>r[c]==='P').length,0)
  const avgPct = totalStudents&&totalCols ? Math.round(totalPresent/(totalStudents*totalCols)*100) : 0

  const chartData = table.columns.map((col:string) => {
    const [d,s]=col.split('_'); const pres=table.rows.filter((r:any)=>r[col]==='P').length
    return { name:`${d} ${s}`, pct:totalStudents?Math.round(pres/totalStudents*100):0 }
  })
  const perStudent = table.rows.map((r:any)=>{
    const pres=table.columns.filter((c:string)=>r[c]==='P').length
    const abs =table.columns.filter((c:string)=>r[c]==='A').length
    const pct =totalCols?Math.round(pres/totalCols*100):0
    return {...r,pres,abs,pct}
  })

  // ── Reusable style helpers ──────────────────────────────────
  const card: React.CSSProperties = {
    background:T.card, border:`1px solid ${T.border}`,
    borderRadius:'14px', padding:'20px',
    transition:'background .3s,border .3s',
  }
  const inp: React.CSSProperties = {
    width:'100%', padding:'9px 12px',
    border:`1.5px solid ${T.border}`, borderRadius:'8px',
    fontSize:'14px', outline:'none',
    background:T.surface, color:T.text,
    transition:'all .2s', boxSizing:'border-box',
  }
  const sel = { ...inp, cursor:'pointer', appearance:'none' as const, paddingRight:'28px' }
  const lbl: React.CSSProperties = {
    display:'block', fontSize:'11px', fontWeight:'600',
    color:T.muted, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'5px',
  }
  const pill = (label:string, color:string, bg:string) => (
    <span style={{ fontSize:'11px', fontWeight:'700', color, background:bg,
      padding:'3px 10px', borderRadius:'20px', whiteSpace:'nowrap' }}>{label}</span>
  )

  return (
    <div style={{ minHeight:'100vh', background:T.bg, color:T.text,
      fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      transition:'background .3s,color .3s' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse2{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .hover-lift:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.12)}
        .row-hover:hover td{background:${dark?'rgba(255,255,255,.04)':'rgba(37,99,235,.03)'}!important}
        select option{background:${T.surface};color:${T.text}}
      `}</style>

      {/* ══ HEADER ══ */}
      <header style={{ background:T.surface, borderBottom:`1px solid ${T.border}`,
        height:'60px', display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 28px', position:'sticky', top:0, zIndex:30,
        boxShadow:dark?'0 1px 0 #334155':'0 1px 4px rgba(0,0,0,.06)',
        transition:'background .3s,border .3s' }}>

        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:'38px', height:'38px', borderRadius:'10px',
            background:'linear-gradient(135deg,#2563EB,#1D4ED8)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 12px rgba(37,99,235,.4)' }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" fill="white"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize:'15px', fontWeight:'700', color:T.text, margin:0 }}>Smart Attendance</p>
            <span style={{ fontSize:'10px', fontWeight:'700',
              background:'linear-gradient(135deg,#2563EB,#1D4ED8)',
              color:'white', borderRadius:'4px', padding:'1px 8px' }}>Teacher</span>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          {/* Dark mode toggle */}
          <button onClick={() => setDark(d=>!d)}
            style={{ width:'44px', height:'24px', borderRadius:'12px', border:'none',
              background:dark?'#2563EB':'#CBD5E1', cursor:'pointer', position:'relative',
              transition:'background .3s', flexShrink:0 }}>
            <span style={{ position:'absolute', top:'3px',
              left:dark?'23px':'3px', width:'18px', height:'18px',
              borderRadius:'50%', background:'white', transition:'left .2s',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px' }}>
              {dark?'🌙':'☀️'}
            </span>
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'50%',
              background:dark?'#1E3A5F':'#EFF6FF',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke={ACCENT} strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
              </svg>
            </div>
            <span style={{ fontSize:'14px', fontWeight:'600', color:T.text }}>{user?.name || 'Teacher'}</span>
          </div>

          <button onClick={() => { logout(); navigate('/') }}
            style={{ display:'flex', alignItems:'center', gap:'6px',
              border:`1.5px solid ${dark?'#4B1818':'#FECACA'}`,
              color:'#EF4444', background:'transparent',
              borderRadius:'8px', padding:'7px 14px',
              fontSize:'13px', fontWeight:'600', cursor:'pointer', transition:'all .2s' }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=dark?'rgba(239,68,68,.1)':'#FEF2F2'}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/>
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* ══ PAGE HEADER + CLASS SELECTOR + TABS ══ */}
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:'20px 28px 0', transition:'background .3s,border .3s' }}>
        <h1 style={{ fontSize:'22px', fontWeight:'800', color:T.text, margin:'0 0 2px' }}>Teacher Dashboard</h1>
        <p style={{ fontSize:'14px', color:T.muted, margin:'0 0 18px' }}>Manage classes, attendance, and assessments</p>

        {/* Class selector */}
        <div style={{ ...card, marginBottom:'16px', display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:'14px' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
            <label style={lbl}>Select Class</label>
            <div style={{ position:'relative', width:'220px' }}>
              <select value={selClass} onChange={e=>setSelClass(e.target.value)} style={sel}>
                {CLASSES.map(c=><option key={c.code}>{c.label}</option>)}
              </select>
              <span style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:T.muted }}>▾</span>
            </div>
          </div>
          {(() => { const cls=CLASSES.find(c=>c.label===selClass)||CLASSES[0]; return (
            <div style={{ display:'flex', gap:'20px', fontSize:'14px', color:T.muted, flexWrap:'wrap', alignItems:'center' }}>
              <span>📖 {cls.type}</span>
              <span>👥 {cls.students} students</span>
              <span>Code: <code style={{ background:T.subtle, padding:'2px 8px', borderRadius:'6px', fontWeight:'700', color:T.text, fontSize:'12px' }}>{cls.code}</code></span>
            </div>
          )})()}
          <button style={{ display:'flex', alignItems:'center', gap:'6px', border:`1.5px solid ${T.border}`, borderRadius:'8px', padding:'9px 18px', background:'transparent', fontSize:'14px', fontWeight:'600', color:T.text, cursor:'pointer', transition:'all .2s' }}>
            ⊕ Create Class
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'2px', overflowX:'auto' }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'12px 18px',
                border:'none', background:'none', fontSize:'14px', cursor:'pointer',
                whiteSpace:'nowrap', transition:'all .15s', borderBottom:'3px solid transparent',
                fontWeight:tab===t.id?'700':'500',
                color:tab===t.id?ACCENT:T.muted,
                borderBottomColor:tab===t.id?ACCENT:'transparent',
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px 28px', maxWidth:'1280px', margin:'0 auto' }}>

        {/* ══════════ DASHBOARD ══════════ */}
        {tab==='dashboard' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'20px', animation:'fadeUp .35s ease' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'16px' }}>
              {[
                { label:'Class Attendance', value:`${avgPct}%`,      icon:'👥', grad:'linear-gradient(135deg,#2563EB,#1D4ED8)' },
                { label:'Quiz Average',     value:'76%',              icon:'📈', grad:'linear-gradient(135deg,#7C3AED,#6D28D9)' },
                { label:'Total Students',   value:totalStudents||30,  icon:'👨‍🎓', grad:'linear-gradient(135deg,#059669,#047857)' },
                { label:'Active Students',  value:Math.round((totalStudents||30)*.93), icon:'✅', grad:'linear-gradient(135deg,#0891B2,#0E7490)' },
              ].map(s=>(
                <div key={s.label} className="hover-lift" style={{ ...card, display:'flex', alignItems:'center', gap:'16px', cursor:'default', transition:'all .25s' }}>
                  <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:s.grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0, boxShadow:'0 4px 12px rgba(0,0,0,.2)' }}>{s.icon}</div>
                  <div>
                    <p style={{ fontSize:'12px', color:T.muted, margin:'0 0 4px', fontWeight:'500', textTransform:'uppercase', letterSpacing:'.05em' }}>{s.label}</p>
                    <p style={{ fontSize:'28px', fontWeight:'800', color:T.text, margin:0, lineHeight:1 }}>{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
              {/* Top Performers */}
              <div style={card}>
                <h3 style={{ fontSize:'15px', fontWeight:'700', color:T.text, margin:'0 0 16px', display:'flex', alignItems:'center', gap:'6px' }}>
                  <span style={{ color:'#059669', fontSize:'18px' }}>↗</span> Top Performers
                </h3>
                {(perStudent.length>0?perStudent.sort((a:any,b:any)=>b.pct-a.pct).slice(0,4):
                  [{name:'Alice Johnson',pct:95},{name:'Bob Smith',pct:92},{name:'Carol White',pct:90}]
                ).map((r:any,i:number)=>(
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${T.border}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:i===0?'linear-gradient(135deg,#F59E0B,#D97706)':i===1?'linear-gradient(135deg,#94A3B8,#64748B)':'linear-gradient(135deg,#C0A060,#A08050)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'800', color:'white' }}>{i+1}</div>
                      <span style={{ fontSize:'14px', fontWeight:'500', color:T.text }}>{r.name}</span>
                    </div>
                    <span style={{ fontSize:'14px', fontWeight:'700', color:'#059669' }}>{r.pct}%</span>
                  </div>
                ))}
              </div>

              {/* Needs Attention */}
              <div style={card}>
                <h3 style={{ fontSize:'15px', fontWeight:'700', color:T.text, margin:'0 0 16px', display:'flex', alignItems:'center', gap:'6px' }}>
                  <span style={{ color:'#EF4444', fontSize:'18px' }}>⚠</span> Needs Attention
                </h3>
                {(perStudent.filter((r:any)=>r.pct<75).length>0
                  ? perStudent.filter((r:any)=>r.pct<75).slice(0,4)
                  : [{name:'David Brown',note:'Low attendance (60%)'},{name:'Eva Green',note:'Missed 2 assignments'}]
                ).map((r:any,i:number)=>(
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:'14px', fontWeight:'500', color:T.text }}>{r.name}</span>
                    <span style={{ fontSize:'12px', color:T.muted }}>{r.note||`Low attendance (${r.pct}%)`}</span>
                  </div>
                ))}
              </div>
            </div>

            {chartData.length>0 && (
              <div style={card}>
                <h3 style={{ fontSize:'15px', fontWeight:'700', color:T.text, margin:'0 0 16px' }}>Attendance Trend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{top:4,right:16,left:0,bottom:4}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis dataKey="name" tick={{fontSize:11,fill:T.muted}}/>
                    <YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fontSize:11,fill:T.muted}}/>
                    <Tooltip formatter={(v:any)=>[`${v}%`,'Attendance']} contentStyle={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:'8px', fontSize:'12px', color:T.text }}/>
                    <Line type="monotone" dataKey="pct" stroke={ACCENT} strokeWidth={2.5} dot={{r:4,fill:ACCENT}} activeDot={{r:6}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ══════════ ATTENDANCE ══════════ */}
        {tab==='attendance' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'20px', animation:'fadeUp .35s ease' }}>

            {/* Session setup */}
            {!active && (
              <div style={card}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'20px' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'9px', background:'linear-gradient(135deg,#2563EB,#1D4ED8)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>🎯</div>
                  <h3 style={{ fontSize:'16px', fontWeight:'700', color:T.text, margin:0 }}>Set Up Attendance Session</h3>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))', gap:'14px', marginBottom:'18px' }}>
                  <div>
                    <label style={lbl}>Semester</label>
                    <div style={{ position:'relative' }}>
                      <select value={semester} onChange={e=>setSemester(e.target.value)} style={sel}>
                        {Object.keys(SEMESTERS).map(s=><option key={s}>{s}</option>)}
                      </select>
                      <span style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:T.muted }}>▾</span>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Subject</label>
                    <div style={{ position:'relative' }}>
                      <select value={subject} onChange={e=>setSubject(e.target.value)} style={sel}>
                        {SEMESTERS[semester].map(s=><option key={s}>{s}</option>)}
                      </select>
                      <span style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:T.muted }}>▾</span>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Date</label>
                    <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}
                      onFocus={e=>(e.target as HTMLInputElement).style.borderColor=ACCENT}
                      onBlur={e=>(e.target as HTMLInputElement).style.borderColor=T.border}/>
                  </div>
                  <div>
                    <label style={lbl}>Session #</label>
                    <div style={{ display:'flex', gap:'8px' }}>
                      {[1,2,3].map(n=>(
                        <button key={n} onClick={()=>setSessN(n)}
                          style={{ flex:1, height:'40px', borderRadius:'8px', border:'1.5px solid',
                            borderColor:sessN===n?ACCENT:T.border,
                            background:sessN===n?'linear-gradient(135deg,#2563EB,#1D4ED8)':'transparent',
                            color:sessN===n?'white':T.text,
                            fontWeight:'700', cursor:'pointer', fontSize:'14px', transition:'all .15s' }}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Info bar */}
                <div style={{ background:dark?'rgba(37,99,235,.15)':'#EFF6FF', border:`1px solid ${dark?'rgba(37,99,235,.3)':'#BFDBFE'}`, borderRadius:'10px', padding:'12px 16px', display:'flex', flexWrap:'wrap', gap:'10px', alignItems:'center', marginBottom:'18px' }}>
                  {[`📋 ${semester}`,`📖 ${subject}`,`📅 ${date}`,`Session ${sessN}`].map((item,i)=>(
                    <span key={i} style={{ fontSize:'13px', fontWeight:'600', color:dark?'#93C5FD':'#1D4ED8' }}>
                      {item}{i<3?<span style={{ margin:'0 10px', color:dark?'#1E40AF':'#93C5FD' }}>·</span>:null}
                    </span>
                  ))}
                </div>

                <button onClick={handleStart} disabled={starting}
                  style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'11px 28px',
                    background:'linear-gradient(135deg,#2563EB,#1D4ED8)', color:'white',
                    border:'none', borderRadius:'9px', fontSize:'14px', fontWeight:'700',
                    cursor:'pointer', boxShadow:'0 4px 16px rgba(37,99,235,.4)',
                    transition:'all .2s', opacity:starting?.7:1 }}>
                  {starting
                    ? <><span style={{ width:'14px',height:'14px',border:'2px solid rgba(255,255,255,.4)',borderTopColor:'white',borderRadius:'50%',display:'inline-block',animation:'spin .6s linear infinite' }}/>Starting…</>
                    : <>▶ Start QR Attendance</>
                  }
                </button>
                <p style={{ fontSize:'12px', color:T.muted, margin:'10px 0 0' }}>All students initialised as Absent. Students scanning the QR will be marked Present.</p>
              </div>
            )}

            {/* Live QR */}
            {active && (
              <div style={{ ...card, border:`2px solid ${dark?'rgba(37,99,235,.4)':'#BFDBFE'}`, background:dark?'rgba(37,99,235,.08)':'#F0F9FF', animation:'fadeUp .4s ease' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px', flexWrap:'wrap' }}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:'6px', background:dark?'rgba(5,150,105,.2)':'#DCFCE7', color:'#059669', fontSize:'12px', fontWeight:'800', padding:'5px 12px', borderRadius:'20px' }}>
                    <span style={{ width:'8px',height:'8px',borderRadius:'50%',background:'#16A34A',display:'inline-block',animation:'pulse2 1.5s infinite' }}/>LIVE SESSION
                  </span>
                  <span style={{ fontSize:'13px', fontWeight:'600', color:dark?'#93C5FD':'#1E40AF' }}>
                    {semester} · {subject} · {date} · Session {sessN}
                  </span>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'28px', alignItems:'flex-start' }}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px' }}>
                    <div style={{ padding:'12px', background:dark?T.surface:'white', borderRadius:'16px', boxShadow:'0 4px 20px rgba(37,99,235,.2)', border:`1px solid ${dark?T.border:'#BFDBFE'}` }}>
                      <canvas ref={canvasRef} style={{ display:'block', borderRadius:'8px' }}/>
                    </div>
                    <p style={{ fontSize:'11px', color:T.muted, margin:0 }}>Refreshes every 15 s</p>
                    <p style={{ fontSize:'11px', fontFamily:'monospace', color:ACCENT, margin:0 }}>Token: {tokenStr}</p>
                  </div>
                  <div style={{ flex:1, minWidth:'220px', display:'flex', flexDirection:'column', gap:'14px' }}>
                    <div style={{ ...card, background:T.surface }}>
                      <p style={{ fontSize:'13px', color:T.muted, margin:'0 0 6px', fontWeight:'500' }}>Students Present</p>
                      <div style={{ display:'flex', alignItems:'baseline', gap:'6px', marginBottom:'10px' }}>
                        <span style={{ fontSize:'40px', fontWeight:'900', color:T.text, lineHeight:1 }}>{count.marked}</span>
                        <span style={{ fontSize:'20px', color:T.muted }}>/ {count.total}</span>
                      </div>
                      <div style={{ height:'10px', background:T.subtle, borderRadius:'5px', overflow:'hidden' }}>
                        <div style={{ height:'100%', background:'linear-gradient(90deg,#2563EB,#1D4ED8)', borderRadius:'5px', transition:'width .6s cubic-bezier(.4,0,.2,1)', width:`${count.total?Math.round(count.marked/count.total*100):0}%` }}/>
                      </div>
                      <p style={{ fontSize:'12px', color:T.muted, margin:'6px 0 0', textAlign:'right', fontWeight:'600' }}>
                        {count.total?Math.round(count.marked/count.total*100):0}% marked
                      </p>
                    </div>
                    <div style={{ display:'flex', gap:'10px' }}>
                      <button onClick={drawQR}
                        style={{ flex:1, padding:'10px', border:`1.5px solid ${T.border}`, borderRadius:'9px', background:'transparent', fontSize:'13px', fontWeight:'600', cursor:'pointer', color:T.text, transition:'all .2s' }}>
                        🔄 Refresh QR
                      </button>
                      <button onClick={handleStop}
                        style={{ flex:1, padding:'10px', border:'none', borderRadius:'9px', background:'linear-gradient(135deg,#DC2626,#B91C1C)', color:'white', fontSize:'13px', fontWeight:'700', cursor:'pointer', boxShadow:'0 4px 12px rgba(220,38,38,.3)' }}>
                        ⏹ Stop Session
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Table filter info */}
            <div style={{ display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
              <span style={{ fontSize:'13px', color:T.muted }}>Showing records for:</span>
              <span style={{ fontSize:'13px', fontWeight:'700', color:ACCENT, background:dark?'rgba(37,99,235,.15)':'#EFF6FF', padding:'4px 12px', borderRadius:'20px' }}>{semester} · {subject}</span>
              <button onClick={loadTable} style={{ fontSize:'12px', fontWeight:'600', color:T.muted, background:'transparent', border:`1px solid ${T.border}`, borderRadius:'6px', padding:'4px 10px', cursor:'pointer' }}>
                🔄 Refresh
              </button>
              <a href={exportUrl(subject, semester)} style={{ fontSize:'12px', fontWeight:'600', color:T.muted, border:`1px solid ${T.border}`, borderRadius:'6px', padding:'4px 10px', textDecoration:'none' }}>
                ↓ Export Excel
              </a>
            </div>

            {/* Attendance table */}
            <div style={card}>
              {table.rows.length===0
                ? (
                  <div style={{ textAlign:'center', padding:'56px 24px' }}>
                    <div style={{ fontSize:'40px', marginBottom:'10px' }}>📋</div>
                    <p style={{ fontSize:'16px', fontWeight:'700', color:T.text, margin:'0 0 6px' }}>No records for this subject yet</p>
                    <p style={{ fontSize:'14px', color:T.muted, margin:0 }}>Start a session above for <strong>{subject}</strong> to begin tracking</p>
                  </div>
                ) : (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px', minWidth:'400px' }}>
                      <thead>
                        <tr style={{ background:T.subtle }}>
                          {['SL','Reg No.','Name'].map(h=>(
                            <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontWeight:'600', color:T.muted, fontSize:'11px', textTransform:'uppercase', letterSpacing:'.05em', borderBottom:`1px solid ${T.border}` }}>{h}</th>
                          ))}
                          {table.columns.map((col:string)=>{
                            const [d,s]=col.split('_'); const sess=parseInt(s.replace('S',''))
                            return (
                              <th key={col} style={{ padding:'11px 14px', textAlign:'center', fontWeight:'600', color:T.muted, fontSize:'11px', textTransform:'uppercase', letterSpacing:'.05em', borderBottom:`1px solid ${T.border}`, whiteSpace:'nowrap' }}>
                                <div style={{ fontSize:'11px' }}>{d}</div>
                                <div style={{ display:'flex', alignItems:'center', gap:'4px', justifyContent:'center', marginTop:'3px' }}>
                                  <span style={{ background:dark?'rgba(37,99,235,.2)':'#EFF6FF', color:ACCENT, padding:'1px 7px', borderRadius:'4px', fontWeight:'700', fontSize:'10px' }}>{s}</span>
                                  <button title="Delete entire column"
                                    onClick={async()=>{ if(confirm(`Delete ALL records for ${d} ${s}?`)){await deleteAttendanceSession(d,sess);loadTable()} }}
                                    style={{ background:'none', border:'none', cursor:'pointer', color:'#FCA5A5', padding:'1px 3px', borderRadius:'3px', fontSize:'11px', lineHeight:1, transition:'color .15s' }}
                                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.color='#EF4444'}
                                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.color='#FCA5A5'}>🗑</button>
                                </div>
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row:any)=>(
                          <tr key={row.id} className="row-hover" style={{ borderBottom:`1px solid ${T.border}` }}>
                            <td style={{ padding:'11px 14px', color:T.muted, fontSize:'12px' }}>{row.sl}</td>
                            <td style={{ padding:'11px 14px', fontFamily:'monospace', fontWeight:'700', color:ACCENT, fontSize:'12px' }}>{row.reg_no}</td>
                            <td style={{ padding:'11px 14px', fontWeight:'500', color:T.text }}>{row.name}</td>
                            {table.columns.map((col:string)=>{
                              const val=row[col]||'–'
                              return (
                                <td key={col} style={{ padding:'11px 14px', textAlign:'center' }}>
                                  <span style={{ display:'inline-block', padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'700',
                                    background:val==='P'?dark?'rgba(5,150,105,.2)':'#DCFCE7':val==='A'?dark?'rgba(220,38,38,.2)':'#FEE2E2':T.subtle,
                                    color:val==='P'?'#059669':val==='A'?'#EF4444':T.muted }}>
                                    {val}
                                  </span>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>
          </div>
        )}

        {/* ══════════ REPORTS ══════════ */}
        {tab==='reports' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'20px', animation:'fadeUp .35s ease' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px' }}>
              {[
                { label:'Total Sessions', value:totalCols,     grad:'linear-gradient(135deg,#2563EB,#1D4ED8)' },
                { label:'Total Students', value:totalStudents, grad:'linear-gradient(135deg,#7C3AED,#6D28D9)' },
                { label:'Avg Attendance', value:`${avgPct}%`,  grad:avgPct>=75?'linear-gradient(135deg,#059669,#047857)':'linear-gradient(135deg,#DC2626,#B91C1C)' },
                { label:'Present Records',value:totalPresent,  grad:'linear-gradient(135deg,#D97706,#B45309)' },
              ].map(s=>(
                <div key={s.label} style={{ borderRadius:'14px', padding:'20px', background:s.grad, boxShadow:'0 4px 16px rgba(0,0,0,.15)' }}>
                  <p style={{ fontSize:'12px', color:'rgba(255,255,255,.75)', margin:'0 0 8px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'.06em' }}>{s.label}</p>
                  <p style={{ fontSize:'32px', fontWeight:'900', color:'white', margin:0 }}>{s.value}</p>
                </div>
              ))}
            </div>

            {chartData.length>0 && (
              <div style={card}>
                <h3 style={{ fontSize:'15px', fontWeight:'700', color:T.text, margin:'0 0 16px' }}>Session-wise Attendance — {subject}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{top:4,right:16,left:0,bottom:4}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis dataKey="name" tick={{fontSize:11,fill:T.muted}}/>
                    <YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fontSize:11,fill:T.muted}}/>
                    <Tooltip formatter={(v:any)=>[`${v}%`,'Attendance']} contentStyle={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:'8px', fontSize:'12px', color:T.text }}/>
                    <Bar dataKey="pct" radius={[6,6,0,0]}>
                      {chartData.map((e,i)=><Cell key={i} fill={e.pct>=80?'#059669':e.pct>=60?'#D97706':'#DC2626'}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {perStudent.length>0 && (
              <div style={card}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                  <h3 style={{ fontSize:'15px', fontWeight:'700', color:T.text, margin:0 }}>Student Summary — {subject}</h3>
                  <a href={exportUrl(subject,semester)} style={{ padding:'8px 14px', border:`1.5px solid ${T.border}`, borderRadius:'8px', background:'transparent', fontSize:'12px', fontWeight:'600', textDecoration:'none', color:T.text }}>↓ Export</a>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                    <thead>
                      <tr style={{ background:T.subtle }}>
                        {['Reg No.','Name','Sessions','Present','Absent','Attendance %'].map(h=>(
                          <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontWeight:'600', color:T.muted, fontSize:'11px', textTransform:'uppercase', letterSpacing:'.05em', borderBottom:`1px solid ${T.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {perStudent.map((r:any)=>(
                        <tr key={r.id} className="row-hover" style={{ borderBottom:`1px solid ${T.border}` }}>
                          <td style={{ padding:'11px 14px', fontFamily:'monospace', fontWeight:'700', color:ACCENT, fontSize:'12px' }}>{r.reg_no}</td>
                          <td style={{ padding:'11px 14px', fontWeight:'500', color:T.text }}>{r.name}</td>
                          <td style={{ padding:'11px 14px', color:T.muted }}>{totalCols}</td>
                          <td style={{ padding:'11px 14px' }}><span style={{ background:dark?'rgba(5,150,105,.2)':'#DCFCE7', color:'#059669', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'700' }}>{r.pres}</span></td>
                          <td style={{ padding:'11px 14px' }}><span style={{ background:dark?'rgba(220,38,38,.2)':'#FEE2E2', color:'#EF4444', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'700' }}>{r.abs}</span></td>
                          <td style={{ padding:'11px 14px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                              <div style={{ flex:1, height:'6px', background:T.subtle, borderRadius:'3px', overflow:'hidden', minWidth:'60px' }}>
                                <div style={{ height:'100%', borderRadius:'3px', transition:'width .4s', background:r.pct>=75?'#059669':'#EF4444', width:`${r.pct}%` }}/>
                              </div>
                              <span style={{ fontSize:'12px', fontWeight:'800', color:r.pct>=75?'#059669':'#EF4444', minWidth:'36px' }}>{r.pct}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════ OTHER TABS (online / assignments / quizzes) ══════════ */}
        {(tab==='online'||tab==='assignments'||tab==='quizzes') && (
          <div style={{ display:'flex', flexDirection:'column', gap:'16px', animation:'fadeUp .35s ease' }}>
            <div style={{ ...card, textAlign:'center', padding:'40px 24px' }}>
              <div style={{ fontSize:'48px', marginBottom:'12px' }}>{tab==='online'?'🎥':tab==='assignments'?'📝':'❓'}</div>
              <h3 style={{ fontSize:'18px', fontWeight:'700', color:T.text, margin:'0 0 8px' }}>
                {tab==='online'?'Online Class':tab==='assignments'?'Assignments':'Quizzes'}
              </h3>
              <p style={{ fontSize:'14px', color:T.muted, margin:'0 0 20px' }}>Demo section — sample data shown below</p>
              {tab==='online' && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:'14px', textAlign:'left' }}>
                  {[{sub:'Computer Science 101',time:'10:00 AM',status:'Live'},{sub:'Data Structures',time:'12:00 PM',status:'Scheduled'},{sub:'Mathematics',time:'2:00 PM',status:'Scheduled'}].map((c,i)=>(
                    <div key={i} style={{ background:T.subtle, borderRadius:'10px', padding:'16px', border:`1px solid ${T.border}` }}>
                      <span style={{ fontSize:'11px', fontWeight:'700', background:c.status==='Live'?dark?'rgba(5,150,105,.2)':'#DCFCE7':'transparent', color:c.status==='Live'?'#059669':T.muted, padding:'2px 8px', borderRadius:'20px', border:`1px solid ${c.status==='Live'?'#059669':T.border}` }}>{c.status}</span>
                      <p style={{ fontWeight:'700', color:T.text, margin:'10px 0 2px', fontSize:'14px' }}>{c.sub}</p>
                      <p style={{ color:T.muted, fontSize:'13px', margin:0 }}>🕐 {c.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}