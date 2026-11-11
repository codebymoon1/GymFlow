
import { useMemo, useState } from 'react'
import {
  Wallet,
  Plus,
  Search,
  Download,
  Receipt,
  TrendingDown,
  CalendarDays,
  Filter,
  Eye,
  Pencil,
  XCircle,
  X,
  Save,
  RotateCcw,
} from 'lucide-react'
import { useFinancial } from '../context/FinancialContext.jsx'

const categories = [
  'Rent',
  'Salaries',
  'Utilities',
  'Equipment',
  'Maintenance',
  'Cleaning',
  'Marketing',
  'Supplies',
  'Other',
]

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem('gymflow_settings') || '{}')
  } catch {
    return {}
  }
}

const today = new Date().toISOString().slice(0, 10)

const emptyForm = {
  title: '',
  category: 'Other',
  wallet: '',
  amount: '',
  paymentMethod: 'Cash',
  date: today,
  time: new Date().toTimeString().slice(0, 5),
  notes: '',
}

const money = (amount) => {
  const code = readSettings()?.gym?.currency || 'PKR'
  try {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency', currency: code, maximumFractionDigits: 0,
    }).format(Number(amount || 0))
  } catch {
    return `${code} ${Number(amount || 0).toLocaleString('en-PK')}`
  }
}

