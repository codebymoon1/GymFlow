
import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  Search,
  ChevronDown,
  Menu,
  User,
  Settings,
  X,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

const routeHeadings = {
  '/': ['Dashboard', "Welcome back! Here's your gym overview."],
  '/members': ['Members', 'Manage your gym members and memberships.'],
  '/attendance': ['Attendance', 'Review check-ins and daily attendance.'],
  '/billing': ['Billing & Payments', 'Manage membership payments and dues.'],
  '/wallet': ['Wallets', 'Review balances and financial transactions.'],
  '/expenses': ['Expenses', 'Track and manage gym expenses.'],
  '/reports': ['Reports', 'Review gym activity and financial summaries.'],
  '/settings': ['Settings', 'Configure your gym and application preferences.'],
}

export default function Header({
  onMenuClick = () => {},
  onSearch = () => {},
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const [searchDraft, setSearchDraft] = useState({ pathname, value: '' })
  const search = searchDraft.pathname === pathname ? searchDraft.value : ''
  const [openMenu, setOpenMenu] = useState(null)

  const notificationRef = useRef(null)
  const profileRef = useRef(null)

  const [title, subtitle] = routeHeadings[pathname] || [
    'GymFlow',
    'Manage your gym workspace.',
  ]


  function handleSearch(event) {
    setSearchDraft({ pathname, value: event.target.value })
  }

  function submitSearch(event) {
    event.preventDefault()
    onSearch(search.trim())
  }

  // Toggle dropdowns
  function toggleMenu(menu) {
    setOpenMenu((current) => current === menu ? null : menu)
  }

  // Close menus when clicking outside
  useEffect(() => {
    function handleOutsideClick(event) {
      const clickedNotification =
        notificationRef.current?.contains(event.target)

      const clickedProfile =
        profileRef.current?.contains(event.target)

      if (!clickedNotification && !clickedProfile) {
        setOpenMenu(null)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpenMenu(null)
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  function openSettings() {
    setOpenMenu(null)
    navigate('/settings')
  }

  return (
    <header className="relative z-40 flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">

      {/* Left: Page heading */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label="Open navigation"
        >
          <Menu size={21} />
        </button>

        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {title}
          </h2>

          <p className="text-sm text-slate-400">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Search and actions */}
      <div className="flex items-center gap-3 sm:gap-5">

        {/* Search */}
        <form onSubmit={submitSearch} className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 md:flex">
          <Search size={17} className="shrink-0 text-slate-400" />

          <input
            type="search"
            placeholder="Search..."
            value={search}
            onChange={handleSearch}
            className="w-36 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            aria-label="Search GymFlow"
          />

          {search && (
            <button
              type="button"
              onClick={() => {
                setSearchDraft({ pathname, value: '' })
                onSearch('')
              }}
              className="text-slate-400 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </form>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={() => toggleMenu('notifications')}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Notifications"
            aria-expanded={openMenu === 'notifications'}
          >
            <Bell size={21} />

            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </button>

          {openMenu === 'notifications' && (
            <div className="absolute right-0 top-full z-[100] mt-3 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">
                  Notifications
                </h3>

                <button
                  type="button"
                  onClick={() => setOpenMenu(null)}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label="Close notifications"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="py-5 text-center">
                <Bell
                  size={25}
                  className="mx-auto mb-2 text-slate-300"
                />

                <p className="text-sm font-medium text-slate-600">
                  No new notifications
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  You're all caught up!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => toggleMenu('profile')}
            className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-50"
            aria-expanded={openMenu === 'profile'}
            aria-label="Open profile menu"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
              G
            </div>

            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold text-slate-800">
                Gym Owner
              </p>

              <p className="text-xs text-slate-400">
                Administrator
              </p>
            </div>

            <ChevronDown
              size={16}
              className={`text-slate-500 transition-transform ${
                openMenu === 'profile' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openMenu === 'profile' && (
            <div className="absolute right-0 top-full z-[100] mt-3 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">

              <div className="border-b border-slate-100 p-4">
                <p className="font-semibold text-slate-800">
                  Gym Owner
                </p>

                <p className="text-xs text-slate-400">
                  Administrator
                </p>
              </div>

              <div className="p-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenu(null)
                    navigate('/settings')
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  <User size={17} />
                  Account
                </button>

                <button
                  type="button"
                  onClick={openSettings}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  <Settings size={17} />
                  Gym Settings
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </header>
  )
}
