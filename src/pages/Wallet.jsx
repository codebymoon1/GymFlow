import { useEffect, useMemo, useState } from 'react'
import {
  Wallet as WalletIcon,
  Plus,
  ArrowUpRight,
  Search,
  Download,
  Edit3,
  X,
  FileText,
  Eye,
  RotateCcw,
  Banknote,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  HandCoins,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
} from 'lucide-react'

import { useFinancial } from '../context/FinancialContext.jsx'

const initialSessions = []
const SESSIONS_KEY = 'gymflow_cash_sessions'

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem('gymflow_settings') || '{}')
  } catch {
    return {}
  }
}

function loadSessions() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]')
    return Array.isArray(saved) ? saved : initialSessions
  } catch {
    return initialSessions
  }
}

const currency = (amount) => {
  const code = readSettings()?.gym?.currency || 'PKR'
  try {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency', currency: code, maximumFractionDigits: 2,
    }).format(Number(amount || 0))
  } catch {
    return `${code} ${Number(amount || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`
  }
}

const today = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const currentTime = () =>
  new Date().toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  })

const makeReference = (prefix) =>
  `${prefix}-${Date.now().toString().slice(-8)}`

const getWalletBalanceChanges = (transaction) => {
  const amount = Number(transaction.amount)

  if (transaction.type === 'income') {
    return [{ wallet: transaction.wallet, change: amount }]
  }

  if (transaction.type === 'expense') {
    return [{ wallet: transaction.wallet, change: -amount }]
  }

  if (transaction.type === 'transfer') {
    return [
      { wallet: transaction.wallet, change: -amount },
      { wallet: transaction.destination, change: amount },
    ]
  }

  return []
}

