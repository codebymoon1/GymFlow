
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  CreditCard,
  Wallet,
  BarChart3,
  Settings,
  Dumbbell,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const menuItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Members', path: '/members', icon: Users },
  { label: 'Attendance', path: '/attendance', icon: ClipboardCheck },
  { label: 'Billing & Payments', path: '/billing', icon: CreditCard },
  { label: 'Wallets', path: '/wallet', icon: Wallet },
  { label: 'Expenses', path: '/expenses', icon: Wallet },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
]

export default function Sidebar({ open = false, onClose = () => {} }) {
  const linkStyle = ({ isActive }) =>
    `flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
      isActive
        ? 'bg-emerald-50 text-emerald-700'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    }`

  return (
    <>
    {open && <button aria-label="Close navigation" onClick={onClose} className="fixed inset-0 z-30 bg-slate-900/30 md:hidden" />}
    <aside className={`fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-white transition-transform md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>

      {/* Logo */}
      <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <Dumbbell size={22} />
        </div>

        <div>
          <h1 className="font-bold text-slate-900">GymFlow</h1>
          <p className="text-xs text-slate-400">Management System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-4 py-6">
        <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Workspace
        </p>

        {menuItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={linkStyle}
              onClick={onClose}
            >
              <Icon size={19} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* Settings */}
      <div className="border-t border-slate-100 p-4">
        <NavLink to="/settings" className={linkStyle} onClick={onClose}>
          <Settings size={19} />
          Settings
        </NavLink>
      </div>
    </aside>
    </>
  )
}
