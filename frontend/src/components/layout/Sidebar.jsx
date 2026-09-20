import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderGit2,
  Rocket,
  Settings,
  LogOut,
  Zap,
  ChevronRight,
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
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-surface-300 cursor-not-allowed select-none">
        <Icon size={17} />
        <span className="text-sm font-medium flex-1">{label}</span>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-600 text-surface-200">Soon</span>
      </div>
    )
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group
         ${isActive
           ? 'bg-brand-600/15 text-brand-300 border border-brand-600/25'
           : 'text-surface-200 hover:bg-surface-700 hover:text-white border border-transparent'
         }`
      }
    >
      <Icon size={17} />
      <span className="text-sm font-medium flex-1">{label}</span>
      <ChevronRight size={13} className="opacity-0 group-hover:opacity-50 transition-opacity" />
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
    : '?'

  return (
    <aside className="w-60 shrink-0 h-screen flex flex-col bg-surface-800 border-r border-surface-600">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-surface-600">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">DeployMate</p>
          <p className="text-[10px] text-surface-300 leading-tight">Studio</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-surface-600 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-xs font-bold text-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-surface-300 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-surface-200 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 text-sm"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
