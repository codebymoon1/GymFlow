
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'

import Settings from './pages/Settings.jsx' 
import Reports from './pages/Reports.jsx'
import Expenses from './pages/Expenses.jsx' 
import Wallet from './pages/Wallet.jsx'
import Billing from './pages/Billing.jsx'
import Attendance from './pages/Attendance.jsx'
import Members from './pages/Members.jsx'
import Dashboard from './pages/Dashboard.jsx'

import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'

import { FinancialProvider } from './context/FinancialContext.jsx'
import { MemberProvider } from './context/MemberContext.jsx'

function NotFound() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-500">This GymFlow page does not exist.</p>
    </div>
  )
}

function WorkspaceLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [navbarSearch, setNavbarSearch] = useState('')
  const submitSearch = (value) => setNavbarSearch(value)

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-h-screen md:ml-64">
        <Header
          onMenuClick={() => setSidebarOpen((open) => !open)}
          onSearch={submitSearch}
        />
        <main className="p-4 sm:p-8">
          <Routes>
            <Route path="/" element={<Dashboard navbarSearch={navbarSearch} />} />
            <Route path="/members" element={<Members navbarSearch={navbarSearch} />} />
            <Route path="/attendance" element={<Attendance navbarSearch={navbarSearch} />} />
            <Route path="/billing" element={<Billing navbarSearch={navbarSearch} />} />
            <Route path="/wallet" element={<Wallet navbarSearch={navbarSearch} />} />
            <Route path="/expenses" element={<Expenses navbarSearch={navbarSearch} />} />
            <Route path="/reports" element={<Reports navbarSearch={navbarSearch} />} />
            <Route path="/settings" element={<Settings navbarSearch={navbarSearch} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function SearchableWorkspace() {
  const { pathname } = useLocation()
  return <WorkspaceLayout key={pathname} />
}

export default function App() {
  return (
    <BrowserRouter basename="/GymFlow">
      <FinancialProvider>
        <MemberProvider>
          <SearchableWorkspace />
        </MemberProvider>
      </FinancialProvider>
    </BrowserRouter>
  )
}
