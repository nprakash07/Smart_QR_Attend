import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { markAttendance, getMyAttendance, exportUrl } from '@/services/api'
import { Html5Qrcode } from 'html5-qrcode'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const TEAL = '#0D9488'
type Tab = 'dashboard'|'attendance'|'online'|'assignments'|'quizzes'|'classes'|'history'

const TABS: {id:Tab;label:string;icon:string}[] = [
  {id:'dashboard',   label:'Dashboard',   icon:'📊'},
  {id:'attendance',  label:'Attendance',  icon:'✅'},
  {id:'online',      label:'Online',      icon:'🎥'},
  {id:'assignments', label:'Assignments', icon:'📝'},
  {id:'quizzes',     label:'Quizzes',     icon:'❓'},
  {id:'classes',     label:'Classes',     icon:'📚'},
  {id:'history',     label:'History',     icon:'🕐'},
]

type Theme = { bg:string; surface:string; card:string; border:string; text:string; muted:string; subtle:string }
const LIGHT: Theme = { bg:'#F8FAFC', surface:'#FFFFFF', card:'#FFFFFF', border:'#E2E8F0', text:'#0F172A', muted:'#64748B', subtle:'#F1F5F9' }
const DARK:  Theme = { bg:'#0F172A', surface:'#1E293B', card:'#1E293B', border:'#334155', text:'#F1F5F9', muted:'#94A3B8', subtle:'#0F172A'  }

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [dark,     setDark]     = useState(() => localStorage.getItem('sa_dark')==='1')
  const [tab,      setTab]      = useState<Tab>('dashboard')
  const [scanning, setScanning] = useState(false)
  const [scanDone, setScanDone] = useState(false)
  const [feedback, setFeedback] = useState<{ok:boolean;msg:string}|null>(null)
  const [myTable,  setMyTable]  = useState<{columns:string[];rows:any[]}>({columns:[],rows:[]})
  const [loading,  setLoading]  = useState(false)
  const [manSid,   setManSid]   = useState('')
  const [manTok,   setManTok]   = useState('')
  const [manLoad,  setManLoad]  = useState(false)
  const qrRef = useRef<Html5Qrcode|null>(null)

  const T = dark ? DARK : LIGHT

  useEffect(() => {
    localStorage.setItem('sa_dark', dark ? '1' : '0')
    document.body.style.background = T.bg
  }, [dark])

  const loadAtt = useCallback(async () => {
    setLoading(true)
    try { const d = await getMyAttendance(); setMyTable(d) } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAtt() }, [loadAtt])
  useEffect(() => { if (tab!=='attendance' && scanning) stopScan() }, [tab])

  const startScan = async () => {
    setScanDone(false); setFeedback(null)
    // Fully clean up any previous instance
    try { if (qrRef.current) { await qrRef.current.stop(); qrRef.current=null } } catch {}
    const el = document.getElementById('qr-reader')
    if (!el) return
    el.innerHTML = '' // wipe DOM so html5-qrcode can re-init cleanly
    try {
      qrRef.current = new Html5Qrcode('qr-reader')
      await qrRef.current.start(
        { facingMode:'environment' },
        { fps:10, qrbox:{width:220,height:220} },
        onScan, ()=>{}
      )
      setScanning(true)
    } catch (e:any) {
      setFeedback({ ok:false, msg:'Camera error: '+(e.message||'Permission denied') })
    }
  }

  const stopScan = async () => {
    try { if (qrRef.current) { await qrRef.current.stop(); qrRef.current=null } } catch {}
    setScanning(false)
  }

  const onScan = async (decoded: string) => {
    await stopScan()
    try {
      const data = JSON.parse(decoded)
      const res  = await markAttendance(data.session_id, data.token)
      setFeedback({ ok:true, msg:res.message }); setScanDone(true); loadAtt()
    } catch (e:any) {
      const msg = e.message || 'Scan failed'
      setFeedback({ ok:false, msg })
      if (!msg.toLowerCase().includes('already')) setTimeout(()=>startScan(), 2000)
    }
  }

  const submitManual = async (e: React.FormEvent) => {
    e.preventDefault(); setManLoad(true)
    try { const r=await markAttendance(manSid.trim(),manTok.trim()); setFeedback({ok:true,msg:r.message}); loadAtt() }
    catch (err:any) { setFeedback({ok:false,msg:err.message}) }
    finally { setManLoad(false) }
  }

  const myRow     = myTable.rows.find((r:any)=>r.reg_no===user?.reg_no)
  const totalSess = myTable.columns.length
  const present   = myRow ? myTable.columns.filter((c:string)=>myRow[c]==='P').length : 0
  const absent    = myRow ? myTable.columns.filter((c:string)=>myRow[c]==='A').length : 0
  const myPct     = totalSess ? Math.round(present/totalSess*100) : 0
  const pctColor  = myPct>=75?'#059669':'#EF4444'

  const weeklyData = [
    {week:'W1', att:Math.max(myPct-5,0)||70, quiz:75},
    {week:'W2', att:Math.max(myPct-3,0)||75, quiz:78},
    {week:'W3', att:Math.max(myPct+2,0)||80, quiz:82},
    {week:'W4', att:Math.max(myPct-1,0)||78, quiz:79},
    {week:'W5', att:myPct||80,               quiz:80},
  ]
  const subjectData = [
    {subject:'CS',    score:88},
    {subject:'DS',    score:75},
    {subject:'Math',  score:92},
    {subject:'Physics',score:70},
  ]

  const card: React.CSSProperties = { background:T.card, border:`1px solid ${T.border}`, borderRadius:'14px', padding:'20px', transition:'background .3s,border .3s' }
  const inp: React.CSSProperties  = { width:'100%', padding:'10px 12px', border:`1.5px solid ${T.border}`, borderRadius:'8px', fontSize:'13px', outline:'none', background:T.surface, color:T.text, transition:'all .2s', boxSizing:'border-box', fontFamily:'monospace' }
  const lbl: React.CSSProperties  = { display:'block', fontSize:'11px', fontWeight:'600', color:T.muted, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'5px' }

  return (
    <div style={{ minHeight:'100vh', background:T.bg, color:T.text, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', transition:'background .3s,color .3s' }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse2{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes scan{0%{top:0}50%{top:calc(100% - 3px)}100%{top:0}}
        .row-hover:hover td{background:${dark?'rgba(255,255,255,.04)':'rgba(13,148,136,.03)'}!important}
        .hover-lift:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.12)}
        select option{background:${T.surface};color:${T.text}}
      `}</style>

      {/* ══ HEADER ══ */}
      <header style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, height:'60px', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px', position:'sticky', top:0, zIndex:30, boxShadow:dark?'0 1px 0 #334155':'0 1px 4px rgba(0,0,0,.06)', transition:'background .3s,border .3s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:'38px', height:'38px', borderRadius:'10px', background:`linear-gradient(135deg,${TEAL},#0F766E)`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 12px ${TEAL}44` }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" fill="white"/></svg>
          </div>
          <div>
            <p style={{ fontSize:'15px', fontWeight:'700', color:T.text, margin:0 }}>Smart Attendance</p>
            <span style={{ fontSize:'10px', fontWeight:'700', background:`linear-gradient(135deg,${TEAL},#0F766E)`, color:'white', borderRadius:'4px', padding:'1px 8px' }}>Student</span>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          {/* Dark mode toggle */}
          <button onClick={()=>setDark(d=>!d)}
            style={{ width:'44px', height:'24px', borderRadius:'12px', border:'none', background:dark?TEAL:'#CBD5E1', cursor:'pointer', position:'relative', transition:'background .3s', flexShrink:0 }}>
            <span style={{ position:'absolute', top:'3px', left:dark?'23px':'3px', width:'18px', height:'18px', borderRadius:'50%', background:'white', transition:'left .2s', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px' }}>
              {dark?'🌙':'☀️'}
            </span>
          </button>

          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:dark?`rgba(13,148,136,.2)`:'#F0FDFA', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke={TEAL} strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
            </div>
            <div>
              <p style={{ fontSize:'13px', fontWeight:'700', color:T.text, margin:0 }}>{user?.name || 'Student'}</p>
              <p style={{ fontSize:'11px', color:T.muted, margin:0, fontFamily:'monospace' }}>{user?.reg_no}</p>
            </div>
          </div>

          <button onClick={()=>{logout();navigate('/')}}
            style={{ display:'flex', alignItems:'center', gap:'6px', border:`1.5px solid ${dark?'#4B1818':'#FECACA'}`, color:'#EF4444', background:'transparent', borderRadius:'8px', padding:'7px 14px', fontSize:'13px', fontWeight:'600', cursor:'pointer', transition:'all .2s' }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=dark?'rgba(239,68,68,.1)':'#FEF2F2'}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>
            Logout
          </button>
        </div>
      </header>

      {/* ══ PAGE HEADER + TABS ══ */}
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, padding:'20px 28px 0', transition:'background .3s,border .3s' }}>
        <h1 style={{ fontSize:'22px', fontWeight:'800', color:T.text, margin:'0 0 2px' }}>Student Dashboard</h1>
        <p style={{ fontSize:'14px', color:T.muted, margin:'0 0 18px' }}>Mark attendance and track your progress</p>
        <div style={{ display:'flex', gap:'2px', overflowX:'auto' }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'12px 16px', border:'none', background:'none', fontSize:'13px', cursor:'pointer', whiteSpace:'nowrap', transition:'all .15s', borderBottom:'3px solid transparent', fontWeight:tab===t.id?'700':'500', color:tab===t.id?TEAL:T.muted, borderBottomColor:tab===t.id?TEAL:'transparent' }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px 28px', maxWidth:'1280px', margin:'0 auto' }}>

        {/* ════ DASHBOARD ════ */}
        {tab==='dashboard' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'20px', animation:'fadeUp .35s ease' }}>
            {/* Top stat cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px' }}>
              {[
                { label:'Attendance',   value:`${myPct}%`,    icon:'👥', grad:`linear-gradient(135deg,${TEAL},#0F766E)`, sub:myPct>=75?'✓ Good standing':'⚠ Below 75%' },
                { label:'Classes',      value:totalSess||2,   icon:'📚', grad:'linear-gradient(135deg,#2563EB,#1D4ED8)',  sub:null },
                { label:'Assignments',  value:2,               icon:'📝', grad:'linear-gradient(135deg,#7C3AED,#6D28D9)', sub:null },
                { label:'Quizzes',      value:2,               icon:'❓', grad:'linear-gradient(135deg,#D97706,#B45309)', sub:null },
              ].map(s=>(
                <div key={s.label} className="hover-lift" style={{ ...card, display:'flex', alignItems:'center', gap:'14px', cursor:'default', transition:'all .25s' }}>
                  <div style={{ width:'50px', height:'50px', borderRadius:'14px', background:s.grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0, boxShadow:'0 4px 12px rgba(0,0,0,.2)' }}>{s.icon}</div>
                  <div>
                    <p style={{ fontSize:'11px', color:T.muted, margin:'0 0 4px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'.05em' }}>{s.label}</p>
                    <p style={{ fontSize:'28px', fontWeight:'900', color:T.text, margin:0, lineHeight:1 }}>{s.value}</p>
                    {s.sub && <p style={{ fontSize:'11px', fontWeight:'700', margin:'3px 0 0', color:myPct>=75?'#059669':'#EF4444' }}>{s.sub}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* Performance strip */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px' }}>
              {[
                { label:'Attendance Rate', value:`${myPct||85}%`, w:myPct||85, trend:'+5%', up:true,  color:TEAL       },
                { label:'Quiz Average',    value:'78%',           w:78,        trend:'-2%', up:false, color:'#2563EB'  },
                { label:'Assignments',     value:'8/10',          w:80,        trend:'',    up:true,  color:'#7C3AED'  },
                { label:'Overall Score',   value:'82%',           w:82,        trend:'',    up:true,  color:'#D97706'  },
              ].map(s=>(
                <div key={s.label} style={card}>
                  <p style={{ fontSize:'13px', color:T.muted, margin:'0 0 6px', fontWeight:'500' }}>{s.label}</p>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'10px' }}>
                    <span style={{ fontSize:'26px', fontWeight:'900', color:T.text, lineHeight:1 }}>{s.value}</span>
                    {s.trend && <span style={{ fontSize:'12px', fontWeight:'700', color:s.up?'#059669':'#EF4444' }}>{s.trend}</span>}
                  </div>
                  <div style={{ height:'5px', background:T.subtle, borderRadius:'3px', overflow:'hidden' }}>
                    <div style={{ height:'100%', background:s.color, borderRadius:'3px', width:`${s.w}%`, transition:'width .6s cubic-bezier(.4,0,.2,1)' }}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
              <div style={card}>
                <h3 style={{ fontSize:'15px', fontWeight:'700', color:T.text, margin:'0 0 16px' }}>🕐 Weekly Performance</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={weeklyData} margin={{top:4,right:8,left:0,bottom:4}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis dataKey="week" tick={{fontSize:11,fill:T.muted}}/>
                    <YAxis domain={[0,100]} tick={{fontSize:11,fill:T.muted}}/>
                    <Tooltip contentStyle={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:'8px', fontSize:'12px', color:T.text }}/>
                    <Line type="monotone" dataKey="att"  stroke={TEAL}    strokeWidth={2.5} dot={{r:3,fill:TEAL}}    name="Attendance"/>
                    <Line type="monotone" dataKey="quiz" stroke="#2563EB" strokeWidth={2.5} dot={{r:3,fill:'#2563EB'}} name="Quiz"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={card}>
                <h3 style={{ fontSize:'15px', fontWeight:'700', color:T.text, margin:'0 0 16px' }}>📚 Subject Performance</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={subjectData} layout="vertical" margin={{top:4,right:8,left:4,bottom:4}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis type="number" domain={[0,100]} tick={{fontSize:11,fill:T.muted}}/>
                    <YAxis dataKey="subject" type="category" tick={{fontSize:11,fill:T.muted}} width={55}/>
                    <Tooltip contentStyle={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:'8px', fontSize:'12px', color:T.text }}/>
                    <Bar dataKey="score" fill="#2563EB" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <button onClick={()=>setTab('attendance')}
              style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'12px 24px', background:`linear-gradient(135deg,${TEAL},#0F766E)`, color:'white', border:'none', borderRadius:'9px', fontSize:'14px', fontWeight:'700', cursor:'pointer', alignSelf:'flex-start', boxShadow:`0 4px 16px ${TEAL}44`, transition:'all .2s' }}>
              📷 Mark Attendance Now
            </button>
          </div>
        )}

        {/* ════ ATTENDANCE ════ */}
        {tab==='attendance' && (
          <div style={{ display:'flex', flexDirection:'column', gap:'20px', animation:'fadeUp .35s ease' }}>
            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'16px' }}>
              {[
                { label:'Sessions',   value:totalSess, icon:'📅', grad:`linear-gradient(135deg,${TEAL},#0F766E)` },
                { label:'Present',    value:present,   icon:'✅', grad:'linear-gradient(135deg,#059669,#047857)' },
                { label:'Absent',     value:absent,    icon:'❌', grad:'linear-gradient(135deg,#DC2626,#B91C1C)' },
                { label:'Attendance', value:`${myPct}%`,icon:'📊', grad:myPct>=75?`linear-gradient(135deg,${TEAL},#0F766E)`:'linear-gradient(135deg,#DC2626,#B91C1C)' },
              ].map(s=>(
                <div key={s.label} className="hover-lift" style={{ ...card, display:'flex', alignItems:'center', gap:'12px', cursor:'default', transition:'all .25s' }}>
                  <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:s.grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0, boxShadow:'0 4px 10px rgba(0,0,0,.18)' }}>{s.icon}</div>
                  <div>
                    <p style={{ fontSize:'11px', color:T.muted, margin:'0 0 2px', fontWeight:'600', textTransform:'uppercase', letterSpacing:'.05em' }}>{s.label}</p>
                    <p style={{ fontSize:'24px', fontWeight:'900', color:T.text, margin:0, lineHeight:1 }}>{s.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                <h3 style={{ fontSize:'14px', fontWeight:'700', color:T.text, margin:0 }}>Overall Attendance Progress</h3>
                <span style={{ fontSize:'22px', fontWeight:'900', color:pctColor }}>{myPct}%</span>
              </div>
              <div style={{ height:'12px', background:T.subtle, borderRadius:'6px', overflow:'hidden', marginBottom:'8px', position:'relative' }}>
                <div style={{ height:'100%', background:myPct>=75?`linear-gradient(90deg,${TEAL},#059669)`:'linear-gradient(90deg,#DC2626,#EF4444)', borderRadius:'6px', transition:'width .8s cubic-bezier(.4,0,.2,1)', width:`${myPct}%` }}/>
                {/* 75% marker */}
                <div style={{ position:'absolute', top:0, left:'75%', width:'2px', height:'100%', background:dark?'rgba(255,255,255,.3)':'rgba(0,0,0,.2)' }}/>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:T.muted }}>
                <span>0%</span>
                <span style={{ fontWeight:'700', color:'#EF4444' }}>▲ 75% minimum</span>
                <span>100%</span>
              </div>
            </div>

            {/* Feedback */}
            {feedback && (
              <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'13px 16px', borderRadius:'10px', fontSize:'14px', fontWeight:'600', background:feedback.ok?dark?'rgba(5,150,105,.2)':'#DCFCE7':dark?'rgba(220,38,38,.2)':'#FEE2E2', color:feedback.ok?'#059669':'#EF4444', border:`1px solid ${feedback.ok?dark?'rgba(5,150,105,.4)':'#BBF7D0':dark?'rgba(220,38,38,.4)':'#FECACA'}` }}>
                <span style={{ fontSize:'20px' }}>{feedback.ok?'✅':'❌'}</span>
                <span>{feedback.msg}</span>
                <button onClick={()=>setFeedback(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:'18px', color:'inherit', opacity:.6 }}>✕</button>
              </div>
            )}

            {/* QR Scanner */}
            <div style={card}>
              <h3 style={{ fontSize:'15px', fontWeight:'700', color:T.text, margin:'0 0 18px', display:'flex', alignItems:'center', gap:'8px' }}>
                <span style={{ width:'32px', height:'32px', borderRadius:'8px', background:`linear-gradient(135deg,${TEAL},#0F766E)`, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'16px' }}>📷</span>
                QR Code Scanner
              </h3>

              <div style={{ display:'flex', flexWrap:'wrap', gap:'28px', alignItems:'flex-start' }}>
                {/* Camera */}
                <div style={{ flex:'0 0 auto' }}>
                  <div style={{ width:'280px', height:'280px', background:dark?'#020617':'#0F172A', borderRadius:'16px', overflow:'hidden', border:`2px solid ${scanning?TEAL:T.border}`, position:'relative', transition:'border-color .3s', boxShadow:scanning?`0 0 0 4px ${TEAL}22`:undefined }}>
                    <div id="qr-reader" style={{ width:'100%', height:'100%' }}/>
                    {/* Scan line */}
                    {scanning && <div style={{ position:'absolute', left:0, width:'100%', height:'2px', background:`linear-gradient(90deg,transparent,${TEAL},transparent)`, animation:'scan 2s linear infinite', boxShadow:`0 0 8px ${TEAL}` }}/>}
                    {!scanning && (
                      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'10px', pointerEvents:'none' }}>
                        <svg width="60" height="60" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,.15)" strokeWidth=".8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"/>
                        </svg>
                        <p style={{ fontSize:'13px', color:'rgba(255,255,255,.4)', margin:0 }}>{scanDone?'Scan another code?':'Press Start Camera'}</p>
                      </div>
                    )}
                    {scanning && (
                      <div style={{ position:'absolute', top:'10px', right:'10px' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:'rgba(5,150,105,.9)', color:'white', fontSize:'11px', fontWeight:'800', padding:'4px 10px', borderRadius:'20px' }}>
                          <span style={{ width:'6px',height:'6px',borderRadius:'50%',background:'#6EE7B7',display:'inline-block',animation:'pulse2 1s infinite' }}/>
                          LIVE
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ display:'flex', gap:'10px', marginTop:'12px' }}>
                    {!scanning
                      ? <button onClick={startScan} style={{ flex:1, padding:'12px', background:`linear-gradient(135deg,${TEAL},#0F766E)`, color:'white', border:'none', borderRadius:'9px', fontSize:'14px', fontWeight:'700', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', boxShadow:`0 4px 14px ${TEAL}44`, transition:'all .2s' }}>
                          📷 {scanDone?'Scan Again':'Start Camera'}
                        </button>
                      : <button onClick={stopScan} style={{ flex:1, padding:'12px', background:'linear-gradient(135deg,#DC2626,#B91C1C)', color:'white', border:'none', borderRadius:'9px', fontSize:'14px', fontWeight:'700', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', boxShadow:'0 4px 14px rgba(220,38,38,.4)' }}>
                          ⏹ Stop Camera
                        </button>
                    }
                  </div>
                  <p style={{ fontSize:'12px', color:T.muted, textAlign:'center', marginTop:'8px' }}>Point camera at teacher's QR code</p>
                </div>

                {/* Manual entry */}
                <div style={{ flex:1, minWidth:'200px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px' }}>
                    <h4 style={{ fontSize:'14px', fontWeight:'700', color:T.text, margin:0 }}>✏️ Manual Entry</h4>
                    <span style={{ fontSize:'11px', fontWeight:'700', color:T.muted, background:T.subtle, padding:'2px 8px', borderRadius:'20px', border:`1px solid ${T.border}` }}>Fallback</span>
                  </div>
                  <form onSubmit={submitManual} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                    <div>
                      <label style={lbl}>Session ID</label>
                      <input style={inp} placeholder="Paste session ID" value={manSid} onChange={e=>setManSid(e.target.value)} required
                        onFocus={e=>(e.target as HTMLInputElement).style.borderColor=TEAL}
                        onBlur={e=>(e.target as HTMLInputElement).style.borderColor=T.border}/>
                    </div>
                    <div>
                      <label style={lbl}>Token</label>
                      <input style={inp} placeholder="Paste token" value={manTok} onChange={e=>setManTok(e.target.value)} required
                        onFocus={e=>(e.target as HTMLInputElement).style.borderColor=TEAL}
                        onBlur={e=>(e.target as HTMLInputElement).style.borderColor=T.border}/>
                    </div>
                    <button type="submit" disabled={manLoad}
                      style={{ padding:'10px 20px', border:`1.5px solid ${T.border}`, borderRadius:'9px', background:'transparent', fontSize:'14px', fontWeight:'600', cursor:'pointer', color:T.text, alignSelf:'flex-start', opacity:manLoad?.7:1, transition:'all .2s' }}>
                      {manLoad?<span style={{ display:'flex', alignItems:'center', gap:'6px' }}><span style={{ width:'12px',height:'12px',border:'2px solid #94A3B8',borderTopColor:TEAL,borderRadius:'50%',display:'inline-block',animation:'spin .6s linear infinite' }}/>Submitting…</span>:'Submit Manually'}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Records table — read-only for student, no delete */}
            <div style={card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px' }}>
                <h3 style={{ fontSize:'15px', fontWeight:'700', color:T.text, margin:0 }}>Session Records</h3>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={loadAtt} style={{ display:'flex', alignItems:'center', gap:'5px', padding:'8px 14px', border:`1.5px solid ${T.border}`, borderRadius:'8px', background:'transparent', fontSize:'12px', fontWeight:'600', cursor:'pointer', color:T.text }}>
                    {loading?<span style={{ width:'11px',height:'11px',border:`1.5px solid ${T.muted}`,borderTopColor:TEAL,borderRadius:'50%',display:'inline-block',animation:'spin .6s linear infinite' }}/>:'🔄'} Refresh
                  </button>
                  <a href={exportUrl()} style={{ padding:'8px 14px', border:`1.5px solid ${T.border}`, borderRadius:'8px', background:'transparent', fontSize:'12px', fontWeight:'600', textDecoration:'none', color:T.text }}>↓ Export</a>
                </div>
              </div>

              {myTable.columns.length===0 ? (
                <div style={{ textAlign:'center', padding:'48px 24px' }}>
                  <div style={{ fontSize:'40px', marginBottom:'10px' }}>📋</div>
                  <p style={{ fontSize:'16px', fontWeight:'700', color:T.text, margin:'0 0 6px' }}>No records yet</p>
                  <p style={{ fontSize:'13px', color:T.muted, margin:0 }}>Scan a QR code to record your first attendance</p>
                </div>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                    <thead>
                      <tr style={{ background:T.subtle }}>
                        {['#','Date','Session','Status'].map(h=>(
                          <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontWeight:'600', color:T.muted, fontSize:'11px', textTransform:'uppercase', letterSpacing:'.05em', borderBottom:`1px solid ${T.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {myTable.columns.map((col:string,i:number)=>{
                        const [d,s]=col.split('_'); const val=myRow?myRow[col]:'–'
                        return (
                          <tr key={col} className="row-hover" style={{ borderBottom:`1px solid ${T.border}` }}>
                            <td style={{ padding:'11px 14px', color:T.muted, fontSize:'12px' }}>{i+1}</td>
                            <td style={{ padding:'11px 14px', fontWeight:'500', color:T.text }}>{d}</td>
                            <td style={{ padding:'11px 14px' }}>
                              <span style={{ background:dark?`rgba(13,148,136,.2)`:'#F0FDFA', color:TEAL, padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>{s}</span>
                            </td>
                            <td style={{ padding:'11px 14px' }}>
                              <span style={{ display:'inline-block', padding:'4px 14px', borderRadius:'20px', fontSize:'12px', fontWeight:'700',
                                background:val==='P'?dark?'rgba(5,150,105,.2)':'#DCFCE7':val==='A'?dark?'rgba(220,38,38,.2)':'#FEE2E2':T.subtle,
                                color:val==='P'?'#059669':val==='A'?'#EF4444':T.muted }}>
                                {val==='P'?'✓ Present':val==='A'?'✕ Absent':'– N/A'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ OTHER TABS ════ */}
        {(tab==='online'||tab==='assignments'||tab==='quizzes'||tab==='classes'||tab==='history') && (
          <div style={{ animation:'fadeUp .35s ease' }}>
            {/* reuse cards from before — condensed demo */}
            <div style={{ ...card, textAlign:'center', padding:'40px 24px' }}>
              <div style={{ fontSize:'48px', marginBottom:'10px' }}>{TABS.find(t=>t.id===tab)?.icon}</div>
              <h3 style={{ fontSize:'18px', fontWeight:'700', color:T.text, margin:'0 0 6px' }}>{TABS.find(t=>t.id===tab)?.label}</h3>
              <p style={{ fontSize:'14px', color:T.muted, margin:'0 0 20px' }}>Demo section — sample data</p>
              {tab==='classes' && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:'14px', textAlign:'left' }}>
                  {[{sub:'Computer Science 101',teacher:'Dr. Smith',pct:88,code:'CS101'},{sub:'Data Structures',teacher:'Prof. Kumar',pct:75,code:'DS101'},{sub:'Mathematics',teacher:'Dr. Patel',pct:92,code:'MATH'}].map((c,i)=>(
                    <div key={i} style={{ background:T.subtle, borderRadius:'12px', padding:'18px', border:`1px solid ${T.border}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                        <h4 style={{ fontSize:'14px', fontWeight:'700', color:T.text, margin:0 }}>{c.sub}</h4>
                        <code style={{ fontSize:'11px', fontWeight:'700', background:T.border, color:T.muted, padding:'2px 6px', borderRadius:'4px' }}>{c.code}</code>
                      </div>
                      <p style={{ fontSize:'13px', color:T.muted, margin:'0 0 12px' }}>👨‍🏫 {c.teacher}</p>
                      <div>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                          <span style={{ fontSize:'12px', color:T.muted }}>Attendance</span>
                          <span style={{ fontSize:'13px', fontWeight:'700', color:c.pct>=75?'#059669':'#EF4444' }}>{c.pct}%</span>
                        </div>
                        <div style={{ height:'6px', background:T.border, borderRadius:'3px', overflow:'hidden' }}>
                          <div style={{ height:'100%', background:c.pct>=75?TEAL:'#EF4444', borderRadius:'3px', width:`${c.pct}%` }}/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {tab==='history' && myTable.columns.length>0 && (
                <div style={{ overflowX:'auto', textAlign:'left', marginTop:'16px' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                    <thead><tr style={{ background:T.subtle }}>{['#','Date','Session','Status'].map(h=><th key={h} style={{ padding:'11px 14px', textAlign:'left', fontWeight:'600', color:T.muted, fontSize:'11px', textTransform:'uppercase', letterSpacing:'.05em', borderBottom:`1px solid ${T.border}` }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {myTable.columns.map((col:string,i:number)=>{
                        const [d,s]=col.split('_'); const val=myRow?myRow[col]:'–'
                        return <tr key={col} style={{ borderBottom:`1px solid ${T.border}` }}>
                          <td style={{ padding:'11px 14px', color:T.muted }}>{i+1}</td>
                          <td style={{ padding:'11px 14px', color:T.text, fontWeight:'500' }}>{d}</td>
                          <td style={{ padding:'11px 14px' }}><span style={{ background:dark?`rgba(13,148,136,.2)`:'#F0FDFA', color:TEAL, padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'700' }}>{s}</span></td>
                          <td style={{ padding:'11px 14px' }}><span style={{ display:'inline-block', padding:'4px 14px', borderRadius:'20px', fontSize:'12px', fontWeight:'700', background:val==='P'?dark?'rgba(5,150,105,.2)':'#DCFCE7':val==='A'?dark?'rgba(220,38,38,.2)':'#FEE2E2':T.subtle, color:val==='P'?'#059669':val==='A'?'#EF4444':T.muted }}>{val==='P'?'✓ Present':val==='A'?'✕ Absent':'–'}</span></td>
                        </tr>
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}