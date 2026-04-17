import { ReactNode, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { QrCode, LogOut, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem { value: string; label: string; icon: ReactNode }
interface Props {
  navItems: NavItem[]
  activeTab: string
  onTabChange: (v: string) => void
  children: ReactNode
}

export default function DashboardLayout({ navItems, activeTab, onTabChange, children }: Props) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobile] = useState(false)

  const handleLogout = () => { logout(); navigate('/', { replace: true }) }

  const Sidebar = () => (
    <>
      {/* logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10 shrink-0">
        <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center shrink-0">
          <QrCode className="w-4 h-4 text-white" />
        </div>
        <span className="font-display text-[17px] font-bold text-white">Smart Attend</span>
      </div>

      {/* user pill */}
      <div className="mx-3 mt-4 mb-2 px-3 py-2.5 bg-white/5 rounded-xl border border-white/10">
        <p className="text-[10px] text-white/40 font-semibold uppercase tracking-widest">Signed in as</p>
        <p className="text-sm text-white font-semibold mt-0.5 truncate">{user?.name || user?.email}</p>
        <span className="text-[10px] font-mono text-brand/70 uppercase tracking-widest">{user?.role}</span>
      </div>

      {/* nav */}
      <nav className="flex-1 px-2 py-2 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map(item => (
          <button key={item.value}
            onClick={() => { onTabChange(item.value); setMobile(false) }}
            className={cn('nav-link w-full text-left', activeTab === item.value && 'active')}>
            {item.icon}{item.label}
          </button>
        ))}
      </nav>

      {/* logout */}
      <div className="p-3 border-t border-white/10 shrink-0">
        <button onClick={handleLogout}
          className="nav-link w-full text-red-400/80 hover:text-red-400 hover:!bg-red-500/10">
          <LogOut className="w-4 h-4" />Logout
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* desktop sidebar */}
      <aside className="sidebar hidden md:flex flex-col"><Sidebar /></aside>

      {/* mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobile(false)} />
          <aside className="absolute left-0 top-0 h-full w-60 bg-navy-900 flex flex-col z-50 animate-slide-r">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* sticky header */}
      <header className="fixed top-0 right-0 z-20 h-[60px] flex items-center px-5 gap-4
                          bg-white/95 backdrop-blur border-b border-gray-200 shadow-sm
                          md:left-[var(--sw)] left-0">
        <button className="md:hidden p-1.5 rounded-lg hover:bg-gray-100"
          onClick={() => setMobile(o => !o)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <span className="font-display text-base font-bold text-gray-800 hidden md:block">
          {navItems.find(n => n.value === activeTab)?.label || 'Dashboard'}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-gray-400 hidden sm:block">
            {new Date().toLocaleDateString('en-IN',{ weekday:'short', day:'numeric', month:'short' })}
          </span>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-semibold text-red-500
                       hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
            <LogOut className="w-3.5 h-3.5" /><span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* main */}
      <main className="page-body"><div className="page-inner">{children}</div></main>
    </div>
  )
}