const formatDate = (date) => {
  if (!date) return '—'
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function Expenses({ navbarSearch = '' }) {
  const {
    wallets,
    transactions,
    addExpense,
    updateExpense,
    cancelExpense,
  } = useFinancial()

  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState(null)
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [walletFilter, setWalletFilter] = useState('All')
  const [methodFilter, setMethodFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('Active')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [saving, setSaving] = useState(false)

  const expenses = useMemo(
    () => transactions.filter((item) => item.type === 'expense'),
    [transactions]
  )

  const activeExpenses = expenses.filter((item) => !item.reversed)

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const matchesSearch = [
        item.title,
        item.reference,
        item.wallet,
        item.category,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase()) &&
        [item.title, item.reference, item.wallet, item.category, item.paymentMethod, item.notes, item.date]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(navbarSearch.toLowerCase())

      const matchesCategory =
        categoryFilter === 'All' || item.category === categoryFilter

      const matchesWallet =
        walletFilter === 'All' || item.wallet === walletFilter

      const matchesMethod =
        methodFilter === 'All' || item.paymentMethod === methodFilter

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && !item.reversed) ||
        (statusFilter === 'Cancelled' && item.reversed)

      const expenseDate = item.date || ''
      const matchesFrom = !dateFrom || expenseDate >= dateFrom
      const matchesTo = !dateTo || expenseDate <= dateTo

      return (
        matchesSearch &&
        matchesCategory &&
        matchesWallet &&
        matchesMethod &&
        matchesStatus &&
        matchesFrom &&
        matchesTo
      )
    })
  }, [
    expenses,
    search,
    navbarSearch,
    categoryFilter,
    walletFilter,
    methodFilter,
    statusFilter,
    dateFrom,
    dateTo,
  ])

  const totalExpenses = activeExpenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  )

  const monthExpenses = activeExpenses
    .filter((item) => (item.date || '').startsWith(today.slice(0, 7)))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const todayExpenses = activeExpenses
    .filter((item) => item.date === today)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)

  const categoryTotals = useMemo(() => {
    return categories
      .map((category) => ({
        category,
        total: activeExpenses
          .filter((item) => item.category === category)
          .reduce((sum, item) => sum + Number(item.amount || 0), 0),
      }))
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [activeExpenses])

  const monthlyTotals = useMemo(() => {
    const totals = {}

    activeExpenses.forEach((item) => {
      const month = (item.date || '').slice(0, 7)
      if (!month) return
      totals[month] = (totals[month] || 0) + Number(item.amount || 0)
    })

    return Object.entries(totals)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 6)
  }, [activeExpenses])

  const openNewExpense = () => {
    setEditingExpense(null)
    setForm({
      ...emptyForm,
      wallet: wallets.find((wallet) => wallet.active)?.name || '',
    })
    setShowForm(true)
  }

  const openEditExpense = (expense) => {
    if (expense.reversed) return

    setEditingExpense(expense)
    setForm({
      title: expense.title || '',
      category: expense.category || 'Other',
      wallet: expense.wallet || '',
      amount: String(expense.amount || ''),
      paymentMethod: expense.paymentMethod || 'Cash',
      date: expense.date || today,
      time: expense.time || '12:00',
      notes: expense.notes || '',
    })
    setShowForm(true)
    setSelectedExpense(null)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingExpense(null)
    setForm(emptyForm)
  }

  const handleSave = async (event) => {
    event.preventDefault()

    const amount = Number(form.amount)

    if (!form.title.trim()) {
      alert('Please enter an expense title.')
      return
    }

    if (!form.wallet) {
      alert('Please select a wallet.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Please enter a valid amount.')
      return
    }

    if (
      Array.isArray(readSettings()?.payments?.methods) &&
      !paymentMethods.includes(form.paymentMethod) &&
      editingExpense?.paymentMethod !== form.paymentMethod
    ) {
      alert('Select a payment method enabled in Settings.')
      return
    }

    const selectedWallet = wallets.find(
      (wallet) => wallet.name === form.wallet && wallet.active
    )

    if (!selectedWallet) {
      alert('Please select an active wallet.')
      return
    }

    const payload = {
      title: form.title.trim(),
      category: form.category,
      wallet: form.wallet,
      amount,
      paymentMethod: form.paymentMethod,
      date: form.date,
      time: form.time,
      notes: form.notes.trim(),
      source: 'expenses',
    }

    setSaving(true)

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, payload)
      } else {
        await addExpense(payload)
      }

      closeForm()
    } catch (error) {
      alert(error.message || 'Unable to save this expense.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelExpense = async (expense) => {
    if (expense.reversed) return

    const reason = window.prompt(
      `Why are you cancelling "${expense.title}"?`
    )

    if (reason === null) return

    if (!reason.trim()) {
      alert('Please provide a cancellation reason.')
      return
    }

    try {
      await cancelExpense(expense.id, reason.trim())
      setSelectedExpense(null)
    } catch (error) {
      alert(error.message || 'Unable to cancel this expense.')
    }
  }

  const exportCSV = () => {
    const headers = [
      'Reference',
      'Title',
      'Category',
      'Wallet',
      'Amount',
      'Payment Method',
      'Date',
      'Status',
      'Notes',
    ]

    const rows = filteredExpenses.map((item) => [
      item.reference || item.id,
      item.title,
      item.category,
      item.wallet,
      item.amount,
      item.paymentMethod,
      item.date,
      item.reversed ? 'Cancelled' : 'Active',
      item.notes || '',
    ])

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `gymflow-expenses-${today}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setSearch('')
    setCategoryFilter('All')
    setWalletFilter('All')
    setMethodFilter('All')
    setStatusFilter('Active')
    setDateFrom('')
    setDateTo('')
  }

  const activeWallets = wallets.filter((wallet) => wallet.active)
  const configuredMethods = readSettings()?.payments?.methods
  const paymentMethods = Array.isArray(configuredMethods)
    ? configuredMethods
    : ['Cash', 'JazzCash', 'EasyPaisa', 'Bank Transfer']

  return (
    <div className="space-y-6 p-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track gym spending and manage your financial records.
          </p>
        </div>

        <button
          onClick={openNewExpense}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          <Plus size={18} />
          Add Expense
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Expenses"
          value={money(totalExpenses)}
          icon={<TrendingDown size={20} />}
          color="red"
        />
        <SummaryCard
          title="This Month"
          value={money(monthExpenses)}
          icon={<CalendarDays size={20} />}
          color="blue"
        />
        <SummaryCard
          title="Today"
          value={money(todayExpenses)}
          icon={<Receipt size={20} />}
          color="orange"
        />
        <SummaryCard
          title="Active Records"
          value={activeExpenses.length}
          icon={<Wallet size={20} />}
          color="green"
        />
      </div>

      {/* REPORTS */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="font-bold text-gray-900">Expenses by Category</h2>
            <p className="mt-1 text-sm text-gray-500">
              Spending distribution across categories
            </p>
          </div>

          {categoryTotals.length === 0 ? (
            <EmptyMessage message="No expense data available yet." />
          ) : (
            <div className="space-y-4">
              {categoryTotals.map((item) => {
                const percentage =
                  totalExpenses > 0
                    ? (item.total / totalExpenses) * 100
                    : 0

                return (
                  <div key={item.category}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        {item.category}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {money(item.total)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="font-bold text-gray-900">Monthly Breakdown</h2>
            <p className="mt-1 text-sm text-gray-500">
              Your latest monthly spending
            </p>
          </div>

          {monthlyTotals.length === 0 ? (
            <EmptyMessage message="No monthly data available yet." />
          ) : (
            <div className="space-y-4">
              {monthlyTotals.map(([month, total]) => {
                const max = Math.max(...monthlyTotals.map((item) => item[1]))
                const percentage = max > 0 ? (total / max) * 100 : 0

                return (
                  <div key={month}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        {new Date(`${month}-01T00:00:00`).toLocaleDateString(
                          'en-PK',
                          { month: 'long', year: 'numeric' }
                        )}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {money(total)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* FILTERS */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <h2 className="font-bold text-gray-900">Expense Records</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={clearFilters}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <RotateCcw size={15} className="mr-1 inline" />
              Clear filters
            </button>

            <button
              onClick={exportCSV}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download size={15} className="mr-1 inline" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search expenses..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-green-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500"
          >
            <option value="All">All categories</option>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>

          <select
            value={walletFilter}
            onChange={(event) => setWalletFilter(event.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500"
          >
            <option value="All">All wallets</option>
            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.name}>
                {wallet.name}
              </option>
            ))}
          </select>

          <select
            value={methodFilter}
            onChange={(event) => setMethodFilter(event.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500"
          >
            <option value="All">All payment methods</option>
            {paymentMethods.map((method) => (
              <option key={method}>{method}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500"
          >
            <option value="Active">Active expenses</option>
            <option value="Cancelled">Cancelled expenses</option>
            <option value="All">All statuses</option>
          </select>

          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="min-w-0 w-1/2 rounded-xl border border-gray-200 px-2 py-2.5 text-sm outline-none focus:border-green-500"
              aria-label="From date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="min-w-0 w-1/2 rounded-xl border border-gray-200 px-2 py-2.5 text-sm outline-none focus:border-green-500"
              aria-label="To date"
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-3 font-semibold">Expense</th>
                <th className="px-3 py-3 font-semibold">Category</th>
                <th className="px-3 py-3 font-semibold">Wallet</th>
                <th className="px-3 py-3 font-semibold">Date</th>
                <th className="px-3 py-3 font-semibold">Amount</th>
                <th className="px-3 py-3 font-semibold">Status</th>
                <th className="px-3 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredExpenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="border-b border-gray-50 text-sm transition hover:bg-gray-50"
                >
                  <td className="px-3 py-4">
                    <p className="font-semibold text-gray-900">
                      {expense.title}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {expense.reference || `#${expense.id}`}
                    </p>
                  </td>

                  <td className="px-3 py-4 text-gray-600">
                    {expense.category || 'Other'}
                  </td>

                  <td className="px-3 py-4 text-gray-600">
                    {expense.wallet}
                  </td>

                  <td className="px-3 py-4 text-gray-600">
                    {formatDate(expense.date)}
                  </td>

                  <td className="px-3 py-4 font-semibold text-gray-900">
                    {money(expense.amount)}
                  </td>

                  <td className="px-3 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        expense.reversed
                          ? 'bg-red-50 text-red-600'
                          : 'bg-green-50 text-green-700'
                      }`}
                    >
                      {expense.reversed ? 'Cancelled' : 'Active'}
                    </span>
                  </td>

                  <td className="px-3 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSelectedExpense(expense)}
                        title="View details"
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                      >
                        <Eye size={16} />
                      </button>

                      {!expense.reversed && (
                        <>
                          <button
                            onClick={() => openEditExpense(expense)}
                            title="Edit expense"
                            className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                          >
                            <Pencil size={16} />
                          </button>

                          <button
                            onClick={() => handleCancelExpense(expense)}
                            title="Cancel expense"
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center">
                    <Receipt
                      size={30}
                      className="mx-auto mb-3 text-gray-300"
                    />
                    <p className="font-medium text-gray-600">
                      No expenses found
                    </p>
                    <p className="mt-1 text-sm text-gray-400">
                      Try changing your filters or add a new expense.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Showing {filteredExpenses.length} of {expenses.length} expense
          records.
        </p>
      </section>

      {/* ADD / EDIT MODAL */}
      {showForm && (
        <Modal onClose={closeForm}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                The selected wallet will be updated automatically.
              </p>
            </div>
            <button
              onClick={closeForm}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Expense title
              </label>
              <input
                required
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="e.g. Electricity bill"
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500"
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Amount (PKR)
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) =>
                    setForm({ ...form, amount: event.target.value })
                  }
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Pay from wallet
                </label>
                <select
                  required
                  value={form.wallet}
                  onChange={(event) =>
                    setForm({ ...form, wallet: event.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500"
                >
                  <option value="">Select wallet</option>
                  {activeWallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.name}>
                      {wallet.name} — {money(wallet.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Payment method
                </label>
                <select
                  value={form.paymentMethod}
                  onChange={(event) =>
                    setForm({ ...form, paymentMethod: event.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500"
                >
                  {!paymentMethods.includes(form.paymentMethod) && (
                    <option value={form.paymentMethod}>{form.paymentMethod} (existing)</option>
                  )}
                  {paymentMethods.map((method) => (
                    <option key={method}>{method}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Expense date
                </label>
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(event) =>
                    setForm({ ...form, date: event.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Time
                </label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(event) =>
                    setForm({ ...form, time: event.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Notes (optional)
              </label>
              <textarea
                rows="3"
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
                placeholder="Additional details..."
                className="w-full resize-none rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-500"
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                <Save size={16} />
                {saving
                  ? 'Saving...'
                  : editingExpense
                    ? 'Save Changes'
                    : 'Save Expense'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* EXPENSE DETAILS MODAL */}
      {selectedExpense && (
        <Modal onClose={() => setSelectedExpense(null)}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Expense Details
            </h2>
            <button
              onClick={() => setSelectedExpense(null)}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-5 rounded-2xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Expense amount</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {money(selectedExpense.amount)}
            </p>
            <span
              className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                selectedExpense.reversed
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {selectedExpense.reversed ? 'Cancelled' : 'Active'}
            </span>
          </div>

          <div className="space-y-3">
            <DetailRow label="Title" value={selectedExpense.title} />
            <DetailRow label="Reference" value={selectedExpense.reference || selectedExpense.id} />
            <DetailRow label="Category" value={selectedExpense.category} />
            <DetailRow label="Wallet" value={selectedExpense.wallet} />
            <DetailRow label="Payment method" value={selectedExpense.paymentMethod} />
            <DetailRow label="Date" value={formatDate(selectedExpense.date)} />
            <DetailRow label="Time" value={selectedExpense.time || '—'} />
            <DetailRow label="Notes" value={selectedExpense.notes || '—'} />
            {selectedExpense.cancelReason && (
              <DetailRow
                label="Cancellation reason"
                value={selectedExpense.cancelReason}
              />
            )}
          </div>

          {selectedExpense.history?.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-4">
              <h3 className="mb-3 font-bold text-gray-900">Activity History</h3>
              <div className="space-y-3">
                {selectedExpense.history.map((entry, index) => (
                  <div key={index} className="rounded-xl bg-gray-50 p-3">
                    <p className="text-sm font-semibold text-gray-800">
                      {entry.action || 'Updated'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {entry.date || entry.createdAt || ''}
                    </p>
                    {entry.reason && (
                      <p className="mt-1 text-sm text-gray-600">
                        {entry.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
            {!selectedExpense.reversed && (
              <>
                <button
                  onClick={() => openEditExpense(selectedExpense)}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                  <Pencil size={15} />
                  Edit
                </button>
                <button
                  onClick={() => handleCancelExpense(selectedExpense)}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <XCircle size={15} />
                  Cancel Expense
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

function SummaryCard({ title, value, icon, color }) {
  const colors = {
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`rounded-xl p-2.5 ${colors[color]}`}>{icon}</div>
      </div>
      <p className="mt-4 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function Modal({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        {children}
      </div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-gray-50 pb-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="max-w-[65%] break-words text-right font-medium text-gray-900">
        {value || '—'}
      </span>
    </div>
  )
}

function EmptyMessage({ message }) {
  return (
    <p className="py-8 text-center text-sm text-gray-400">{message}</p>
  )
}
