import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderGit2,
  Rocket,
  Settings,
  LogOut,
  Zap,
  ChevronRight,
  Cpu,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderGit2, label: 'Projects' },
  { to: '/deployments', icon: Rocket, label: 'Deployments', comingSoon: true },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

function NavItem({ to, icon: Icon, label, comingSoon }) {
  if (comingSoon) {
    return (
      <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-surface-300/70 cursor-not-allowed select-none">
        <Icon size={17} />
        <span className="text-sm font-medium flex-1">{label}</span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-700 text-surface-300 border border-surface-600">Soon</span>
      </div>
    )
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 group relative
         ${isActive
           ? 'bg-gradient-to-r from-brand-500/15 to-indigo-500/10 text-brand-300 border border-brand-500/30 shadow-sm'
           : 'text-surface-200 hover:bg-surface-700/60 hover:text-white border border-transparent'
         }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-400 rounded-r-full" />
          )}
          <Icon size={17} className={isActive ? 'text-brand-400' : 'text-surface-300 group-hover:text-surface-100'} />
          <span className="text-sm font-medium flex-1">{label}</span>
          <ChevronRight size={13} className={`transition-opacity ${isActive ? 'opacity-40' : 'opacity-0 group-hover:opacity-40'}`} />
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <aside className="w-64 shrink-0 h-screen flex flex-col bg-surface-800/95 backdrop-blur-md border-r border-surface-600/80">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-surface-600/70">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 via-indigo-600 to-brand-700 flex items-center justify-center shadow-md shadow-brand-500/20">
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-extrabold text-white tracking-tight leading-tight">DeployMate</p>
          <p className="text-[11px] text-surface-300 font-medium leading-tight">Cloud Studio AI</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* AI Engine Status Pill */}
      <div className="px-4 py-3 mx-3 mb-2 rounded-xl bg-surface-700/50 border border-surface-600/60">
        <div className="flex items-center gap-2 mb-1">
          <Cpu size={14} className="text-brand-400" />
          <span className="text-xs font-semibold text-white">AI Engine v2.0</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-surface-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Ollama + Gemini Ready</span>
        </div>
      </div>

      {/* User Footer */}
      <div className="px-3 py-4 border-t border-surface-600/70 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-700/40 border border-surface-600/40">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name || 'Engineer'}</p>
            <p className="text-xs text-surface-300 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-surface-300 hover:bg-rose-500/10 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-all duration-150 text-xs font-medium cursor-pointer"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
