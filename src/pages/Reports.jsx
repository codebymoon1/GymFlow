
import { useCallback, useMemo, useState } from 'react'
import {
  BarChart3,
  Users,
  UserCheck,
  UserX,
  Wallet,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Download,
  CreditCard,
  Receipt,
  Printer,
  Search,
  Activity,
  Clock,
  CircleDollarSign,
} from 'lucide-react'

import { useMembers } from '../context/MemberContext'
import { useFinancial } from '../context/FinancialContext'

const currency = (amount) =>
  `Rs ${Number(amount || 0).toLocaleString('en-PK')}`

const getDate = (value) => {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatDate = (value) => {
  const date = getDate(value)
  return date ? date.toLocaleDateString() : '—'
}

const getTransactionDate = (transaction) =>
  transaction.date || transaction.createdAt

const getAttendance = () => {
  try {
    return JSON.parse(localStorage.getItem('gymflow_attendance') || '[]')
  } catch {
    return []
  }
}

export default function Reports({ navbarSearch = '' }) {
  const { members } = useMembers()
  const { wallets, transactions } = useFinancial()

  const [period, setPeriod] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  const attendanceRecords = useMemo(() => getAttendance(), [])

  const dateRange = useMemo(() => {
    const today = new Date()
    const end = endDate ? new Date(`${endDate}T23:59:59`) : today
    let start = startDate ? new Date(`${startDate}T00:00:00`) : null

    if (!start && period !== 'all') {
      start = new Date()

      if (period === 'week') start.setDate(start.getDate() - 6)
      if (period === 'month') start.setDate(1)
      if (period === 'year') start.setMonth(0, 1)

      start.setHours(0, 0, 0, 0)
    }

    return { start, end }
  }, [period, startDate, endDate])

  const inRange = useCallback((value) => {
    const date = getDate(value)
    if (!date) return false

    if (dateRange.start && date < dateRange.start) return false
    if (date > dateRange.end) return false

    return true
  }, [dateRange])

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        if (transaction.reversed) return false
        const searchable = `${transaction.title || ''} ${transaction.reference || ''} ${transaction.wallet || ''} ${transaction.type || ''} ${transaction.paymentMethod || ''} ${transaction.date || ''}`.toLowerCase()
        return inRange(getTransactionDate(transaction)) && searchable.includes(navbarSearch.toLowerCase())
      }),
    [transactions, inRange, navbarSearch]
  )

  const filteredAttendance = useMemo(
    () =>
      attendanceRecords.filter((record) => {
        const searchable = `${record.name || ''} ${record.rollNo || ''} ${record.shift || ''} ${record.status || ''} ${record.date || ''}`.toLowerCase()
        return inRange(record.date || record.createdAt || record.checkIn) && searchable.includes(navbarSearch.toLowerCase())
      }),
    [attendanceRecords, inRange, navbarSearch]
  )

  const filteredMembers = useMemo(
    () =>
      members.filter((member) => {
        const searchable = `${member.name || ''} ${member.rollNo || ''} ${member.phone || ''} ${member.plan || ''} ${member.status || ''}`.toLowerCase()
        const matchesPeriod = !member.createdAt
          ? period === 'all' && !startDate && !endDate
          : inRange(member.createdAt)
        return matchesPeriod && searchable.includes(navbarSearch.toLowerCase())
      }),
    [members, inRange, period, startDate, endDate, navbarSearch]
  )

  const incomeTransactions = filteredTransactions.filter(
    (transaction) => transaction.type === 'income'
  )

  const expenseTransactions = filteredTransactions.filter(
    (transaction) => transaction.type === 'expense'
  )

  const totalIncome = incomeTransactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount || 0),
    0
  )

  const totalExpenses = expenseTransactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount || 0),
    0
  )

  const netIncome = totalIncome - totalExpenses

  const walletBalance = wallets.reduce(
    (sum, wallet) => sum + Number(wallet.balance || 0),
    0
  )

  const activeMembers = members.filter(
    (member) => member.status === 'Active'
  )

  const expiredMembers = members.filter(
    (member) => member.status === 'Expired'
  )

  const totalFees = members.reduce(
    (sum, member) => sum + Number(member.fee || 0),
    0
  )

  const totalPaid = members.reduce(
    (sum, member) => sum + Number(member.paid || 0),
    0
  )

  const totalDue = members.reduce(
    (sum, member) =>
      sum +
      Math.max(
        0,
        Number(member.fee || 0) - Number(member.paid || 0)
      ),
    0
  )

  const presentRecords = filteredAttendance.filter(
    (record) => String(record.status).toLowerCase() === 'present'
  )

  const absentRecords = filteredAttendance.filter(
    (record) => String(record.status).toLowerCase() === 'absent'
  )

  const attendanceRate =
    filteredAttendance.length > 0
      ? Math.round(
          (presentRecords.length / filteredAttendance.length) * 100
        )
      : 0

  const planBreakdown = Object.entries(
    members.reduce((result, member) => {
      const plan = member.plan || 'Unspecified'
      result[plan] = (result[plan] || 0) + 1
      return result
    }, {})
  )

  const walletBreakdown = wallets.map((wallet) => ({
    ...wallet,
    percentage:
      walletBalance > 0
        ? Math.round((Number(wallet.balance || 0) / walletBalance) * 100)
        : 0,
  }))

  const monthlyIncome = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date()
      date.setDate(1)
      date.setMonth(date.getMonth() - (5 - index))

      const year = date.getFullYear()
      const month = date.getMonth()

      const monthTransactions = transactions.filter((transaction) => {
        if (transaction.reversed) return false
        const transactionDate = getDate(getTransactionDate(transaction))

        return (
          transactionDate &&
          transactionDate.getFullYear() === year &&
          transactionDate.getMonth() === month
        )
      })

      const income = monthTransactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)

      const expenses = monthTransactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)

      return {
        label: date.toLocaleDateString('en', { month: 'short' }),
        income,
        expenses,
      }
    })
  }, [transactions])

  const maxMonthlyValue = Math.max(
    1,
    ...monthlyIncome.map((item) => Math.max(item.income, item.expenses))
  )

  const searchedTransactions = filteredTransactions.filter((transaction) => {
    if (!search) return true

    const query = search.toLowerCase()

    return (
      String(transaction.title || '').toLowerCase().includes(query) ||
      String(transaction.reference || '').toLowerCase().includes(query) ||
      String(transaction.wallet || '').toLowerCase().includes(query)
    ) && (
      !navbarSearch ||
      `${transaction.title || ''} ${transaction.reference || ''} ${transaction.wallet || ''} ${transaction.type || ''} ${transaction.paymentMethod || ''} ${transaction.date || ''}`.toLowerCase().includes(navbarSearch.toLowerCase())
    )
  })

  const exportCSV = (filename, rows) => {
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n')

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = filename
    link.click()

    URL.revokeObjectURL(url)
  }

  const exportFullReport = () => {
    const rows = [
      ['GYMFLOW BUSINESS REPORT'],
      ['Generated', new Date().toLocaleString()],
      ['Selected Period', period],
      [],
      ['MEMBERSHIP'],
      ['Total Members', members.length],
      ['Active Members', activeMembers.length],
      ['Expired Members', expiredMembers.length],
      ['Total Membership Fees', totalFees],
      ['Total Collected', totalPaid],
      ['Outstanding Dues', totalDue],
      [],
      ['ATTENDANCE'],
      ['Present Records', presentRecords.length],
      ['Absent Records', absentRecords.length],
      ['Attendance Rate', `${attendanceRate}%`],
      [],
      ['FINANCIAL'],
      ['Income', totalIncome],
      ['Expenses', totalExpenses],
      ['Net Income', netIncome],
      ['Current Wallet Balance', walletBalance],
      [],
      ['TRANSACTIONS'],
      ['Date', 'Reference', 'Type', 'Title', 'Wallet', 'Amount'],
      ...filteredTransactions.map((transaction) => [
        getTransactionDate(transaction),
        transaction.reference,
        transaction.type,
        transaction.title,
        transaction.wallet,
        transaction.amount,
      ]),
    ]

    exportCSV('gymflow-full-report.csv', rows)
  }

  const StatCard = ({ label, value, icon: Icon, color, note }) => (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <h3 className="mt-2 text-2xl font-bold text-gray-900">{value}</h3>
          {note && <p className="mt-1 text-xs text-gray-400">{note}</p>}
        </div>
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  )

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'members', label: 'Membership' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'finance', label: 'Finance' },
    { id: 'transactions', label: 'Transactions' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">
            Complete insights into your gym's performance.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Printer size={17} />
            Print
          </button>

          <button
            onClick={exportFullReport}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Download size={17} />
            Export Full Report
          </button>
        </div>
      </div>

      {/* Date filters */}
      <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Report Filters</h2>
          <p className="mt-1 text-sm text-gray-500">
            Select a reporting period or enter custom dates.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              Quick period
            </label>
            <select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value)
                setStartDate('')
                setEndDate('')
              }}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none"
            >
              <option value="all">All Time</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPeriod('all')
              }}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">
              To
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPeriod('all')
              }}
              className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
            />
          </div>

          <button
            onClick={() => {
              setPeriod('all')
              setStartDate('')
              setEndDate('')
            }}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-gray-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Members"
              value={members.length}
              icon={Users}
              color="bg-blue-50 text-blue-600"
            />
            <StatCard
              label="Active Members"
              value={activeMembers.length}
              icon={UserCheck}
              color="bg-green-50 text-green-600"
            />
            <StatCard
              label="Total Income"
              value={currency(totalIncome)}
              icon={TrendingUp}
              color="bg-green-50 text-green-600"
            />
            <StatCard
              label="Net Income"
              value={currency(netIncome)}
              icon={CircleDollarSign}
              color="bg-purple-50 text-purple-600"
            />
            <StatCard
              label="Total Expenses"
              value={currency(totalExpenses)}
              icon={TrendingDown}
              color="bg-red-50 text-red-600"
            />
            <StatCard
              label="Outstanding Dues"
              value={currency(totalDue)}
              icon={CreditCard}
              color="bg-orange-50 text-orange-600"
            />
            <StatCard
              label="Wallet Balance"
              value={currency(walletBalance)}
              icon={Wallet}
              color="bg-indigo-50 text-indigo-600"
            />
            <StatCard
              label="Attendance Rate"
              value={`${attendanceRate}%`}
              icon={Activity}
              color="bg-cyan-50 text-cyan-600"
            />
          </div>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="font-bold text-gray-900">Six-Month Financial Trend</h2>
              <p className="text-sm text-gray-500">
                Income and expenses based on recorded transactions.
              </p>
            </div>

            <div className="space-y-5">
              {monthlyIncome.map((month) => (
                <div key={month.label}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">
                      {month.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {currency(month.income)} income
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{
                          width: `${(month.income / maxMonthlyValue) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-red-400"
                        style={{
                          width: `${(month.expenses / maxMonthlyValue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <p className="mt-1 text-right text-xs text-gray-400">
                    {currency(month.expenses)} expenses
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-5 text-xs text-gray-500">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Income
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                Expenses
              </span>
            </div>
          </section>
        </>
      )}

      {/* Membership */}
      {activeTab === 'members' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Active"
              value={activeMembers.length}
              icon={UserCheck}
              color="bg-green-50 text-green-600"
            />
            <StatCard
              label="Expired"
              value={expiredMembers.length}
              icon={Clock}
              color="bg-red-50 text-red-600"
            />
            <StatCard
              label="New Members in Period"
              value={filteredMembers.length}
              icon={Users}
              color="bg-blue-50 text-blue-600"
            />
          </div>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 font-bold text-gray-900">Membership Plan Distribution</h2>

            {planBreakdown.length === 0 ? (
              <p className="text-sm text-gray-500">No membership data available.</p>
            ) : (
              <div className="space-y-5">
                {planBreakdown.map(([plan, count]) => (
                  <div key={plan}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-gray-600">{plan}</span>
                      <strong>{count} members</strong>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{
                          width: `${(count / Math.max(members.length, 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Membership Financial Summary</h2>
                <p className="text-sm text-gray-500">Current member fee records</p>
              </div>
              <CreditCard className="text-blue-600" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Total Fees</p>
                <p className="mt-2 text-xl font-bold">{currency(totalFees)}</p>
              </div>
              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-sm text-green-700">Collected</p>
                <p className="mt-2 text-xl font-bold text-green-700">
                  {currency(totalPaid)}
                </p>
              </div>
              <div className="rounded-xl bg-orange-50 p-4">
                <p className="text-sm text-orange-700">Outstanding</p>
                <p className="mt-2 text-xl font-bold text-orange-700">
                  {currency(totalDue)}
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Attendance */}
      {activeTab === 'attendance' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Present Records"
              value={presentRecords.length}
              icon={UserCheck}
              color="bg-green-50 text-green-600"
            />
            <StatCard
              label="Absent Records"
              value={absentRecords.length}
              icon={UserX}
              color="bg-red-50 text-red-600"
            />
            <StatCard
              label="Attendance Rate"
              value={`${attendanceRate}%`}
              icon={Activity}
              color="bg-blue-50 text-blue-600"
            />
          </div>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Attendance Summary</h2>
                <p className="text-sm text-gray-500">
                  Based on attendance records in the selected period.
                </p>
              </div>
              <CalendarDays className="text-blue-600" />
            </div>

            <div className="h-4 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-green-500"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>

            <p className="mt-3 text-sm text-gray-500">
              {presentRecords.length} present out of {filteredAttendance.length} recorded entries.
            </p>
          </section>

          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-5">
              <h2 className="font-bold text-gray-900">Attendance Records</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Member</th>
                    <th className="px-5 py-3">Roll No.</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAttendance.map((record, index) => (
                    <tr key={record.id || index}>
                      <td className="px-5 py-3 font-medium text-gray-800">
                        {record.memberName || record.name || 'Member'}
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {record.rollNo || '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {formatDate(record.date || record.createdAt || record.checkIn)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            record.status === 'present'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {record.status || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredAttendance.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-5 py-10 text-center text-gray-400">
                        No attendance records found for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Finance */}
      {activeTab === 'finance' && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Income"
              value={currency(totalIncome)}
              icon={TrendingUp}
              color="bg-green-50 text-green-600"
            />
            <StatCard
              label="Expenses"
              value={currency(totalExpenses)}
              icon={TrendingDown}
              color="bg-red-50 text-red-600"
            />
            <StatCard
              label="Net Income"
              value={currency(netIncome)}
              icon={CircleDollarSign}
              color="bg-blue-50 text-blue-600"
            />
            <StatCard
              label="Current Wallet Balance"
              value={currency(walletBalance)}
              icon={Wallet}
              color="bg-purple-50 text-purple-600"
            />
          </div>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-5 font-bold text-gray-900">Wallet Breakdown</h2>

            <div className="space-y-5">
              {walletBreakdown.map((wallet) => (
                <div key={wallet.id}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{wallet.name}</span>
                    <strong>{currency(wallet.balance)}</strong>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${wallet.percentage}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {wallet.type} · {wallet.active ? 'Active' : 'Inactive'} · {wallet.percentage}%
                  </p>
                </div>
              ))}

              {wallets.length === 0 && (
                <p className="text-sm text-gray-500">No wallets available.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-bold text-gray-900">Financial Position</h2>

            <div className="space-y-3">
              <div className="flex justify-between rounded-xl bg-green-50 p-4">
                <span className="text-sm text-green-800">Recorded Income</span>
                <strong className="text-green-700">{currency(totalIncome)}</strong>
              </div>
              <div className="flex justify-between rounded-xl bg-red-50 p-4">
                <span className="text-sm text-red-800">Recorded Expenses</span>
                <strong className="text-red-700">{currency(totalExpenses)}</strong>
              </div>
              <div className="flex justify-between rounded-xl bg-gray-50 p-4">
                <span className="text-sm font-semibold text-gray-700">Net Transaction Total</span>
                <strong className={netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {currency(netIncome)}
                </strong>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Transactions */}
      {activeTab === 'transactions' && (
        <>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold text-gray-900">Transaction History</h2>
              <p className="text-sm text-gray-500">
                {searchedTransactions.length} transactions in selected period.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transactions..."
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none sm:w-64"
              />
            </div>
          </div>

          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Reference</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3">Wallet</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {searchedTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="whitespace-nowrap px-5 py-3 text-gray-500">
                        {formatDate(getTransactionDate(transaction))}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-700">
                        {transaction.reference || '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {transaction.title || 'Transaction'}
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {transaction.wallet || '—'}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            transaction.type === 'income'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-semibold text-gray-800">
                        {currency(transaction.amount)}
                      </td>
                    </tr>
                  ))}

                  {searchedTransactions.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-5 py-10 text-center text-gray-400">
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <button
            onClick={() =>
              exportCSV('gymflow-transactions.csv', [
                ['Date', 'Reference', 'Title', 'Type', 'Wallet', 'Amount', 'Payment Method'],
                ...searchedTransactions.map((transaction) => [
                  getTransactionDate(transaction),
                  transaction.reference,
                  transaction.title,
                  transaction.type,
                  transaction.wallet,
                  transaction.amount,
                  transaction.paymentMethod,
                ]),
              ])
            }
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Download size={17} />
            Export Transactions
          </button>
        </>
      )}
    </div>
  )
}
