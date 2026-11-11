
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

const FinancialContext = createContext(null)

const initialWallets = [
  {
    id: 1,
    name: 'Main Cash',
    balance: 25000,
    type: 'Cash',
    active: true,
  },
  {
    id: 2,
    name: 'JazzCash',
    balance: 12000,
    type: 'Digital',
    active: true,
  },
  {
    id: 3,
    name: 'EasyPaisa',
    balance: 8500,
    type: 'Digital',
    active: true,
  },
  {
    id: 4,
    name: 'Bank Account',
    balance: 50000,
    type: 'Bank',
    active: true,
  },
]

const initialTransactions = [
  {
    id: 1,
    reference: 'TXN-1001',
    type: 'income',
    title: 'Membership Payment',
    wallet: 'Main Cash',
    amount: 3000,
    paymentMethod: 'Cash',
    date: '2026-11-09',
    time: '10:30 AM',
    notes: 'Monthly membership',
    reversed: false,
    history: [],
  },
  {
    id: 2,
    reference: 'TXN-1002',
    type: 'expense',
    title: 'Cleaning Supplies',
    wallet: 'Main Cash',
    amount: 1200,
    paymentMethod: 'Cash',
    date: '2026-11-09',
    time: '12:15 PM',
    notes: 'Cleaning materials',
    reversed: false,
    history: [],
  },
]

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : fallback
  } catch {
    return fallback
  }
}

export function FinancialProvider({ children }) {
  const [wallets, setWallets] = useState(() =>
    readStorage('gymflow_wallets', initialWallets)
  )

  const [transactions, setTransactions] = useState(() =>
    readStorage('gymflow_transactions', initialTransactions)
  )

  useEffect(() => {
    localStorage.setItem('gymflow_wallets', JSON.stringify(wallets))
  }, [wallets])

  useEffect(() => {
    localStorage.setItem(
      'gymflow_transactions',
      JSON.stringify(transactions)
    )
  }, [transactions])

  const getWalletBalance = (walletName) => {
    return wallets.find((wallet) => wallet.name === walletName)?.balance ?? 0
  }

  const addExpense = (expense) => {
    const wallet = wallets.find(
      (item) => item.name === expense.wallet && item.active
    )

    if (!wallet) {
      throw new Error('Please select an active wallet.')
    }

    if (!Number.isFinite(Number(expense.amount)) || Number(expense.amount) <= 0) {
      throw new Error('Enter a valid expense amount.')
    }

    const amount = Number(expense.amount)

    if (wallet.balance < amount) {
      throw new Error('Insufficient wallet balance.')
    }

    const transaction = {
      ...expense,
      id: Date.now(),
      reference: `EXP-${Date.now()}`,
      type: 'expense',
      amount,
      reversed: false,
      history: [],
      createdAt: new Date().toISOString(),
    }

    setWallets((current) =>
      current.map((item) =>
        item.id === wallet.id
          ? { ...item, balance: item.balance - amount }
          : item
      )
    )

    setTransactions((current) => [transaction, ...current])

    return transaction
  }

  const updateExpense = (id, updatedExpense) => {
    const existing = transactions.find(
      (item) => item.id === id && item.type === 'expense' && !item.reversed
    )

    if (!existing) {
      throw new Error('Expense not found or already cancelled.')
    }

    const oldWallet = wallets.find(
      (item) => item.name === existing.wallet
    )

    const newWallet = wallets.find(
      (item) => item.name === updatedExpense.wallet && item.active
    )

    const newAmount = Number(updatedExpense.amount)

    if (!newWallet) {
      throw new Error('Please select an active wallet.')
    }

    if (!Number.isFinite(newAmount) || newAmount <= 0) {
      throw new Error('Enter a valid expense amount.')
    }

    const availableBalance =
      newWallet.balance +
      (oldWallet?.id === newWallet.id ? existing.amount : 0)

    if (availableBalance < newAmount) {
      throw new Error('Insufficient wallet balance.')
    }

    setWallets((current) =>
      current.map((wallet) => {
        if (wallet.id === oldWallet?.id && wallet.id === newWallet.id) {
          return {
            ...wallet,
            balance: wallet.balance + existing.amount - newAmount,
          }
        }

        if (wallet.id === oldWallet?.id) {
          return {
            ...wallet,
            balance: wallet.balance + existing.amount,
          }
        }

        if (wallet.id === newWallet.id) {
          return {
            ...wallet,
            balance: wallet.balance - newAmount,
          }
        }

        return wallet
      })
    )

    setTransactions((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...updatedExpense,
              amount: newAmount,
              history: [
                ...(item.history || []),
                {
                  action: 'Edited',
                  date: new Date().toISOString(),
                  previousAmount: item.amount,
                  previousWallet: item.wallet,
                },
              ],
            }
          : item
      )
    )
  }

  const cancelExpense = (id, reason) => {
    const expense = transactions.find(
      (item) => item.id === id && item.type === 'expense' && !item.reversed
    )

    if (!expense) {
      throw new Error('Expense not found or already cancelled.')
    }

    setWallets((current) =>
      current.map((wallet) =>
        wallet.name === expense.wallet
          ? { ...wallet, balance: wallet.balance + expense.amount }
          : wallet
      )
    )

    setTransactions((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              reversed: true,
              reversalReason: reason,
              reversedAt: new Date().toISOString(),
              history: [
                ...(item.history || []),
                {
                  action: 'Cancelled',
                  reason,
                  date: new Date().toISOString(),
                },
              ],
            }
          : item
      )
    )
  }

  const value = {
    wallets,
    setWallets,
    transactions,
    setTransactions,
    getWalletBalance,
    addExpense,
    updateExpense,
    cancelExpense,
  }

  return (
    <FinancialContext.Provider value={value}>
      {children}
    </FinancialContext.Provider>
  )
}

export function useFinancial() {
  const context = useContext(FinancialContext)

  if (!context) {
    throw new Error(
      'useFinancial must be used inside FinancialProvider.'
    )
  }

  return context
}
