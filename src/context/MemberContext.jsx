import { createContext, useContext, useEffect, useState } from 'react'

const MemberContext = createContext(null)

const initialMembers = [
  {
    id: 1,
    rollNo: 'GF-1001',
    name: 'Ali Ahmed',
    phone: '03001234567',
    gender: 'Male',
    plan: 'Monthly',
    fee: 3000,
    paid: 0,
    expiry: '2026-11-25',
    dueDate: '2026-11-25',
    status: 'Active',
    payments: [],
  },
  {
    id: 2,
    rollNo: 'GF-1002',
    name: 'Usman Khan',
    phone: '03111234567',
    gender: 'Male',
    plan: 'Monthly',
    fee: 3000,
    paid: 1000,
    expiry: '2026-11-15',
    dueDate: '2026-11-15',
    status: 'Active',
    payments: [],
  },
  {
    id: 3,
    rollNo: 'GF-1003',
    name: 'Sara Malik',
    phone: '03221234567',
    gender: 'Female',
    plan: 'Quarterly',
    fee: 7500,
    paid: 0,
    expiry: '2026-10-20',
    dueDate: '2026-10-20',
    status: 'Expired',
    payments: [],
  },
  {
    id: 4,
    rollNo: 'GF-1004',
    name: 'Ahmed Raza',
    phone: '03331234567',
    gender: 'Male',
    plan: 'Monthly',
    fee: 3500,
    paid: 3500,
    expiry: '2026-11-12',
    dueDate: '2026-11-12',
    status: 'Active',
    payments: [],
  },
]

function loadMembers() {
  try {
    const savedMembers = localStorage.getItem('gymflow_members')

    if (savedMembers) {
      return JSON.parse(savedMembers)
    }
  } catch (error) {
    console.error('Could not load members:', error)
  }

  return initialMembers
}

export function MemberProvider({ children }) {
  const [members, setMembers] = useState(loadMembers)

  useEffect(() => {
    localStorage.setItem('gymflow_members', JSON.stringify(members))
  }, [members])

  function addMember(memberData) {
    const nextNumber =
      members.reduce((highest, member) => {
        const number = Number(member.rollNo?.replace('GF-', '')) || 1000
        return Math.max(highest, number)
      }, 1000) + 1

    const newMember = {
      id: Date.now(),
      rollNo: memberData.rollNo?.trim() || `GF-${nextNumber}`,
      name: memberData.name.trim(),
      phone: memberData.phone.trim(),
      gender: memberData.gender || 'Male',
      plan: memberData.plan || 'Monthly',
      fee: Number.isFinite(Number(memberData.fee))
        ? Number(memberData.fee)
        : 3000,
      paid: 0,
      expiry: memberData.expiry || '',
      dueDate: memberData.expiry || '',
      status: 'Active',
      payments: [],
      createdAt: new Date().toISOString(),
    }

    setMembers((current) => [...current, newMember])

    return newMember
  }

  function updateMember(id, updates) {
    setMembers((current) =>
      current.map((member) =>
        member.id === id
          ? {
              ...member,
              ...updates,
              dueDate: updates.expiry ?? updates.dueDate ?? member.dueDate,
              expiry: updates.dueDate ?? updates.expiry ?? member.expiry,
            }
          : member
      )
    )
  }

  function deleteMember(id) {
    setMembers((current) =>
      current.filter((member) => member.id !== id)
    )
  }

  function recordMemberPayment(id, payment) {
    setMembers((current) =>
      current.map((member) => {
        if (member.id !== id) return member

        const updatedPaid = Number(member.paid || 0) + Number(payment.amount || 0)
        const fullyPaid = updatedPaid >= Number(member.fee || 0)

        return {
          ...member,
          paid: updatedPaid,
          status: fullyPaid ? 'Active' : member.status,
          payments: [
            ...(member.payments || []),
            {
              ...payment,
              id: payment.id || Date.now(),
            },
          ],
        }
      })
    )
  }

  return (
    <MemberContext.Provider
      value={{
        members,
        setMembers,
        addMember,
        updateMember,
        deleteMember,
        recordMemberPayment,
      }}
    >
      {children}
    </MemberContext.Provider>
  )
}

export function useMembers() {
  const context = useContext(MemberContext)

  if (!context) {
    throw new Error('useMembers must be used inside MemberProvider')
  }

  return context
}
