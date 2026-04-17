import { useState } from 'react'
import { deleteAttendance, deleteAttendanceSession, exportUrl } from '@/services/api'
import { Trash2, X, Download, AlertTriangle } from 'lucide-react'
import type { AttendanceRow } from '@/types'

type Action =
  | { kind: 'row';   studentId: number; label: string }
  | { kind: 'cell';  studentId: number; date: string; sess: number; label: string }
  | { kind: 'col';   date: string; sess: number; label: string }

interface Props {
  columns: string[]
  rows: AttendanceRow[]
  onRefresh: () => void
  showExport?: boolean
}

export default function AttendanceTable({ columns, rows, onRefresh, showExport = true }: Props) {
  const [action,   setAction]   = useState<Action | null>(null)
  const [deleting, setDeleting] = useState(false)

  const confirm = async () => {
    if (!action) return
    setDeleting(true)
    try {
      if (action.kind === 'row')  await deleteAttendance(action.studentId)
      if (action.kind === 'cell') await deleteAttendance(action.studentId, action.date, action.sess)
      if (action.kind === 'col')  await deleteAttendanceSession(action.date, action.sess)
      onRefresh()
    } catch (e: any) { alert(e.message) }
    finally { setDeleting(false); setAction(null) }
  }

  if (rows.length === 0) return (
    <div className="text-center py-14 text-gray-400">
      <p className="text-sm">No attendance records yet.</p>
      <p className="text-xs mt-1">Start a session to begin tracking.</p>
    </div>
  )

  return (
    <>
      {showExport && (
        <div className="flex justify-end mb-3">
          <a href={exportUrl()} className="btn-secondary btn-sm flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />Export Excel
          </a>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="dtable">
          <thead>
            <tr>
              <th>SL</th><th>Reg No.</th><th>Name</th>
              {columns.map(col => {
                const [date, s] = col.split('_')
                const sess = parseInt(s.replace('S', ''))
                return (
                  <th key={col}>
                    <div className="flex items-center gap-1.5">
                      <span>{date}</span>
                      <span className="badge-blue text-[10px]">{s}</span>
                      <button onClick={() => setAction({ kind:'col', date, sess, label:`${date} ${s}` })}
                        className="text-red-300 hover:text-red-500 transition-colors ml-0.5">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                )
              })}
              <th className="bg-red-800/80 text-red-100">Delete</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td className="text-gray-400 text-xs">{row.sl}</td>
                <td className="font-mono text-xs font-bold text-gray-700">{row.reg_no}</td>
                <td className="font-medium">{row.name}</td>
                {columns.map(col => {
                  const [date, s] = col.split('_')
                  const sess = parseInt(s.replace('S',''))
                  const val  = row[col] || '–'
                  return (
                    <td key={col} className={val==='P'?'bg-green-50':val==='A'?'bg-red-50':''}>
                      <div className="flex items-center gap-1">
                        <span className={`badge text-[11px] font-bold
                          ${val==='P'?'badge-green':val==='A'?'badge-red':'badge-gray'}`}>
                          {val}
                        </span>
                        {(val==='P'||val==='A') && (
                          <button
                            onClick={() => setAction({ kind:'cell', studentId:row.id, date, sess, label:`${row.reg_no} · ${date} ${s}` })}
                            className="text-gray-300 hover:text-red-500 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  )
                })}
                <td>
                  <button onClick={() => setAction({ kind:'row', studentId:row.id, label:row.name })}
                    className="btn-danger btn-sm flex items-center gap-1">
                    <Trash2 className="w-3 h-3" />All
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirm modal */}
      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAction(null)} />
          <div className="relative bg-white rounded-2xl shadow-modal p-6 w-full max-w-sm animate-slide-up">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-display font-bold text-gray-800">Confirm Delete</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Delete attendance for <strong>{action.label}</strong>? This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAction(null)} className="btn-ghost btn-sm">Cancel</button>
              <button onClick={confirm} disabled={deleting} className="btn-danger btn-sm">
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}