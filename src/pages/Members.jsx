
import { useState } from 'react'
import {
  Search,
  Plus,
  Users,
  UserPlus,
  X,
} from 'lucide-react'
import { useMembers } from '../context/MemberContext.jsx'

function getActivePlans() {
  try {
    const settings = JSON.parse(localStorage.getItem('gymflow_settings') || '{}')
    return Array.isArray(settings.plans)
      ? settings.plans.filter((plan) => plan.active !== false)
      : []
  } catch {
    return []
  }
}

export default function Members({ navbarSearch = '' }) {
  const { members, addMember, deleteMember } = useMembers()
  const configuredPlans = getActivePlans()
  const planOptions = configuredPlans.length
    ? configuredPlans.map((plan) => plan.name)
    : ['Monthly', 'Quarterly', 'Yearly']

  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    gender: 'Male',
    plan: planOptions[0] || 'Monthly',
    expiry: '',
  })

  function getMemberStatus(member) {
    if (!member.expiry) return member.status || 'Active'

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const expiryDate = new Date(`${member.expiry}T00:00:00`)

    return expiryDate < today ? 'Expired' : 'Active'
  }

  const filteredMembers = members.filter((member) =>
    `${member.name} ${member.rollNo} ${member.phone}`
      .toLowerCase()
      .includes(search.toLowerCase()) &&
      `${member.name} ${member.rollNo} ${member.phone}`.toLowerCase().includes(navbarSearch.toLowerCase())
  )

  const activeCount = members.filter(
    (member) => getMemberStatus(member) === 'Active'
  ).length

  function handleAddMember(e) {
    e.preventDefault()

    if (!form.name.trim() || !form.phone.trim() || !form.expiry) {
      return
    }

    const configuredPlan = configuredPlans.find((plan) => plan.name === form.plan)
    addMember({ ...form, fee: configuredPlan?.fee })

    setForm({
      name: '',
      phone: '',
      gender: 'Male',
      plan: planOptions[0] || 'Monthly',
      expiry: '',
    })

    setShowForm(false)
  }

  function handleDelete(id) {
    const confirmed = window.confirm(
      'Are you sure you want to delete this member?'
    )

    if (confirmed) {
      deleteMember(id)
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Members Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage gym members and their memberships.
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          <Plus size={18} />
          Add New Member
        </button>
      </div>

      {/* Statistics */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Members</p>
            <h2 className="text-2xl font-bold text-slate-900">
              {members.length}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
            <UserPlus size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Active Members</p>
            <h2 className="text-2xl font-bold text-slate-900">
              {activeCount}
            </h2>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-bold text-slate-900">All Members</h2>
            <p className="mt-1 text-sm text-slate-400">
              View and manage registered members.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search name or Roll No..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm outline-none sm:w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Roll No</th>
                <th className="px-5 py-4">Member</th>
                <th className="px-5 py-4">Phone</th>
                <th className="px-5 py-4">Plan</th>
                <th className="px-5 py-4">Expiry Date</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((member) => {
                const status = getMemberStatus(member)

                return (
                  <tr key={member.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-emerald-700">
                      {member.rollNo}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <p className="font-semibold text-slate-800">
                        {member.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {member.gender}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                      {member.phone}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {member.plan}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {member.expiry || '—'}
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        {status}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4">
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="text-sm font-medium text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}

              {filteredMembers.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-5 py-12 text-center text-slate-400"
                  >
                    No members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Register New Member
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Enter the member's details below.
                </p>
              </div>

              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Full Name
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Enter full name"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Phone Number
                </label>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                  placeholder="03XXXXXXXXX"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Gender
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) =>
                      setForm({ ...form, gender: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
                  >
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Membership Plan
                  </label>
                  <select
                    value={form.plan}
                    onChange={(e) => setForm({ ...form, plan: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none"
                  >
                    {!planOptions.includes(form.plan) && <option>{form.plan}</option>}
                    {planOptions.map((plan) => <option key={plan}>{plan}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Membership Expiry
                </label>
                <input
                  required
                  type="date"
                  value={form.expiry}
                  onChange={(e) =>
                    setForm({ ...form, expiry: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Register Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
