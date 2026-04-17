import { useEffect, useRef, useCallback } from 'react'
import { getCurrentToken, getAttendanceCount, stopSession } from '@/services/api'
import { StopCircle, RefreshCw, Users } from 'lucide-react'
import QRCode from 'qrcode'
import { useState } from 'react'

interface Props { sessionDate: string; sessionNumber: number; onStop: () => void }

export default function SessionStatus({ sessionDate, sessionNumber, onStop }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [count,    setCount]    = useState({ marked: 0, total: 0 })
  const [tokenStr, setTokenStr] = useState('')
  const [stopping, setStopping] = useState(false)

  const drawQR = useCallback(async () => {
    try {
      const d = await getCurrentToken()
      if (canvasRef.current && d.session_id && d.token) {
        await QRCode.toCanvas(canvasRef.current, JSON.stringify(d), {
          width: 230, margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
        })
        setTokenStr(d.token.slice(0, 10) + '…')
      }
    } catch {}
  }, [])

  const fetchCount = useCallback(async () => {
    try { const d = await getAttendanceCount(); setCount({ marked: d.marked, total: d.total }) } catch {}
  }, [])

  useEffect(() => {
    drawQR(); fetchCount()
    const qi = setInterval(drawQR,    15000)
    const ci = setInterval(fetchCount,  3000)
    return () => { clearInterval(qi); clearInterval(ci) }
  }, [drawQR, fetchCount])

  const handleStop = async () => {
    setStopping(true)
    try { await stopSession() } finally { setStopping(false); onStop() }
  }

  const pct = count.total ? Math.round(count.marked / count.total * 100) : 0

  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* QR */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="absolute -inset-2.5 rounded-2xl bg-brand/10 animate-pulse-soft" />
            <canvas ref={canvasRef}
              className="relative rounded-xl border-2 border-brand/20 shadow-md block" />
          </div>
          <div className="text-center">
            <p className="text-[11px] text-gray-400">Refreshes every 15 s</p>
            <p className="text-[11px] font-mono text-brand mt-0.5">Token: {tokenStr}</p>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge-green animate-pulse-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />ACTIVE
            </span>
            <span className="text-sm text-gray-500 font-medium">
              {sessionDate} — Session {sessionNumber}
            </span>
          </div>

          <div className="card p-4 bg-gray-50 border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Users className="w-4 h-4 text-brand" />Present
              </span>
              <span className="text-2xl font-display font-bold text-gray-800">
                {count.marked}<span className="text-base text-gray-400 font-normal"> / {count.total}</span>
              </span>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-brand rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }} />
            </div>
            <p className="text-right text-[11px] text-gray-400 mt-1">{pct}% marked</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={drawQR} className="btn-outline btn-sm flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />Refresh QR
            </button>
            <button onClick={handleStop} disabled={stopping} className="btn-danger btn-sm flex items-center gap-1.5">
              <StopCircle className="w-3.5 h-3.5" />
              {stopping ? 'Stopping…' : 'Stop Session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}