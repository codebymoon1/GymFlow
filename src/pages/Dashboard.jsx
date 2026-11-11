import { useMemo } from 'react'
import {
  Users,
  UserCheck,
  Wallet,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useMembers } from '../context/MemberContext.jsx'
import { useFinancial } from '../context/FinancialContext.jsx'

const ATTENDANCE_KEY = 'gymflow_attendance'
const SETTINGS_KEY = 'gymflow_settings'

function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function readCurrency() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')?.gym?.currency || 'PKR'
  } catch {
    return 'PKR'
  }
}

function getLocalDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function currencyFormatter(code) {
  try {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    })
  } catch {
    return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 })
  }
}

function StatCard({ title, value, icon: Icon, note }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{title}</p>
        <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
          <Icon size={21} />
        </div>
      </div>
      <h2 className="mt-5 text-2xl font-bold text-slate-900">{value}</h2>
      <p className="mt-2 text-sm text-slate-400">{note}</p>
    </div>
  )
}

export default function Dashboard({ navbarSearch = '' }) {
  const { members } = useMembers()
  const { transactions } = useFinancial()
  const attendance = useMemo(() => readArray(ATTENDANCE_KEY), [])
  const formatter = useMemo(() => currencyFormatter(readCurrency()), [])
  const today = getLocalDate()

  const activeMembers = members.filter(
    (member) => !member.expiry || member.expiry >= today
  )
  const todayAttendance = new Set(
    attendance
      .filter((entry) => entry.date === today && entry.status === 'Present')
      .map((entry) => String(entry.memberId))
  ).size
  const outstandingDues = members.reduce(
    (total, member) => total + Math.max(0, Number(member.fee || 0) - Number(member.paid || 0)),
    0
  )
  const activeTransactions = transactions.filter((item) => !item.reversed)
  const totalRevenue = activeTransactions
    .filter((item) => item.type === 'income')
    .reduce((total, item) => total + Number(item.amount || 0), 0)
  const totalExpenses = activeTransactions
    .filter((item) => item.type === 'expense')
    .reduce((total, item) => total + Number(item.amount || 0), 0)

  const revenueData = useMemo(() => {
    const current = new Date()
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(current.getFullYear(), current.getMonth() - (5 - index), 1)
      return {
        key: monthKey(date),
        month: date.toLocaleDateString('en', { month: 'short' }),
        revenue: 0,
      }
    })
    const totals = new Map(months.map((item) => [item.key, item]))

    activeTransactions.forEach((transaction) => {
      if (transaction.type !== 'income' || !transaction.date) return
      const bucket = totals.get(transaction.date.slice(0, 7))
      if (bucket) bucket.revenue += Number(transaction.amount || 0)
    })

    return months
  }, [activeTransactions])

  const hasRevenue = revenueData.some((item) => item.revenue > 0)
  const cards = [
    { title: 'Total Members', value: members.length.toLocaleString(), icon: Users, note: 'All member records' },
    { title: 'Active Memberships', value: activeMembers.length.toLocaleString(), icon: UserCheck, note: 'Not past the expiry date' },
    { title: 'Revenue', value: formatter.format(totalRevenue), icon: TrendingUp, note: 'Recorded income, excluding reversals' },
    { title: 'Expenses', value: formatter.format(totalExpenses), icon: TrendingDown, note: 'Recorded expenses, excluding reversals' },
    { title: 'Outstanding Dues', value: formatter.format(outstandingDues), icon: CircleDollarSign, note: 'Unpaid membership balances' },
    { title: "Today's Attendance", value: todayAttendance.toLocaleString(), icon: Wallet, note: 'Members marked present today' },
  ].filter((card) => `${card.title} ${card.note}`.toLowerCase().includes(navbarSearch.toLowerCase()))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="mt-1 text-sm text-slate-500">Monitor your gym's current activity.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => <StatCard key={card.title} {...card} />)}
        {cards.length === 0 && <p className="text-sm text-slate-500">No dashboard items match your search.</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">Revenue Overview</h3>
        <p className="mb-6 text-sm text-slate-400">Recorded income over the last six months</p>
        {hasRevenue ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatter.format(value)} />
                <Tooltip formatter={(value) => formatter.format(Number(value))} />
                <Area type="monotone" dataKey="revenue" stroke="#059669" fill="url(#revenueFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
            No income has been recorded in the last six months.
          </div>
        )}
      </div>
    </div>
  )
}
