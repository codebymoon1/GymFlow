
import { useMemo, useState } from 'react'
import {
  Plus,
  Search,
  Wallet,
  CreditCard,
  TrendingUp,
  Users,
  CalendarDays,
  Receipt,
  Download,
  Eye,
  X,
  Save,
  MessageCircle,
  Printer,
  RotateCcw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

import { useMembers } from '../context/MemberContext.jsx'
import { useFinancial } from '../context/FinancialContext.jsx'

const today = new Date().toISOString().slice(0, 10)

function getSettings() {
  try {
    return JSON.parse(localStorage.getItem('gymflow_settings') || '{}')
  } catch {
    return {}
  }
}

const money = (amount) => {
  const code = getSettings()?.gym?.currency || 'PKR'
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

function addPlanPeriod(date, plan) {
  const result = new Date(`${date || today}T00:00:00`)
  const originalDay = result.getDate()

  const configuredPlan = typeof plan === 'string'
    ? getSettings()?.plans?.find((item) => item.name === plan)
    : plan

  if (Number(configuredPlan?.duration) > 0) {
    result.setDate(result.getDate() + Number(configuredPlan.duration))
    return result.toISOString().slice(0, 10)
  }

  const months =
    plan === 'Quarterly'
      ? 3
      : plan === 'Half-Yearly'
        ? 6
        : plan === 'Yearly'
          ? 12
          : 1

  result.setDate(1)
  result.setMonth(result.getMonth() + months)

  const lastDay = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate()

  result.setDate(Math.min(originalDay, lastDay))

  return result.toISOString().slice(0, 10)
}

function getMemberStatus(member) {
  const fee = Number(member.fee || 0)
  const paid = Number(member.paid || 0)
  const remaining = Math.max(0, fee - paid)

  if (remaining <= 0 && fee > 0) return 'Paid'
  if (paid > 0) return 'Partial'
  return 'Unpaid'
}

function getRemaining(member) {
  return Math.max(
    0,
    Number(member.fee || 0) - Number(member.paid || 0)
  )
}

function getMemberDueDate(member) {
  return member.dueDate || member.expiry || today
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

export default function Billing({ navbarSearch = '' }) {
  // Shared member records from MemberContext.
  const { members, addMember, updateMember } = useMembers()

  // Shared wallets and financial transactions.
  const {
    wallets,
    setWallets,
    transactions,
    setTransactions,
  } = useFinancial()

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [selectedReceipt, setSelectedReceipt] = useState(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [periodFilter, setPeriodFilter] = useState('All')
  const [saving, setSaving] = useState(false)

  const [paymentForm, setPaymentForm] = useState({
    memberId: '',
    amount: '',
    method: 'Cash',
    wallet: '',
    date: today,
    notes: '',
  })

  const [memberForm, setMemberForm] = useState({
    name: '',
    rollNo: '',
    phone: '',
    gender: 'Male',
    fee: '',
    plan: 'Monthly',
    dueDate: today,
  })

  const activeWallets = wallets.filter((wallet) => wallet.active)
  const configuredMethods = getSettings()?.payments?.methods
  const paymentMethods = Array.isArray(configuredMethods)
    ? configuredMethods
    : ['Cash', 'JazzCash', 'EasyPaisa', 'Bank Transfer']
  const plans = Array.isArray(getSettings()?.plans)
    ? getSettings().plans.filter((plan) => plan.active !== false)
    : []

  const billingTransactions = transactions.filter(
    (transaction) =>
      transaction.type === 'income' &&
      transaction.source === 'billing'
  )

  // Summary calculations.
  const totalFees = members.reduce(
    (sum, member) => sum + Number(member.fee || 0),
    0
  )

  const totalCollected = members.reduce(
    (sum, member) => sum + Number(member.paid || 0),
    0
  )

  const totalDue = members.reduce(
    (sum, member) => sum + getRemaining(member),
    0
  )

  const paidMembers = members.filter(
    (member) => getMemberStatus(member) === 'Paid'
  ).length

  const unpaidMembers = members.filter(
    (member) => getMemberStatus(member) !== 'Paid'
  ).length

  const monthCollected = billingTransactions
    .filter((transaction) =>
      (transaction.date || '').startsWith(today.slice(0, 7))
    )
    .reduce(
      (sum, transaction) => sum + Number(transaction.amount || 0),
      0
    )

  // Member search and filters.
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch =
        `${member.name} ${member.rollNo} ${member.phone || ''}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        `${member.name} ${member.rollNo} ${member.phone || ''}`
          .toLowerCase()
          .includes(navbarSearch.toLowerCase())

      const status = getMemberStatus(member)
      const dueDate = getMemberDueDate(member)

      const matchesStatus =
        statusFilter === 'All' || status === statusFilter

      const matchesPeriod =
        periodFilter === 'All' ||
        (periodFilter === 'Overdue' &&
          dueDate < today &&
          getRemaining(member) > 0) ||
        (periodFilter === 'Due Today' &&
          dueDate === today &&
          getRemaining(member) > 0)

      return matchesSearch && matchesStatus && matchesPeriod
    })
  }, [members, search, navbarSearch, statusFilter, periodFilter])

  // Monthly payment report.
  const monthlyRevenue = useMemo(() => {
    const result = {}

    billingTransactions.forEach((transaction) => {
      const month = (transaction.date || '').slice(0, 7)
      if (!month) return

      result[month] =
        (result[month] || 0) + Number(transaction.amount || 0)
    })

    return Object.entries(result)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 6)
  }, [billingTransactions])

  // Open payment modal.
  const openPayment = (member) => {
    const preferredWallet =
      activeWallets.find((wallet) =>
        wallet.name.toLowerCase().includes('cash')
      ) || activeWallets[0]

    setSelectedMember(member)

    setPaymentForm({
      memberId: String(member.id),
      amount: String(getRemaining(member)),
      method: 'Cash',
      wallet: preferredWallet?.name || '',
      date: today,
      notes: '',
    })

    setShowPaymentModal(true)
  }

  const closePayment = () => {
    setShowPaymentModal(false)
    setSelectedMember(null)
  }

  // Record payment and update shared member + wallet data.
  const savePayment = (event) => {
    event.preventDefault()

    if (saving) return

    const member = members.find(
      (item) => String(item.id) === String(paymentForm.memberId)
    )

    const amount = Number(paymentForm.amount)

    if (!member) {
      alert('Member not found.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Enter a valid payment amount.')
      return
    }

    const settings = getSettings()
    const allowedMethods = settings?.payments?.methods
    if (Array.isArray(allowedMethods) && !allowedMethods.includes(paymentForm.method)) {
      alert('Select a payment method enabled in Settings.')
      return
    }

    if (settings?.payments?.allowPartialPayments === false && amount < getRemaining(member)) {
      alert('Settings require the full outstanding balance to be paid at once.')
      return
    }

    if (settings?.payments?.requirePaymentNotes && !paymentForm.notes.trim()) {
      alert('Add a note before recording this payment.')
      return
    }

    const remaining = getRemaining(member)

    if (amount > remaining) {
      alert(`Outstanding balance is only ${money(remaining)}.`)
      return
    }

    const wallet = activeWallets.find(
      (item) => item.name === paymentForm.wallet
    )

    if (!wallet) {
      alert('Select an active wallet.')
      return
    }

    if (!paymentForm.date) {
      alert('Select a payment date.')
      return
    }

    setSaving(true)

    try {
      const paymentId = `PAY-${Date.now()}`
      const referencePrefix = getSettings()?.payments?.receiptPrefix || 'GF'
      const reference = `${referencePrefix}-PAY-${Date.now().toString().slice(-8)}`

      const payment = {
        id: paymentId,
        reference,
        memberId: member.id,
        rollNo: member.rollNo,
        memberName: member.name,
        title: `Membership Payment - ${member.name}`,
        amount,
        method: paymentForm.method,
        paymentMethod: paymentForm.method,
        wallet: wallet.name,
        date: paymentForm.date,
        time: new Date().toTimeString().slice(0, 5),
        notes: paymentForm.notes.trim(),
        createdAt: new Date().toISOString(),
      }

      const newPaid = Number(member.paid || 0) + amount
      const fullyPaid = newPaid >= Number(member.fee || 0)

      const currentDueDate = getMemberDueDate(member)

      const newDueDate = fullyPaid
        ? addPlanPeriod(
            currentDueDate < today ? today : currentDueDate,
            member.plan || 'Monthly'
          )
        : currentDueDate

      // 1. Credit the selected wallet.
      setWallets((current) =>
        current.map((item) =>
          item.id === wallet.id
            ? {
                ...item,
                balance: Number(item.balance || 0) + amount,
              }
            : item
        )
      )

      // 2. Add payment to shared financial transaction history.
      setTransactions((current) => [
        {
          ...payment,
          type: 'income',
          source: 'billing',
          category: 'Membership',
          reversed: false,
          history: [],
        },
        ...current,
      ])

      // 3. Update the shared member record.
      // Members, Attendance and Billing will now use the same record.
      updateMember(member.id, {
        paid: newPaid,
        dueDate: newDueDate,
        expiry: newDueDate,
        status: 'Active',
        payments: [...(member.payments || []), payment],
      })

      setSelectedReceipt(payment)
      closePayment()
    } catch (error) {
      alert(error.message || 'Unable to record payment.')
    } finally {
      setSaving(false)
    }
  }

  // Add a member directly to the shared MemberContext.
  const openAddMember = () => {
    const defaultPlan = plans[0]
    setMemberForm({
      name: '',
      rollNo: `GF-${Date.now().toString().slice(-4)}`,
      phone: '',
      gender: 'Male',
      fee: defaultPlan ? String(defaultPlan.fee) : '',
      plan: defaultPlan?.name || 'Monthly',
      dueDate: today,
    })

    setShowMemberModal(true)
  }

  const saveMember = (event) => {
    event.preventDefault()

    const fee = Number(memberForm.fee)

    if (!memberForm.name.trim()) {
      alert('Enter the member name.')
      return
    }

    if (!memberForm.rollNo.trim()) {
      alert('Enter a roll number.')
      return
    }

    if (!Number.isFinite(fee) || fee <= 0) {
      alert('Enter a valid membership fee.')
      return
    }

    if (
      members.some(
        (member) =>
          String(member.rollNo).toLowerCase() ===
          memberForm.rollNo.trim().toLowerCase()
      )
    ) {
      alert('This roll number already exists.')
      return
    }

    addMember({
      name: memberForm.name.trim(),
      rollNo: memberForm.rollNo.trim(),
      phone: memberForm.phone.trim(),
      gender: memberForm.gender,
      fee,
      paid: 0,
      plan: memberForm.plan,
      dueDate: memberForm.dueDate,
      expiry: memberForm.dueDate,
      status: 'Active',
      payments: [],
    })

    setShowMemberModal(false)
  }

  // Print payment receipt.
  const printReceipt = (payment) => {
    const gym = getSettings()?.gym || {}
    const gymName = gym.name || 'GymFlow'
    const receiptWindow = window.open('', '_blank', 'width=700,height=750')

    if (!receiptWindow) {
      alert('Allow pop-ups to print the receipt.')
      return
    }

    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeHTML(gymName)} Payment Receipt</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 35px;
              color: #222;
            }
            .receipt {
              max-width: 520px;
              margin: auto;
              border: 1px solid #ddd;
              padding: 30px;
              border-radius: 12px;
            }
            h1 { margin-bottom: 5px; }
            .muted { color: #777; }
            .amount {
              font-size: 30px;
              font-weight: bold;
              margin: 25px 0;
            }
            .line {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              padding: 12px 0;
              border-bottom: 1px solid #eee;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #777;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <h1>${escapeHTML(gymName)}</h1>
            ${gym.address ? `<p class="muted">${escapeHTML(gym.address)}</p>` : ''}
            ${gym.phone ? `<p class="muted">${escapeHTML(gym.phone)}</p>` : ''}
            ${gym.email ? `<p class="muted">${escapeHTML(gym.email)}</p>` : ''}
            <p class="muted">Membership Payment Receipt</p>
            <hr />
            <p class="muted">${escapeHTML(payment.reference)}</p>
            <div class="amount">
              ${escapeHTML(money(payment.amount))}
            </div>
            <div class="line">
              <span>Member</span>
              <strong>${escapeHTML(payment.memberName)}</strong>
            </div>
            <div class="line">
              <span>Roll Number</span>
              <strong>${escapeHTML(payment.rollNo)}</strong>
            </div>
            <div class="line">
              <span>Date</span>
              <strong>${escapeHTML(payment.date)}</strong>
            </div>
            <div class="line">
              <span>Payment Method</span>
              <strong>${escapeHTML(payment.method)}</strong>
            </div>
            <div class="line">
              <span>Wallet</span>
              <strong>${escapeHTML(payment.wallet)}</strong>
            </div>
            <div class="line">
              <span>Notes</span>
              <strong>${escapeHTML(payment.notes || '—')}</strong>
            </div>
            <div class="footer">
              Thank you for choosing ${escapeHTML(gymName)}!
            </div>
          </div>
          <script>
            window.onload = () => window.print()
          </script>
        </body>
      </html>
    `)

    receiptWindow.document.close()
  }

  // WhatsApp due reminder.
  const sendReminder = (member) => {
    if (!member.phone) {
      alert('This member has no phone number. Add their number first.')
      return
    }

    const phone = member.phone.replace(/\D/g, '')
    const amount = getRemaining(member)

    const message = encodeURIComponent(
      `Hello ${member.name}, this is a reminder from GymFlow. Your membership fee balance is ${money(amount)}. Please contact the gym to clear your dues. Thank you.`
    )

    window.open(
      `https://wa.me/${phone}?text=${message}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  // Export member dues report.
  const exportCSV = () => {
    const rows = [
      [
        'Roll Number',
        'Member',
        'Fee',
        'Paid',
        'Outstanding',
        'Status',
        'Due Date',
      ],
      ...filteredMembers.map((member) => [
        member.rollNo,
        member.name,
        member.fee,
        member.paid,
        getRemaining(member),
        getMemberStatus(member),
        getMemberDueDate(member),
      ]),
    ]

    downloadCSV(rows, `gymflow-billing-${today}.csv`)
  }

  // Export payment history.
  const exportPaymentsCSV = () => {
    const rows = [
      [
        'Reference',
        'Member',
        'Roll Number',
        'Amount',
        'Method',
        'Wallet',
        'Date',
      ],
      ...billingTransactions.map((payment) => [
        payment.reference,
        payment.memberName,
        payment.rollNo,
        payment.amount,
        payment.paymentMethod || payment.method,
        payment.wallet,
        payment.date,
      ]),
    ]

    downloadCSV(rows, `gymflow-payments-${today}.csv`)
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('All')
    setPeriodFilter('All')
  }

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="mt-1 text-sm text-gray-500">
            Membership fees, payments, renewals and outstanding dues.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={openAddMember}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Users size={17} />
            Add Member
          </button>

          <button
            onClick={() => {
              const member = members.find(
                (item) => getRemaining(item) > 0
              )

              if (member) openPayment(member)
              else alert('All members are fully paid.')
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700"
          >
            <Plus size={18} />
            Record Payment
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Collected"
          value={money(totalCollected)}
          icon={<TrendingUp size={20} />}
          color="green"
        />

        <SummaryCard
          title="Outstanding Dues"
          value={money(totalDue)}
          icon={<AlertCircle size={20} />}
          color="red"
        />

        <SummaryCard
          title="Collected This Month"
          value={money(monthCollected)}
          icon={<CalendarDays size={20} />}
          color="blue"
        />

        <SummaryCard
          title="Paid Members"
          value={`${paidMembers} / ${members.length}`}
          icon={<Users size={20} />}
          color="orange"
        />
      </div>

      {/* COLLECTION OVERVIEW */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">
              Collection Overview
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Total membership fees versus collected payments
            </p>
          </div>
          <CreditCard className="text-green-600" size={22} />
        </div>

        <div className="mb-2 flex justify-between text-sm">
          <span className="text-gray-500">Collection progress</span>
          <span className="font-semibold text-gray-900">
            {totalFees > 0
              ? `${Math.round((totalCollected / totalFees) * 100)}%`
              : '0%'}
          </span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-green-500"
            style={{
              width: `${
                totalFees > 0
                  ? Math.min(100, (totalCollected / totalFees) * 100)
                  : 0
              }%`,
            }}
          />
        </div>

        <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
          <span className="text-gray-500">
            Collected: {money(totalCollected)}
          </span>
          <span className="text-gray-500">
            Remaining: {money(totalDue)}
          </span>
        </div>
      </section>

      {/* MONTHLY REVENUE */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-gray-900">Monthly Revenue</h2>
            <p className="mt-1 text-sm text-gray-500">
              Recorded membership collections
            </p>
          </div>

          <button
            onClick={exportPaymentsCSV}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download size={15} className="mr-1 inline" />
            Payments CSV
          </button>
        </div>

        {monthlyRevenue.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            No payment records available yet.
          </p>
        ) : (
          <div className="space-y-4">
            {monthlyRevenue.map(([month, amount]) => {
              const max = Math.max(
                ...monthlyRevenue.map((item) => item[1])
              )

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
                      {money(amount)}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{
                        width: `${max > 0 ? (amount / max) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* MEMBERSHIP RECORDS */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900">
              Membership Records
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Shared member records from GymFlow Members.
            </p>
          </div>

          <button
            onClick={exportCSV}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download size={15} className="mr-1 inline" />
            Export Members
          </button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search member..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-green-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500"
          >
            <option value="All">All payment statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Unpaid">Unpaid</option>
          </select>

          <select
            value={periodFilter}
            onChange={(event) => setPeriodFilter(event.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500"
          >
            <option value="All">All due dates</option>
            <option value="Overdue">Overdue</option>
            <option value="Due Today">Due today</option>
          </select>
        </div>

        <div className="mb-4 flex justify-end">
          <button
            onClick={clearFilters}
            className="text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            <RotateCcw size={14} className="mr-1 inline" />
            Clear filters
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-3">Member</th>
                <th className="px-3 py-3">Plan / Fee</th>
                <th className="px-3 py-3">Paid</th>
                <th className="px-3 py-3">Outstanding</th>
                <th className="px-3 py-3">Due Date</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredMembers.map((member) => {
                const status = getMemberStatus(member)
                const remaining = getRemaining(member)
                const dueDate = getMemberDueDate(member)
                const overdue = dueDate < today && remaining > 0

                return (
                  <tr
                    key={member.id}
                    className="border-b border-gray-50 text-sm hover:bg-gray-50"
                  >
                    <td className="px-3 py-4">
                      <p className="font-semibold text-gray-900">
                        {member.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {member.rollNo}
                      </p>
                    </td>

                    <td className="px-3 py-4">
                      <p className="font-medium text-gray-800">
                        {member.plan || 'Monthly'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {money(member.fee)}
                      </p>
                    </td>

                    <td className="px-3 py-4 font-medium text-green-700">
                      {money(member.paid)}
                    </td>

                    <td className="px-3 py-4 font-semibold text-gray-900">
                      {money(remaining)}
                    </td>

                    <td className="px-3 py-4">
                      <span
                        className={
                          overdue
                            ? 'font-medium text-red-600'
                            : 'text-gray-600'
                        }
                      >
                        {formatDate(dueDate)}
                      </span>
                      {overdue && (
                        <p className="mt-1 text-xs text-red-500">
                          Overdue
                        </p>
                      )}
                    </td>

                    <td className="px-3 py-4">
                      <StatusBadge status={status} />
                    </td>

                    <td className="px-3 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setSelectedMember(member)}
                          title="View member"
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                        >
                          <Eye size={16} />
                        </button>

                        {remaining > 0 && (
                          <button
                            onClick={() => openPayment(member)}
                            title="Record payment"
                            className="rounded-lg p-2 text-green-600 hover:bg-green-50"
                          >
                            <Plus size={16} />
                          </button>
                        )}

                        {remaining > 0 && (
                          <button
                            onClick={() => sendReminder(member)}
                            title="WhatsApp reminder"
                            className="rounded-lg p-2 text-green-600 hover:bg-green-50"
                          >
                            <MessageCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-400">
                    No matching members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Showing {filteredMembers.length} of {members.length} members.
          {' '}{unpaidMembers} member(s) have outstanding balances.
        </p>
      </section>

      {/* PAYMENT HISTORY */}
      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-900">Payment History</h2>
            <p className="mt-1 text-sm text-gray-500">
              All membership payments recorded in GymFlow.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportPaymentsCSV}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download size={15} className="mr-1 inline" />
              Export
            </button>
            <Receipt className="text-green-600" size={22} />
          </div>
        </div>

        {billingTransactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            No payments recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                  <th className="px-3 py-3">Reference</th>
                  <th className="px-3 py-3">Member</th>
                  <th className="px-3 py-3">Method</th>
                  <th className="px-3 py-3">Wallet</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Receipt</th>
                </tr>
              </thead>

              <tbody>
                {billingTransactions.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-gray-50 text-sm"
                  >
                    <td className="px-3 py-4 text-xs text-gray-500">
                      {payment.reference}
                    </td>
                    <td className="px-3 py-4 font-medium text-gray-900">
                      {payment.memberName}
                    </td>
                    <td className="px-3 py-4 text-gray-600">
                      {payment.paymentMethod || payment.method}
                    </td>
                    <td className="px-3 py-4 text-gray-600">
                      {payment.wallet}
                    </td>
                    <td className="px-3 py-4 text-gray-600">
                      {formatDate(payment.date)}
                    </td>
                    <td className="px-3 py-4 font-semibold text-green-700">
                      {money(payment.amount)}
                    </td>
                    <td className="px-3 py-4">
                      <button
                        onClick={() => setSelectedReceipt(payment)}
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                        title="View receipt"
                      >
                        <Receipt size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <Modal onClose={closePayment}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Record Membership Payment
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {selectedMember?.name} · {selectedMember?.rollNo}
              </p>
            </div>

            <button
              onClick={closePayment}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Membership fee</p>
              <p className="mt-1 font-bold text-gray-900">
                {money(selectedMember?.fee)}
              </p>
            </div>

            <div className="rounded-xl bg-orange-50 p-3">
              <p className="text-xs text-orange-600">Outstanding</p>
              <p className="mt-1 font-bold text-orange-700">
                {money(selectedMember ? getRemaining(selectedMember) : 0)}
              </p>
            </div>
          </div>

          <form onSubmit={savePayment} className="space-y-4">
            <FormField label="Payment amount (PKR)">
              <input
                required
                type="number"
                min="1"
                max={selectedMember ? getRemaining(selectedMember) : undefined}
                step="0.01"
                value={paymentForm.amount}
                onChange={(event) =>
                  setPaymentForm({
                    ...paymentForm,
                    amount: event.target.value,
                  })
                }
                className="form-input"
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Payment method">
                <select
                  value={paymentForm.method}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      method: event.target.value,
                    })
                  }
                  className="form-input"
                >
                  {!paymentMethods.includes(paymentForm.method) && (
                    <option value={paymentForm.method}>{paymentForm.method} (existing)</option>
                  )}
                  {paymentMethods.map((method) => (
                    <option key={method}>{method}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Deposit into wallet">
                <select
                  required
                  value={paymentForm.wallet}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      wallet: event.target.value,
                    })
                  }
                  className="form-input"
                >
                  <option value="">Select wallet</option>
                  {activeWallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.name}>
                      {wallet.name} — {money(wallet.balance)}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Payment date">
              <input
                required
                type="date"
                value={paymentForm.date}
                onChange={(event) =>
                  setPaymentForm({
                    ...paymentForm,
                    date: event.target.value,
                  })
                }
                className="form-input"
              />
            </FormField>

            <FormField label="Notes (optional)">
              <textarea
                rows="2"
                value={paymentForm.notes}
                onChange={(event) =>
                  setPaymentForm({
                    ...paymentForm,
                    notes: event.target.value,
                  })
                }
                placeholder="Payment details..."
                className="form-input resize-none"
              />
            </FormField>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={closePayment}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ADD MEMBER MODAL */}
      {showMemberModal && (
        <Modal onClose={() => setShowMemberModal(false)}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Add New Member
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                This member will also appear in the Members module.
              </p>
            </div>

            <button
              onClick={() => setShowMemberModal(false)}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={saveMember} className="space-y-4">
            <FormField label="Member name">
              <input
                required
                value={memberForm.name}
                onChange={(event) =>
                  setMemberForm({
                    ...memberForm,
                    name: event.target.value,
                  })
                }
                className="form-input"
                placeholder="Member name"
              />
            </FormField>

            <FormField label="Roll number">
              <input
                required
                value={memberForm.rollNo}
                onChange={(event) =>
                  setMemberForm({
                    ...memberForm,
                    rollNo: event.target.value,
                  })
                }
                className="form-input"
              />
            </FormField>

            <FormField label="WhatsApp number (with country code)">
              <input
                value={memberForm.phone}
                onChange={(event) =>
                  setMemberForm({
                    ...memberForm,
                    phone: event.target.value,
                  })
                }
                className="form-input"
                placeholder="923001234567"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Gender">
                <select
                  value={memberForm.gender}
                  onChange={(event) =>
                    setMemberForm({
                      ...memberForm,
                      gender: event.target.value,
                    })
                  }
                  className="form-input"
                >
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </FormField>

              <FormField label="Membership fee">
                <input
                  required
                  type="number"
                  min="1"
                  value={memberForm.fee}
                  onChange={(event) =>
                    setMemberForm({
                      ...memberForm,
                      fee: event.target.value,
                    })
                  }
                  className="form-input"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Plan">
                <select
                  value={memberForm.plan}
                  onChange={(event) => {
                    const selectedPlan = plans.find((plan) => plan.name === event.target.value)
                    setMemberForm({
                      ...memberForm,
                      plan: event.target.value,
                      ...(selectedPlan ? { fee: String(selectedPlan.fee) } : {}),
                    })
                  }}
                  className="form-input"
                >
                  {!plans.some((plan) => plan.name === memberForm.plan) && (
                    <option>{memberForm.plan}</option>
                  )}
                  {plans.length ? plans.map((plan) => (
                    <option key={plan.id} value={plan.name}>{plan.name}</option>
                  )) : ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'].map((plan) => (
                    <option key={plan}>{plan}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Next due date">
                <input
                  required
                  type="date"
                  value={memberForm.dueDate}
                  onChange={(event) =>
                    setMemberForm({
                      ...memberForm,
                      dueDate: event.target.value,
                    })
                  }
                  className="form-input"
                />
              </FormField>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setShowMemberModal(false)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
              >
                Save Member
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MEMBER DETAILS MODAL */}
      {selectedMember && !showPaymentModal && (
        <Modal onClose={() => setSelectedMember(null)}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              Membership Details
            </h2>

            <button
              onClick={() => setSelectedMember(null)}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <h3 className="text-lg font-bold text-gray-900">
              {selectedMember.name}
            </h3>
            <p className="text-sm text-gray-500">
              {selectedMember.rollNo}
            </p>
          </div>

          <div className="my-5 grid grid-cols-2 gap-3">
            <InfoBox
              label="Membership fee"
              value={money(selectedMember.fee)}
            />
            <InfoBox
              label="Paid"
              value={money(selectedMember.paid)}
            />
            <InfoBox
              label="Outstanding"
              value={money(getRemaining(selectedMember))}
            />
            <InfoBox
              label="Next due date"
              value={formatDate(getMemberDueDate(selectedMember))}
            />
          </div>

          <div className="mb-5">
            <h3 className="mb-3 font-bold text-gray-900">
              Member Payment History
            </h3>

            {(selectedMember.payments || []).length === 0 ? (
              <p className="py-5 text-center text-sm text-gray-400">
                No payment history for this member.
              </p>
            ) : (
              <div className="space-y-2">
                {[...selectedMember.payments].reverse().map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-wrap justify-between gap-2 rounded-xl bg-gray-50 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {payment.reference}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDate(payment.date)} · {payment.method}
                      </p>
                    </div>

                    <p className="font-bold text-green-700">
                      {money(payment.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
            {getRemaining(selectedMember) > 0 && (
              <button
                onClick={() => openPayment(selectedMember)}
                className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white"
              >
                Record Payment
              </button>
            )}

            <button
              onClick={() => sendReminder(selectedMember)}
              className="rounded-xl border border-green-200 px-4 py-2.5 text-sm font-semibold text-green-700"
            >
              <MessageCircle size={15} className="mr-1 inline" />
              WhatsApp Reminder
            </button>
          </div>
        </Modal>
      )}

      {/* RECEIPT MODAL */}
      {selectedReceipt && (
        <Modal onClose={() => setSelectedReceipt(null)}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Payment Receipt
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {selectedReceipt.reference}
              </p>
            </div>

            <button
              onClick={() => setSelectedReceipt(null)}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 p-5">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900">{getSettings()?.gym?.name || 'GymFlow'}</h3>
              <p className="text-sm text-gray-500">
                Membership Payment Receipt
              </p>
              <p className="mt-4 text-3xl font-bold text-green-700">
                {money(selectedReceipt.amount)}
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <DetailRow
                label="Member"
                value={selectedReceipt.memberName}
              />
              <DetailRow
                label="Roll number"
                value={selectedReceipt.rollNo}
              />
              <DetailRow
                label="Reference"
                value={selectedReceipt.reference}
              />
              <DetailRow
                label="Date"
                value={formatDate(selectedReceipt.date)}
              />
              <DetailRow
                label="Payment method"
                value={selectedReceipt.method}
              />
              <DetailRow
                label="Wallet"
                value={selectedReceipt.wallet}
              />
              <DetailRow
                label="Notes"
                value={selectedReceipt.notes || '—'}
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={() => printReceipt(selectedReceipt)}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700"
            >
              <Printer size={17} />
              Print Receipt
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// CSV download helper.
function downloadCSV(rows, filename) {
  const csv = rows
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
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

function SummaryCard({ title, value, icon, color }) {
  const colors = {
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`rounded-xl p-2.5 ${colors[color]}`}>
          {icon}
        </div>
      </div>

      <p className="mt-4 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    Paid: 'bg-green-50 text-green-700',
    Partial: 'bg-orange-50 text-orange-700',
    Unpaid: 'bg-red-50 text-red-700',
  }

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
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

function FormField({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  )
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-bold text-gray-900">{value}</p>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3 border-b border-gray-100 pb-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="break-words text-right font-medium text-gray-900">
        {value || '—'}
      </span>
    </div>
  )
}