export default function Wallet({ navbarSearch = '' }) {
  // Shared wallet and transaction state
  const {
    wallets,
    setWallets,
    transactions,
    setTransactions,
  } = useFinancial()

  // Cash sessions remain local to the Wallet page for now
  const [sessions, setSessions] = useState(loadSessions)

  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
    } catch (error) {
      console.error('Could not save cash sessions:', error)
    }
  }, [sessions])

  const [activeTab, setActiveTab] = useState('overview')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [walletFilter, setWalletFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [modal, setModal] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)

  const [walletForm, setWalletForm] = useState({
    id: null,
    name: '',
    type: 'Cash',
  })

  const [transactionForm, setTransactionForm] = useState({
    id: null,
    type: 'income',
    title: '',
    wallet: 'Main Cash',
    destination: '',
    amount: '',
    paymentMethod: 'Cash',
    notes: '',
  })

  const [sessionForm, setSessionForm] = useState({
    staff: '',
    wallet: 'Main Cash',
    openingBalance: '',
    actualClosing: '',
    notes: '',
  })

  const [handoverForm, setHandoverForm] = useState({
    sessionId: null,
    destination: 'Bank Account',
    amount: '',
    receivedBy: '',
    notes: '',
  })

  // ---------------------------------------------
  // WALLET CALCULATIONS
  // ---------------------------------------------

  const totalBalance = wallets.reduce(
    (total, wallet) => total + Number(wallet.balance || 0),
    0
  )

  const activeWallets = wallets.filter((wallet) => wallet.active)
  const appSettings = readSettings()
  const configuredMethods = appSettings?.payments?.methods
  const paymentMethods = Array.isArray(configuredMethods)
    ? configuredMethods
    : ['Cash', 'JazzCash', 'EasyPaisa', 'Bank Transfer']

  const cashWallets = wallets.filter(
    (wallet) => wallet.type === 'Cash' && wallet.active
  )

  const totalIncome = transactions
    .filter(
      (transaction) =>
        transaction.type === 'income' && !transaction.reversed
    )
    .reduce((total, transaction) => total + Number(transaction.amount), 0)

  const totalExpenses = transactions
    .filter(
      (transaction) =>
        transaction.type === 'expense' && !transaction.reversed
    )
    .reduce((total, transaction) => total + Number(transaction.amount), 0)

  const todayTransactions = transactions.filter(
    (transaction) =>
      transaction.date === today() && !transaction.reversed
  )

  const todayIncome = todayTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((total, transaction) => total + Number(transaction.amount), 0)

  const todayExpenses = todayTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((total, transaction) => total + Number(transaction.amount), 0)

  // ---------------------------------------------
  // TRANSACTION FILTERING
  // ---------------------------------------------

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const searchText = search.toLowerCase()

      const matchesSearch =
        (transaction.title || '').toLowerCase().includes(searchText) ||
        (transaction.reference || '').toLowerCase().includes(searchText) ||
        (transaction.wallet || '').toLowerCase().includes(searchText) ||
        (transaction.destination || '').toLowerCase().includes(searchText)
      const navbarText = navbarSearch.toLowerCase()
      const matchesNavbarSearch =
        `${transaction.title || ''} ${transaction.reference || ''} ${transaction.wallet || ''} ${transaction.destination || ''} ${transaction.paymentMethod || ''} ${transaction.notes || ''} ${transaction.date || ''}`
          .toLowerCase()
          .includes(navbarText)

      const matchesType =
        typeFilter === 'all' || transaction.type === typeFilter

      const matchesWallet =
        walletFilter === 'all' ||
        transaction.wallet === walletFilter ||
        transaction.destination === walletFilter

      const matchesStart =
        !startDate || transaction.date >= startDate

      const matchesEnd =
        !endDate || transaction.date <= endDate

      return (
        matchesSearch &&
        matchesNavbarSearch &&
        matchesType &&
        matchesWallet &&
        matchesStart &&
        matchesEnd
      )
    })
  }, [
    transactions,
    search,
    navbarSearch,
    typeFilter,
    walletFilter,
    startDate,
    endDate,
  ])

  // ---------------------------------------------
  // WALLET BALANCE HELPERS
  // ---------------------------------------------

  const applyTransaction = (transaction, direction = 1) => {
    const changes = getWalletBalanceChanges(transaction)

    setWallets((currentWallets) =>
      currentWallets.map((wallet) => {
        const change = changes.find(
          (item) => item.wallet === wallet.name
        )

        if (!change) return wallet

        return {
          ...wallet,
          balance: Number(
            (
              Number(wallet.balance) +
              change.change * direction
            ).toFixed(2)
          ),
        }
      })
    )
  }

  const getWallet = (name) =>
    wallets.find((wallet) => wallet.name === name)

  // ---------------------------------------------
  // WALLET MANAGEMENT
  // ---------------------------------------------

  const openAddWallet = () => {
    setWalletForm({
      id: null,
      name: '',
      type: 'Cash',
    })
    setModal('wallet')
  }

  const openEditWallet = (wallet) => {
    setWalletForm({
      id: wallet.id,
      name: wallet.name,
      type: wallet.type,
    })
    setModal('wallet')
  }

  const saveWallet = (event) => {
    event.preventDefault()

    const name = walletForm.name.trim()

    if (!name) {
      alert('Please enter a wallet name.')
      return
    }

    const duplicate = wallets.some(
      (wallet) =>
        wallet.name.toLowerCase() === name.toLowerCase() &&
        wallet.id !== walletForm.id
    )

    if (duplicate) {
      alert('A wallet with this name already exists.')
      return
    }

    if (walletForm.id) {
      const oldWallet = wallets.find(
        (wallet) => wallet.id === walletForm.id
      )

      setWallets((current) =>
        current.map((wallet) =>
          wallet.id === walletForm.id
            ? { ...wallet, name, type: walletForm.type }
            : wallet
        )
      )

      if (oldWallet && oldWallet.name !== name) {
        setTransactions((current) =>
          current.map((transaction) => ({
            ...transaction,
            wallet:
              transaction.wallet === oldWallet.name
                ? name
                : transaction.wallet,
            destination:
              transaction.destination === oldWallet.name
                ? name
                : transaction.destination,
          }))
        )

        setSessions((current) =>
          current.map((session) => ({
            ...session,
            wallet:
              session.wallet === oldWallet.name
                ? name
                : session.wallet,
          }))
        )
      }
    } else {
      setWallets((current) => [
        ...current,
        {
          id: Date.now(),
          name,
          type: walletForm.type,
          balance: 0,
          active: true,
        },
      ])
    }

    setModal('')
  }

  const toggleWalletStatus = (wallet) => {
    if (wallet.active && Number(wallet.balance) !== 0) {
      alert('This wallet must have a zero balance before deactivation.')
      return
    }

    setWallets((current) =>
      current.map((item) =>
        item.id === wallet.id
          ? { ...item, active: !item.active }
          : item
      )
    )
  }

  // ---------------------------------------------
  // TRANSACTION MANAGEMENT
  // ---------------------------------------------

  const openTransactionModal = (type) => {
    const firstWallet = activeWallets[0]?.name || ''

    setTransactionForm({
      id: null,
      type,
      title: '',
      wallet: firstWallet,
      destination:
        activeWallets.find(
          (wallet) => wallet.name !== firstWallet
        )?.name || '',
      amount: '',
      paymentMethod: 'Cash',
      notes: '',
    })

    setModal('transaction')
  }

  const openEditTransaction = (transaction) => {
    if (transaction.reversed) {
      alert('A reversed transaction cannot be edited.')
      return
    }

    setTransactionForm({
      id: transaction.id,
      type: transaction.type,
      title: transaction.title,
      wallet: transaction.wallet,
      destination: transaction.destination || '',
      amount: String(transaction.amount),
      paymentMethod: transaction.paymentMethod,
      notes: transaction.notes || '',
    })

    setModal('transaction')
  }

  const saveTransaction = (event) => {
    event.preventDefault()

    const amount = Number(transactionForm.amount)

    if (!transactionForm.title.trim()) {
      alert('Please enter a transaction title.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Enter a valid amount greater than zero.')
      return
    }

    const selectedWallet = getWallet(transactionForm.wallet)

    if (!selectedWallet || !selectedWallet.active) {
      alert('Please select an active wallet.')
      return
    }

    if (
      transactionForm.type === 'transfer' &&
      (!transactionForm.destination ||
        transactionForm.destination === transactionForm.wallet)
    ) {
      alert('Select two different wallets for the transfer.')
      return
    }

    if (
      transactionForm.type === 'transfer' &&
      !getWallet(transactionForm.destination)?.active
    ) {
      alert('Please select an active destination wallet.')
      return
    }

    const existingTransaction = transactionForm.id
      ? transactions.find(
          (item) => item.id === transactionForm.id
        )
      : null

    const allowedMethods = appSettings?.payments?.methods
    if (
      transactionForm.type !== 'transfer' &&
      Array.isArray(allowedMethods) &&
      !allowedMethods.includes(transactionForm.paymentMethod) &&
      existingTransaction?.paymentMethod !== transactionForm.paymentMethod
    ) {
      alert('Select a payment method enabled in Settings.')
      return
    }

    if (transactionForm.id && !existingTransaction) return

    if (existingTransaction?.reversed) {
      alert('A reversed transaction cannot be edited.')
      return
    }

    const newTransaction = {
      id: transactionForm.id || Date.now(),
      reference: existingTransaction?.reference || makeReference('GF-TXN'),
      type: transactionForm.type,
      title: transactionForm.title.trim(),
      wallet: transactionForm.wallet,
      destination:
        transactionForm.type === 'transfer'
          ? transactionForm.destination
          : '',
      amount,
      paymentMethod:
        transactionForm.type === 'transfer'
          ? 'Internal Transfer'
          : transactionForm.paymentMethod,
      date: existingTransaction?.date || today(),
      time: existingTransaction?.time || currentTime(),
      createdAt:
        existingTransaction?.createdAt || new Date().toISOString(),
      notes: transactionForm.notes,
      reversed: false,
      history: existingTransaction?.history || [],
    }

    // Calculate the resulting balance without modifying state first.
    const resultingBalances = new Map(
      wallets.map((wallet) => [wallet.name, Number(wallet.balance)])
    )

    if (existingTransaction) {
      getWalletBalanceChanges(existingTransaction).forEach((change) => {
        resultingBalances.set(
          change.wallet,
          (resultingBalances.get(change.wallet) || 0) - change.change
        )
      })
    }

    getWalletBalanceChanges(newTransaction).forEach((change) => {
      resultingBalances.set(
        change.wallet,
        (resultingBalances.get(change.wallet) || 0) + change.change
      )
    })

    const invalidBalance = [...resultingBalances.values()].some(
      (balance) => balance < 0
    )

    if (invalidBalance) {
      alert('This transaction would create a negative wallet balance.')
      return
    }

    if (existingTransaction) {
      setWallets((current) =>
        current.map((wallet) => {
          const updatedBalance = resultingBalances.get(wallet.name)

          return updatedBalance === undefined
            ? wallet
            : { ...wallet, balance: Number(updatedBalance.toFixed(2)) }
        })
      )

      setTransactions((current) =>
        current.map((item) =>
          item.id === transactionForm.id
            ? {
                ...newTransaction,
                history: [
                  ...(item.history || []),
                  {
                    date: new Date().toISOString(),
                    previousAmount: item.amount,
                    updatedAmount: amount,
                    previousTitle: item.title,
                    updatedTitle: newTransaction.title,
                  },
                ],
              }
            : item
        )
      )
    } else {
      const changes = getWalletBalanceChanges(newTransaction)

      const invalidNewBalance = changes.some((change) => {
        const wallet = getWallet(change.wallet)
        return wallet && wallet.balance + change.change < 0
      })

      if (invalidNewBalance) {
        alert('Insufficient wallet balance.')
        return
      }

      applyTransaction(newTransaction, 1)
      setTransactions((current) => [
        newTransaction,
        ...current,
      ])
    }

    setModal('')
  }

  const reverseTransaction = (transaction) => {
    if (transaction.reversed) {
      alert('This transaction has already been reversed.')
      return
    }

    const confirmed = window.confirm(
      `Reverse ${transaction.reference}? This will undo its wallet balance effect.`
    )

    if (!confirmed) return

    const changes = getWalletBalanceChanges(transaction)

    const invalidBalance = changes.some((change) => {
      const wallet = getWallet(change.wallet)
      return wallet && wallet.balance - change.change < 0
    })

    if (invalidBalance) {
      alert('This reversal would create a negative wallet balance.')
      return
    }

    applyTransaction(transaction, -1)

    const reversal = {
      id: Date.now(),
      reference: makeReference('GF-REV'),
      type: 'reversal',
      title: `Reversal: ${transaction.title}`,
      wallet: transaction.wallet,
      destination: transaction.destination,
      amount: transaction.amount,
      paymentMethod: transaction.paymentMethod,
      date: today(),
      time: currentTime(),
      createdAt: new Date().toISOString(),
      notes: `Reversal of ${transaction.reference}`,
      reversed: false,
      history: [],
    }

    setTransactions((current) => [
      reversal,
      ...current.map((item) =>
        item.id === transaction.id
          ? { ...item, reversed: true }
          : item
      ),
    ])

    setModal('')
  }

  // ---------------------------------------------
  // CASH SESSION HELPERS
  // ---------------------------------------------

  const getSessionTransactions = (session) => {
    const start = new Date(session.openedAt).getTime()
    const end = session.closedAt
      ? new Date(session.closedAt).getTime()
      : Date.now()

    return transactions.filter((transaction) => {
      if (transaction.reversed || transaction.type === 'reversal') {
        return false
      }

      const transactionTime = transaction.createdAt
        ? new Date(transaction.createdAt).getTime()
        : new Date(`${transaction.date}T00:00:00`).getTime()

      return (
        transactionTime >= start &&
        transactionTime <= end &&
        (transaction.wallet === session.wallet ||
          transaction.destination === session.wallet)
      )
    })
  }

  const calculateExpectedCash = (session) => {
    const sessionTransactions = getSessionTransactions(session)

    let expected = Number(session.openingBalance)

    sessionTransactions.forEach((transaction) => {
      if (
        transaction.type === 'income' &&
        transaction.wallet === session.wallet &&
        transaction.paymentMethod === 'Cash'
      ) {
        expected += Number(transaction.amount)
      }

      if (
        transaction.type === 'expense' &&
        transaction.wallet === session.wallet &&
        transaction.paymentMethod === 'Cash'
      ) {
        expected -= Number(transaction.amount)
      }

      if (
        transaction.type === 'transfer' &&
        transaction.wallet === session.wallet
      ) {
        expected -= Number(transaction.amount)
      }

      if (
        transaction.type === 'transfer' &&
        transaction.destination === session.wallet
      ) {
        expected += Number(transaction.amount)
      }
    })

    return Number(expected.toFixed(2))
  }

  const openCashSession = (event) => {
    event.preventDefault()

    const staff = sessionForm.staff.trim()
    const openingBalance = Number(sessionForm.openingBalance)

    if (!staff) {
      alert('Enter the staff member name.')
      return
    }

    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      alert('Enter a valid opening cash balance.')
      return
    }

    const wallet = getWallet(sessionForm.wallet)

    if (!wallet || wallet.type !== 'Cash' || !wallet.active) {
      alert('Select an active cash wallet.')
      return
    }

    const alreadyOpen = sessions.some(
      (session) =>
        session.status === 'open' &&
        session.wallet === sessionForm.wallet
    )

    if (alreadyOpen) {
      alert('There is already an open cash session for this wallet.')
      return
    }

    const session = {
      id: Date.now(),
      reference: makeReference('GF-CASH'),
      staff,
      wallet: sessionForm.wallet,
      openingBalance,
      actualClosing: null,
      expectedClosing: null,
      discrepancy: null,
      status: 'open',
      openedAt: new Date().toISOString(),
      openedDate: today(),
      openedTime: currentTime(),
      closedAt: null,
      closedBy: '',
      handovers: [],
      notes: sessionForm.notes,
    }

    setSessions((current) => [session, ...current])

    setSessionForm({
      staff: '',
      wallet: 'Main Cash',
      openingBalance: '',
      actualClosing: '',
      notes: '',
    })

    setModal('')
    setActiveTab('cash')
  }

  const closeCashSession = (event) => {
    event.preventDefault()

    const session = sessions.find(
      (item) => item.id === selectedSession?.id
    )

    if (!session || session.status !== 'open') {
      alert('This cash session is not open.')
      return
    }

    const actualClosing = Number(sessionForm.actualClosing)

    if (!Number.isFinite(actualClosing) || actualClosing < 0) {
      alert('Enter a valid counted cash amount.')
      return
    }

    const expectedClosing = calculateExpectedCash(session)
    const discrepancy = Number(
      (actualClosing - expectedClosing).toFixed(2)
    )

    const closedBy = sessionForm.staff.trim()

    if (!closedBy) {
      alert('Enter the name of the staff member closing the drawer.')
      return
    }

    setSessions((current) =>
      current.map((item) =>
        item.id === session.id
          ? {
              ...item,
              actualClosing,
              expectedClosing,
              discrepancy,
              status: 'closed',
              closedAt: new Date().toISOString(),
              closedBy,
              closingNotes: sessionForm.notes,
            }
          : item
      )
    )

    setModal('')
    setSelectedSession(null)

    setSessionForm({
      staff: '',
      wallet: 'Main Cash',
      openingBalance: '',
      actualClosing: '',
      notes: '',
    })
  }

  // ---------------------------------------------
  // CASH HANDOVER
  // ---------------------------------------------

  const openHandoverModal = (session) => {
    const availableDestinations = activeWallets.filter(
      (wallet) => wallet.name !== session.wallet
    )

    if (availableDestinations.length === 0) {
      alert('Create another active wallet before recording a handover.')
      return
    }

    setHandoverForm({
      sessionId: session.id,
      destination: availableDestinations[0].name,
      amount: '',
      receivedBy: '',
      notes: '',
    })

    setModal('handover')
  }

  const saveHandover = (event) => {
    event.preventDefault()

    const session = sessions.find(
      (item) => item.id === handoverForm.sessionId
    )

    const amount = Number(handoverForm.amount)

    if (!session || session.status !== 'open') {
      alert('The cash session is no longer open.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Enter a valid handover amount.')
      return
    }

    if (!handoverForm.receivedBy.trim()) {
      alert('Enter the name of the person receiving the cash.')
      return
    }

    if (handoverForm.destination === session.wallet) {
      alert('Select a different destination wallet.')
      return
    }

    const sourceWallet = getWallet(session.wallet)
    const destinationWallet = getWallet(handoverForm.destination)

    if (
      !sourceWallet ||
      !sourceWallet.active ||
      sourceWallet.balance < amount
    ) {
      alert('The cash wallet does not have enough balance.')
      return
    }

    if (!destinationWallet?.active) {
      alert('Select an active destination wallet.')
      return
    }

    const transaction = {
      id: Date.now(),
      reference: makeReference('GF-HAND'),
      type: 'transfer',
      title: `Cash handover to ${handoverForm.receivedBy.trim()}`,
      wallet: session.wallet,
      destination: handoverForm.destination,
      amount,
      paymentMethod: 'Internal Transfer',
      date: today(),
      time: currentTime(),
      createdAt: new Date().toISOString(),
      notes: handoverForm.notes,
      reversed: false,
      history: [],
    }

    applyTransaction(transaction, 1)
    setTransactions((current) => [transaction, ...current])

    const handover = {
      id: Date.now(),
      reference: transaction.reference,
      amount,
      receivedBy: handoverForm.receivedBy.trim(),
      destination: handoverForm.destination,
      date: today(),
      time: currentTime(),
      notes: handoverForm.notes,
    }

    setSessions((current) =>
      current.map((item) =>
        item.id === session.id
          ? {
              ...item,
              handovers: [...(item.handovers || []), handover],
            }
          : item
      )
    )

    setModal('')
  }

  // ---------------------------------------------
  // CSV EXPORT
  // ---------------------------------------------

  const exportTransactions = () => {
    const headers = [
      'Reference',
      'Type',
      'Title',
      'Wallet',
      'Destination',
      'Amount',
      'Payment Method',
      'Date',
      'Time',
      'Status',
    ]

    const rows = filteredTransactions.map((transaction) => [
      transaction.reference,
      transaction.type,
      transaction.title,
      transaction.wallet,
      transaction.destination || '',
      transaction.amount,
      transaction.paymentMethod,
      transaction.date,
      transaction.time,
      transaction.reversed ? 'Reversed' : 'Active',
    ])

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value ?? '').replace(/"/g, '""')}"`
          )
          .join(',')
      )
      .join('\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `gymflow-transactions-${today()}.csv`
    link.click()

    URL.revokeObjectURL(url)
  }

  // ---------------------------------------------
  // SMALL UI COMPONENTS
  // ---------------------------------------------

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </h3>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          )}
        </div>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )

  const closeModal = () => {
    setModal('')
    setSelectedTransaction(null)
    setSelectedSession(null)
  }

  const openCloseSession = (session) => {
    setSelectedSession(session)

    setSessionForm({
      staff: '',
      wallet: session.wallet,
      openingBalance: '',
      actualClosing: '',
      notes: '',
    })

    setModal('close-session')
  }

  // ---------------------------------------------
  // MAIN UI
  // ---------------------------------------------

  return (
    <div className="space-y-7">
      {/* PAGE HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <WalletIcon className="text-emerald-600" size={25} />
            <h1 className="text-2xl font-bold text-slate-900">
              Wallet Management
            </h1>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Manage wallets, transactions, cash drawers and daily handovers.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openTransactionModal('income')}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <Plus size={17} />
            Add Money
          </button>

          <button
            onClick={() => openTransactionModal('expense')}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowUpRight size={17} />
            Add Expense
          </button>
        </div>
      </div>
        <button
        onClick={() => openTransactionModal('transfer')}
        className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
      >
        <ArrowUpRight size={17} />
        Transfer Money
</button>
      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Wallet Balance"
          value={currency(totalBalance)}
          icon={WalletIcon}
          color="bg-emerald-50 text-emerald-600"
          subtitle={`${activeWallets.length} active wallets`}
        />

        <StatCard
          title="Total Income"
          value={currency(totalIncome)}
          icon={TrendingUp}
          color="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Total Expenses"
          value={currency(totalExpenses)}
          icon={TrendingDown}
          color="bg-rose-50 text-rose-600"
        />

        <StatCard
          title="Today's Net Cash Flow"
          value={currency(todayIncome - todayExpenses)}
          icon={CircleDollarSign}
          color="bg-violet-50 text-violet-600"
          subtitle="Today's income minus expenses"
        />
      </div>

      {appSettings?.preferences?.lowBalanceWarning && activeWallets.some(
        (wallet) => Number(wallet.balance || 0) < Number(appSettings.preferences.lowBalanceLimit || 0)
      ) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Low balance: {activeWallets
            .filter((wallet) => Number(wallet.balance || 0) < Number(appSettings.preferences.lowBalanceLimit || 0))
            .map((wallet) => `${wallet.name} (${currency(wallet.balance)})`)
            .join(', ')}
        </div>
      )}

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'overview', label: 'Wallets', icon: WalletIcon },
          { id: 'transactions', label: 'Transactions', icon: FileText },
          { id: 'cash', label: 'Cash Management', icon: Banknote },
          { id: 'sessions', label: 'Session History', icon: ClipboardCheck },
        ].map((tab) => {
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* WALLET OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Your Wallets
              </h2>
              <p className="text-sm text-slate-500">
                Manage your gym's cash, bank and mobile wallets.
              </p>
            </div>

            <button
              onClick={openAddWallet}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Plus size={17} />
              New Wallet
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                      <WalletIcon size={22} />
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900">
                        {wallet.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {wallet.type}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      wallet.active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {wallet.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mt-6">
                  <p className="text-sm text-slate-500">Available Balance</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900">
                    {currency(wallet.balance)}
                  </h2>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => openEditWallet(wallet)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>

                  <button
                    onClick={() => toggleWalletStatus(wallet)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
                      wallet.active
                        ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    {wallet.active ? <Lock size={14} /> : <Unlock size={14} />}
                    {wallet.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Transaction History
            </h2>
            <p className="text-sm text-slate-500">
              Search, filter, review and export wallet transactions.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative xl:col-span-2">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search transactions..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            >
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
              <option value="reversal">Reversal</option>
            </select>

            <select
              value={walletFilter}
              onChange={(event) => setWalletFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            >
              <option value="all">All Wallets</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.name}>
                  {wallet.name}
                </option>
              ))}
            </select>

            <button
              onClick={exportTransactions}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Download size={16} />
              Export CSV
            </button>

            <div>
              <label className="mb-1 block text-xs text-slate-500">
                From date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-500">
                To date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <button
              onClick={() => {
                setSearch('')
                setTypeFilter('all')
                setWalletFilter('all')
                setStartDate('')
                setEndDate('')
              }}
              className="self-end rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Clear Filters
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Transaction</th>
                    <th className="px-5 py-4">Wallet</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Amount</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          {transaction.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {transaction.reference}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {transaction.type === 'transfer'
                          ? `${transaction.wallet} → ${transaction.destination}`
                          : transaction.wallet}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            transaction.type === 'income'
                              ? 'bg-emerald-50 text-emerald-700'
                              : transaction.type === 'expense'
                                ? 'bg-rose-50 text-rose-700'
                                : transaction.type === 'transfer'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {transaction.type}
                        </span>

                        {transaction.reversed && (
                          <p className="mt-1 text-xs text-rose-500">
                            Reversed
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 font-bold text-slate-800">
                        {currency(transaction.amount)}
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {transaction.date}
                        <p className="text-xs text-slate-400">
                          {transaction.time}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            title="View details"
                            onClick={() => {
                              setSelectedTransaction(transaction)
                              setModal('details')
                            }}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                          >
                            <Eye size={16} />
                          </button>

                          {transaction.type !== 'reversal' &&
                            !transaction.reversed && (
                              <>
                                <button
                                  title="Edit transaction"
                                  onClick={() =>
                                    openEditTransaction(transaction)
                                  }
                                  className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                                >
                                  <Edit3 size={16} />
                                </button>

                                <button
                                  title="Reverse transaction"
                                  onClick={() =>
                                    reverseTransaction(transaction)
                                  }
                                  className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                                >
                                  <RotateCcw size={16} />
                                </button>
                              </>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-5 py-12 text-center text-slate-400"
                      >
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CASH MANAGEMENT */}
      {activeTab === 'cash' && (
        <div className="space-y-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Daily Cash Management
              </h2>
              <p className="text-sm text-slate-500">
                Open drawers, record handovers and reconcile daily cash.
              </p>
            </div>

            <button
              onClick={() => {
                setSessionForm({
                  staff: '',
                  wallet: cashWallets[0]?.name || '',
                  openingBalance: '',
                  actualClosing: '',
                  notes: '',
                })
                setModal('open-session')
              }}
              disabled={cashWallets.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Unlock size={17} />
              Open Cash Drawer
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Open Cash Drawers"
              value={sessions.filter((item) => item.status === 'open').length}
              icon={Unlock}
              color="bg-emerald-50 text-emerald-600"
            />

            <StatCard
              title="Closed Sessions Today"
              value={
                sessions.filter(
                  (item) =>
                    item.status === 'closed' &&
                    item.openedDate === today()
                ).length
              }
              icon={Lock}
              color="bg-blue-50 text-blue-600"
            />

            <StatCard
              title="Today's Discrepancies"
              value={currency(
                sessions
                  .filter(
                    (item) =>
                      item.status === 'closed' &&
                      item.openedDate === today()
                  )
                  .reduce(
                    (total, item) => total + Number(item.discrepancy || 0),
                    0
                  )
              )}
              icon={AlertTriangle}
              color="bg-amber-50 text-amber-600"
              subtitle="Combined shortage / excess"
            />
          </div>

          <div>
            <h3 className="mb-3 font-bold text-slate-900">
              Currently Open Drawers
            </h3>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {sessions
                .filter((session) => session.status === 'open')
                .map((session) => {
                  const expected = calculateExpectedCash(session)
                  const handoverTotal = (session.handovers || []).reduce(
                    (total, item) => total + Number(item.amount),
                    0
                  )

                  return (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                            <Banknote size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">
                              {session.wallet}
                            </h4>
                            <p className="text-xs text-slate-500">
                              {session.reference}
                            </p>
                          </div>
                        </div>

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Open
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500">
                            Opening Balance
                          </p>
                          <p className="mt-1 font-bold text-slate-900">
                            {currency(session.openingBalance)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Expected Cash Now
                          </p>
                          <p className="mt-1 font-bold text-emerald-700">
                            {currency(expected)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Staff Member
                          </p>
                          <p className="mt-1 font-semibold text-slate-800">
                            {session.staff}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            Cash Handed Over
                          </p>
                          <p className="mt-1 font-semibold text-slate-800">
                            {currency(handoverTotal)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                        Opened {session.openedDate} at {session.openedTime}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => openHandoverModal(session)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <HandCoins size={16} />
                          Cash Handover
                        </button>

                        <button
                          onClick={() => openCloseSession(session)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          <Lock size={16} />
                          Close Drawer
                        </button>
                      </div>
                    </div>
                  )
                })}

              {sessions.filter((item) => item.status === 'open').length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center xl:col-span-2">
                  <Banknote size={34} className="mx-auto text-slate-300" />
                  <h4 className="mt-3 font-bold text-slate-800">
                    No Open Cash Drawers
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Open a drawer to begin tracking a staff member's cash session.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* HANDOVER RECORDS */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold text-slate-900">
              Recent Cash Handovers
            </h3>

            <div className="mt-4 space-y-3">
              {sessions
                .flatMap((session) =>
                  (session.handovers || []).map((handover) => ({
                    ...handover,
                    sessionStaff: session.staff,
                    sessionWallet: session.wallet,
                  }))
                )
                .slice(0, 5)
                .map((handover) => (
                  <div
                    key={handover.id}
                    className="flex flex-col justify-between gap-2 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {handover.sessionWallet} → {handover.destination}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Received by {handover.receivedBy} · Handled by{' '}
                        {handover.sessionStaff}
                      </p>
                      <p className="text-xs text-slate-400">
                        {handover.date} · {handover.time} · {handover.reference}
                      </p>
                    </div>

                    <p className="font-bold text-slate-900">
                      {currency(handover.amount)}
                    </p>
                  </div>
                ))}

              {sessions.every((session) => !session.handovers?.length) && (
                <p className="py-5 text-center text-sm text-slate-400">
                  No handovers recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SESSION HISTORY */}
      {activeTab === 'sessions' && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Cash Session History
            </h2>
            <p className="text-sm text-slate-500">
              Review opening balances, closing counts and cash discrepancies.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Session</th>
                    <th className="px-5 py-4">Staff</th>
                    <th className="px-5 py-4">Opening</th>
                    <th className="px-5 py-4">Expected</th>
                    <th className="px-5 py-4">Actual</th>
                    <th className="px-5 py-4">Difference</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          {session.wallet}
                        </p>
                        <p className="text-xs text-slate-400">
                          {session.reference}
                        </p>
                        <p className="text-xs text-slate-400">
                          {session.openedDate}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {session.staff}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-700">
                        {currency(session.openingBalance)}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-700">
                        {session.status === 'closed'
                          ? currency(session.expectedClosing)
                          : currency(calculateExpectedCash(session))}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-700">
                        {session.status === 'closed'
                          ? currency(session.actualClosing)
                          : 'Not closed'}
                      </td>

                      <td className="px-5 py-4">
                        {session.status === 'closed' ? (
                          <span
                            className={`font-bold ${
                              session.discrepancy < 0
                                ? 'text-rose-600'
                                : session.discrepancy > 0
                                  ? 'text-emerald-600'
                                  : 'text-slate-600'
                            }`}
                          >
                            {session.discrepancy > 0 ? '+' : ''}
                            {currency(session.discrepancy)}
                          </span>
                        ) : (
                          <span className="text-slate-400">Pending</span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            session.status === 'open'
                              ? 'bg-emerald-50 text-emerald-700'
                              : session.discrepancy < 0
                                ? 'bg-rose-50 text-rose-700'
                                : session.discrepancy > 0
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {session.status === 'open'
                            ? 'Open'
                            : session.discrepancy < 0
                              ? 'Shortage'
                              : session.discrepancy > 0
                                ? 'Excess'
                                : 'Balanced'}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {sessions.length === 0 && (
                    <tr>
                      <td
                        colSpan="7"
                        className="px-5 py-12 text-center text-slate-400"
                      >
                        No cash sessions have been recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* DISCREPANCY REPORT */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={19} className="text-amber-500" />
              <h3 className="font-bold text-slate-900">
                Cash Discrepancy Report
              </h3>
            </div>

            <div className="mt-4 space-y-3">
              {sessions
                .filter(
                  (session) =>
                    session.status === 'closed' &&
                    Number(session.discrepancy) !== 0
                )
                .map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50/50 p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {session.wallet} · {session.staff}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {session.reference} · {session.openedDate}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Closed by: {session.closedBy}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p
                        className={`font-bold ${
                          session.discrepancy < 0
                            ? 'text-rose-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {session.discrepancy > 0 ? '+' : ''}
                        {currency(session.discrepancy)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {session.discrepancy < 0
                          ? 'Cash shortage'
                          : 'Cash excess'}
                      </p>
                    </div>
                  </div>
                ))}

              {sessions.filter(
                (session) =>
                  session.status === 'closed' &&
                  Number(session.discrepancy) !== 0
              ).length === 0 && (
                <div className="py-6 text-center">
                  <CheckCircle2
                    size={30}
                    className="mx-auto text-emerald-500"
                  />
                  <p className="mt-2 text-sm font-medium text-slate-600">
                    No cash discrepancies recorded.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                {modal === 'wallet' &&
                  (walletForm.id ? 'Edit Wallet' : 'Create Wallet')}

                {modal === 'transaction' &&
                  (transactionForm.id
                    ? 'Edit Transaction'
                    : transactionForm.type === 'income'
                      ? 'Add Money'
                      : transactionForm.type === 'expense'
                        ? 'Record Expense'
                        : 'Transfer Money')}

                {modal === 'details' && 'Transaction Details'}
                {modal === 'open-session' && 'Open Cash Drawer'}
                {modal === 'close-session' && 'Close Cash Drawer'}
                {modal === 'handover' && 'Cash Handover'}
              </h2>

              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-6">
              {/* WALLET FORM */}
              {modal === 'wallet' && (
                <form onSubmit={saveWallet} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Wallet Name
                    </label>
                    <input
                      required
                      value={walletForm.name}
                      onChange={(event) =>
                        setWalletForm({
                          ...walletForm,
                          name: event.target.value,
                        })
                      }
                      placeholder="e.g. Main Cash"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Wallet Type
                    </label>
                    <select
                      value={walletForm.type}
                      onChange={(event) =>
                        setWalletForm({
                          ...walletForm,
                          type: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    >
                      <option>Cash</option>
                      <option>Bank</option>
                      <option>Mobile Wallet</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    {walletForm.id ? 'Save Changes' : 'Create Wallet'}
                  </button>
                </form>
              )}

              {/* TRANSACTION FORM */}
              {modal === 'transaction' && (
                <form onSubmit={saveTransaction} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Transaction Type
                    </label>
                    <select
                      value={transactionForm.type}
                      onChange={(event) =>
                        setTransactionForm({
                          ...transactionForm,
                          type: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                      <option value="transfer">Transfer</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Description
                    </label>
                    <input
                      required
                      value={transactionForm.title}
                      onChange={(event) =>
                        setTransactionForm({
                          ...transactionForm,
                          title: event.target.value,
                        })
                      }
                      placeholder="Enter transaction description"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      {transactionForm.type === 'transfer'
                        ? 'From Wallet'
                        : 'Wallet'}
                    </label>
                    <select
                      value={transactionForm.wallet}
                      onChange={(event) =>
                        setTransactionForm({
                          ...transactionForm,
                          wallet: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    >
                      {activeWallets.map((wallet) => (
                        <option key={wallet.id} value={wallet.name}>
                          {wallet.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {transactionForm.type === 'transfer' && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        To Wallet
                      </label>
                      <select
                        value={transactionForm.destination}
                        onChange={(event) =>
                          setTransactionForm({
                            ...transactionForm,
                            destination: event.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                      >
                        <option value="">Select destination</option>
                        {activeWallets
                          .filter(
                            (wallet) =>
                              wallet.name !== transactionForm.wallet
                          )
                          .map((wallet) => (
                            <option key={wallet.id} value={wallet.name}>
                              {wallet.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Amount (PKR)
                    </label>
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={transactionForm.amount}
                      onChange={(event) =>
                        setTransactionForm({
                          ...transactionForm,
                          amount: event.target.value,
                        })
                      }
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  {transactionForm.type !== 'transfer' && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">
                        Payment Method
                      </label>
                      <select
                        value={transactionForm.paymentMethod}
                        onChange={(event) =>
                          setTransactionForm({
                            ...transactionForm,
                            paymentMethod: event.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                      >
                        {!paymentMethods.includes(transactionForm.paymentMethod) && (
                          <option value={transactionForm.paymentMethod}>
                            {transactionForm.paymentMethod} (existing)
                          </option>
                        )}
                        {paymentMethods.map((method) => <option key={method}>{method}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Notes (Optional)
                    </label>
                    <textarea
                      rows="2"
                      value={transactionForm.notes}
                      onChange={(event) =>
                        setTransactionForm({
                          ...transactionForm,
                          notes: event.target.value,
                        })
                      }
                      placeholder="Additional details..."
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    {transactionForm.id
                      ? 'Update Transaction'
                      : 'Save Transaction'}
                  </button>
                </form>
              )}

              {/* OPEN SESSION FORM */}
              {modal === 'open-session' && (
                <form onSubmit={openCashSession} className="space-y-4">
                  <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                    Record the cash available in the drawer before the staff
                    member begins their shift.
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Staff Member
                    </label>
                    <input
                      required
                      value={sessionForm.staff}
                      onChange={(event) =>
                        setSessionForm({
                          ...sessionForm,
                          staff: event.target.value,
                        })
                      }
                      placeholder="Receptionist / Cashier name"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Cash Wallet
                    </label>
                    <select
                      value={sessionForm.wallet}
                      onChange={(event) =>
                        setSessionForm({
                          ...sessionForm,
                          wallet: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    >
                      {cashWallets.map((wallet) => (
                        <option key={wallet.id} value={wallet.name}>
                          {wallet.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Opening Cash Balance (PKR)
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={sessionForm.openingBalance}
                      onChange={(event) =>
                        setSessionForm({
                          ...sessionForm,
                          openingBalance: event.target.value,
                        })
                      }
                      placeholder="e.g. 10000"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Notes (Optional)
                    </label>
                    <textarea
                      rows="2"
                      value={sessionForm.notes}
                      onChange={(event) =>
                        setSessionForm({
                          ...sessionForm,
                          notes: event.target.value,
                        })
                      }
                      placeholder="Opening cash details..."
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Open Cash Drawer
                  </button>
                </form>
              )}

              {/* CLOSE SESSION FORM */}
              {modal === 'close-session' && selectedSession && (
                <form onSubmit={closeCashSession} className="space-y-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Cash Wallet</span>
                      <span className="font-semibold text-slate-800">
                        {selectedSession.wallet}
                      </span>
                    </div>

                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-slate-500">Opening Balance</span>
                      <span className="font-semibold text-slate-800">
                        {currency(selectedSession.openingBalance)}
                      </span>
                    </div>

                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-slate-500">
                        Expected Closing Cash
                      </span>
                      <span className="font-bold text-emerald-700">
                        {currency(calculateExpectedCash(selectedSession))}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Actual Cash Counted (PKR)
                    </label>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={sessionForm.actualClosing}
                      onChange={(event) =>
                        setSessionForm({
                          ...sessionForm,
                          actualClosing: event.target.value,
                        })
                      }
                      placeholder="Count the cash in the drawer"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Closed By
                    </label>
                    <input
                      required
                      value={sessionForm.staff}
                      onChange={(event) =>
                        setSessionForm({
                          ...sessionForm,
                          staff: event.target.value,
                        })
                      }
                      placeholder="Name of staff closing the drawer"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Closing Notes (Optional)
                    </label>
                    <textarea
                      rows="2"
                      value={sessionForm.notes}
                      onChange={(event) =>
                        setSessionForm({
                          ...sessionForm,
                          notes: event.target.value,
                        })
                      }
                      placeholder="Explain any cash difference..."
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Confirm & Close Drawer
                  </button>
                </form>
              )}

              {/* HANDOVER FORM */}
              {modal === 'handover' && (
                <form onSubmit={saveHandover} className="space-y-4">
                  <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
                    Record cash transferred from the active drawer to another
                    wallet. This will also create a wallet transfer transaction.
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Destination Wallet
                    </label>
                    <select
                      value={handoverForm.destination}
                      onChange={(event) =>
                        setHandoverForm({
                          ...handoverForm,
                          destination: event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    >
                      {activeWallets
                        .filter((wallet) => {
                          const session = sessions.find(
                            (item) => item.id === handoverForm.sessionId
                          )
                          return wallet.name !== session?.wallet
                        })
                        .map((wallet) => (
                          <option key={wallet.id} value={wallet.name}>
                            {wallet.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Amount (PKR)
                    </label>
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={handoverForm.amount}
                      onChange={(event) =>
                        setHandoverForm({
                          ...handoverForm,
                          amount: event.target.value,
                        })
                      }
                      placeholder="Enter amount"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Received By
                    </label>
                    <input
                      required
                      value={handoverForm.receivedBy}
                      onChange={(event) =>
                        setHandoverForm({
                          ...handoverForm,
                          receivedBy: event.target.value,
                        })
                      }
                      placeholder="Owner / Manager name"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Notes (Optional)
                    </label>
                    <textarea
                      rows="2"
                      value={handoverForm.notes}
                      onChange={(event) =>
                        setHandoverForm({
                          ...handoverForm,
                          notes: event.target.value,
                        })
                      }
                      placeholder="Handover details..."
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Record Cash Handover
                  </button>
                </form>
              )}

              {/* TRANSACTION DETAILS */}
              {modal === 'details' && selectedTransaction && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-500">Reference</p>
                    <p className="mt-1 font-bold text-slate-900">
                      {selectedTransaction.reference}
                    </p>

                    <p className="mt-4 text-xs text-slate-500">Description</p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {selectedTransaction.title}
                    </p>

                    <p className="mt-4 text-xs text-slate-500">Amount</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {currency(selectedTransaction.amount)}
                    </p>
                  </div>

                  {[
                    ['Type', selectedTransaction.type],
                    ['Wallet', selectedTransaction.wallet],
                    ['Destination', selectedTransaction.destination || '—'],
                    ['Payment Method', selectedTransaction.paymentMethod],
                    ['Date', selectedTransaction.date],
                    ['Time', selectedTransaction.time],
                    ['Status', selectedTransaction.reversed ? 'Reversed' : 'Active'],
                    ['Notes', selectedTransaction.notes || '—'],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between gap-4 border-b border-slate-100 pb-2 text-sm"
                    >
                      <span className="text-slate-500">{label}</span>
                      <span className="text-right font-medium text-slate-800">
                        {value}
                      </span>
                    </div>
                  ))}

                  {selectedTransaction.history?.length > 0 && (
                    <div>
                      <h4 className="mb-2 font-bold text-slate-800">
                        Edit History
                      </h4>

                      {selectedTransaction.history.map((item, index) => (
                        <div
                          key={index}
                          className="mb-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"
                        >
                          <p>
                            Amount: {currency(item.previousAmount)} →{' '}
                            {currency(item.updatedAmount)}
                          </p>
                          <p className="mt-1">
                            {new Date(item.date).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={closeModal}
                    className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
