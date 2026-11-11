
import { useEffect, useState } from 'react'
import {
  Settings as SettingsIcon,
  Building2,
  CreditCard,
  Clock3,
  SlidersHorizontal,
  Plus,
  Trash2,
  Pencil,
  Save,
  Download,
  Upload,
  RotateCcw,
  Check,
  ShieldCheck,
} from 'lucide-react'

const STORAGE_KEY = 'gymflow_settings'

const defaultSettings = {
  gym: {
    name: 'GymFlow Fitness Club',
    phone: '',
    email: '',
    address: '',
    website: '',
    currency: 'PKR',
  },

  plans: [
    { id: 1, name: 'Monthly', duration: 30, fee: 3000, active: true },
    { id: 2, name: 'Quarterly', duration: 90, fee: 8000, active: true },
    { id: 3, name: 'Half Yearly', duration: 180, fee: 15000, active: true },
    { id: 4, name: 'Yearly', duration: 365, fee: 28000, active: true },
  ],

  attendance: {
    openingTime: '06:00',
    closingTime: '23:00',

    shifts: [
      {
        id: 'gents-1',
        name: 'Gents Shift 1',
        category: 'Gents',
        start: '15:00',
        end: '23:00',
        active: true,
      },
      {
        id: 'gents-2',
        name: 'Gents Shift 2',
        category: 'Gents',
        start: '',
        end: '',
        active: false,
      },
      {
        id: 'ladies-1',
        name: 'Ladies Shift',
        category: 'Ladies',
        start: '09:00',
        end: '13:00',
        active: true,
      },
    ],

    allowManualAttendance: true,
    preventDuplicateCheckin: true,
  },

  payments: {
    methods: ['Cash', 'JazzCash', 'EasyPaisa', 'Bank Transfer'],
    receiptPrefix: 'GF',
    allowPartialPayments: true,
    requirePaymentNotes: false,
  },

  preferences: {
    dateFormat: 'DD/MM/YYYY',
    language: 'English',
    notifications: true,
    lowBalanceWarning: true,
    lowBalanceLimit: 5000,
    autoSave: true,
    compactTables: false,
  },
}

// Migrate old saved settings into the new dynamic shift structure.
function migrateOldShifts(attendance) {
  if (Array.isArray(attendance?.shifts)) {
    return attendance.shifts
  }

  const shifts = []

  if (attendance?.gents) {
    shifts.push({
      id: 'gents-1',
      name: 'Gents Shift 1',
      category: 'Gents',
      start: attendance.gents.start || '',
      end: attendance.gents.end || '',
      active: attendance.gents.enabled ?? true,
    })
  }

  if (attendance?.ladies) {
    shifts.push({
      id: 'ladies-1',
      name: 'Ladies Shift',
      category: 'Ladies',
      start: attendance.ladies.start || '',
      end: attendance.ladies.end || '',
      active: attendance.ladies.enabled ?? true,
    })
  }

  if (shifts.length === 0) {
    return defaultSettings.attendance.shifts
  }

  return shifts
}

function normalizeSettings(parsed) {
  return {
    ...defaultSettings,
    ...parsed,

    gym: {
      ...defaultSettings.gym,
      ...parsed.gym,
    },

    plans: Array.isArray(parsed.plans)
      ? parsed.plans
      : defaultSettings.plans,

    attendance: {
      ...defaultSettings.attendance,
      ...parsed.attendance,
      shifts: migrateOldShifts(parsed.attendance),
    },

    payments: {
      ...defaultSettings.payments,
      ...parsed.payments,
      methods: Array.isArray(parsed.payments?.methods)
        ? parsed.payments.methods
        : defaultSettings.payments.methods,
    },

    preferences: {
      ...defaultSettings.preferences,
      ...parsed.preferences,
    },
  }
}

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (!saved) {
      return JSON.parse(JSON.stringify(defaultSettings))
    }

    return normalizeSettings(JSON.parse(saved))
  } catch {
    return JSON.parse(JSON.stringify(defaultSettings))
  }
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  ...props
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </span>

      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        {...props}
      />
    </label>
  )
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>

        {description && (
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}

function SectionHeading({ title, description }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  )
}

export default function Settings() {
  const [settings, setSettings] = useState(loadSettings)
  const [activeTab, setActiveTab] = useState('gym')
  const [savedMessage, setSavedMessage] = useState('')

  const [planForm, setPlanForm] = useState({
    name: '',
    duration: '',
    fee: '',
  })

  const [editingPlan, setEditingPlan] = useState(null)

  const [shiftForm, setShiftForm] = useState({
    name: '',
    category: 'Gents',
    start: '',
    end: '',
  })

  const [editingShift, setEditingShift] = useState(null)

  const tabs = [
    { id: 'gym', label: 'Gym Profile', icon: Building2 },
    { id: 'plans', label: 'Membership Plans', icon: ShieldCheck },
    { id: 'attendance', label: 'Attendance & Shifts', icon: Clock3 },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
  ]

  useEffect(() => {
    if (!savedMessage) return

    const timer = setTimeout(() => {
      setSavedMessage('')
    }, 3000)

    return () => clearTimeout(timer)
  }, [savedMessage])

  const updateSection = (section, field, value) => {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }))
  }

  const saveSettings = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      setSavedMessage('Settings saved successfully!')
    } catch {
      setSavedMessage('Unable to save settings. Check browser storage.')
    }
  }

  const resetSettings = () => {
    const confirmed = window.confirm(
      'Reset all settings to their default values?'
    )

    if (!confirmed) return

    const freshSettings = JSON.parse(JSON.stringify(defaultSettings))

    setSettings(freshSettings)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(freshSettings))
    setSavedMessage('Settings restored to defaults.')
  }

  // MEMBERSHIP PLAN MANAGEMENT

  const addOrUpdatePlan = (e) => {
    e.preventDefault()

    const name = planForm.name.trim()
    const duration = Number(planForm.duration)
    const fee = Number(planForm.fee)

    if (!name || !Number.isInteger(duration) || duration <= 0 || !Number.isFinite(fee) || fee < 0) {
      setSavedMessage('Please enter valid membership plan details.')
      return
    }

    if (editingPlan !== null) {
      setSettings((current) => ({
        ...current,
        plans: current.plans.map((plan) =>
          plan.id === editingPlan
            ? { ...plan, name, duration, fee }
            : plan
        ),
      }))
    } else {
      setSettings((current) => ({
        ...current,
        plans: [
          ...current.plans,
          {
            id: Date.now(),
            name,
            duration,
            fee,
            active: true,
          },
        ],
      }))
    }

    setPlanForm({ name: '', duration: '', fee: '' })
    setEditingPlan(null)
  }

  const editPlan = (plan) => {
    setEditingPlan(plan.id)

    setPlanForm({
      name: plan.name,
      duration: String(plan.duration),
      fee: String(plan.fee),
    })
  }

  const deletePlan = (id) => {
    if (!window.confirm('Delete this membership plan?')) return

    setSettings((current) => ({
      ...current,
      plans: current.plans.filter((plan) => plan.id !== id),
    }))

    if (editingPlan === id) {
      setEditingPlan(null)
      setPlanForm({ name: '', duration: '', fee: '' })
    }
  }

  const togglePlan = (id) => {
    setSettings((current) => ({
      ...current,
      plans: current.plans.map((plan) =>
        plan.id === id
          ? { ...plan, active: !plan.active }
          : plan
      ),
    }))
  }

  // DYNAMIC SHIFT MANAGEMENT

  const resetShiftForm = () => {
    setEditingShift(null)

    setShiftForm({
      name: '',
      category: 'Gents',
      start: '',
      end: '',
    })
  }

  const saveShift = (e) => {
    e.preventDefault()

    const name = shiftForm.name.trim()

    if (!name || !shiftForm.start || !shiftForm.end) {
      setSavedMessage('Please complete all shift details.')
      return
    }

    if (shiftForm.start >= shiftForm.end) {
      setSavedMessage('Shift end time must be after start time.')
      return
    }

    if (
      settings.attendance.shifts.some(
        (shift) =>
          shift.id !== editingShift &&
          shift.name.trim().toLowerCase() === name.toLowerCase()
      )
    ) {
      setSavedMessage('A shift with this name already exists.')
      return
    }

    if (editingShift !== null) {
      setSettings((current) => ({
        ...current,
        attendance: {
          ...current.attendance,
          shifts: current.attendance.shifts.map((shift) =>
            shift.id === editingShift
              ? {
                  ...shift,
                  ...shiftForm,
                  name,
                }
              : shift
          ),
        },
      }))
    } else {
      setSettings((current) => ({
        ...current,
        attendance: {
          ...current.attendance,
          shifts: [
            ...current.attendance.shifts,
            {
              id: `shift-${Date.now()}`,
              ...shiftForm,
              name,
              active: true,
            },
          ],
        },
      }))
    }

    resetShiftForm()
    setSavedMessage('Shift updated. Save settings to keep your changes.')
  }

  const editShift = (shift) => {
    setEditingShift(shift.id)

    setShiftForm({
      name: shift.name,
      category: shift.category,
      start: shift.start,
      end: shift.end,
    })
  }

  const toggleShift = (id) => {
    setSettings((current) => ({
      ...current,
      attendance: {
        ...current.attendance,
        shifts: current.attendance.shifts.map((shift) =>
          shift.id === id
            ? { ...shift, active: !shift.active }
            : shift
        ),
      },
    }))
  }

  const deleteShift = (id) => {
    if (!window.confirm('Delete this shift?')) return

    setSettings((current) => ({
      ...current,
      attendance: {
        ...current.attendance,
        shifts: current.attendance.shifts.filter(
          (shift) => shift.id !== id
        ),
      },
    }))

    if (editingShift === id) {
      resetShiftForm()
    }
  }

  // PAYMENT SETTINGS

  const togglePaymentMethod = (method) => {
    const methods = settings.payments.methods

    updateSection(
      'payments',
      'methods',
      methods.includes(method)
        ? methods.filter((item) => item !== method)
        : [...methods, method]
    )
  }

  // BACKUP AND RESTORE

  const exportSettings = () => {
    const blob = new Blob(
      [JSON.stringify(settings, null, 2)],
      { type: 'application/json' }
    )

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'gymflow-settings-backup.json'
    link.click()

    URL.revokeObjectURL(url)
  }

  const importSettings = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result)

        if (
          !imported ||
          typeof imported !== 'object' ||
          !imported.gym ||
          !Array.isArray(imported.plans)
        ) {
          throw new Error('Invalid settings file')
        }

        const confirmed = window.confirm(
          'Import these settings? Your current settings will be replaced.'
        )

        if (!confirmed) return

        const merged = normalizeSettings(imported)

        setSettings(merged)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
        resetShiftForm()
        setSavedMessage('Settings imported successfully!')
      } catch {
        setSavedMessage('Invalid settings backup file.')
      } finally {
        e.target.value = ''
      }
    }

    reader.readAsText(file)
  }

  const currencySymbol =
    settings.gym.currency === 'PKR'
      ? 'Rs'
      : settings.gym.currency === 'USD'
        ? '$'
        : settings.gym.currency === 'GBP'
          ? '£'
          : '€'

  const activeTabInfo = tabs.find((tab) => tab.id === activeTab)

  return (
    <div className="min-h-screen space-y-6 bg-gray-50 p-4 md:p-6">

      {/* HEADER */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
            <SettingsIcon size={23} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Settings
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage your gym and application configuration
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportSettings}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download size={16} />
            Backup
          </button>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Upload size={16} />
            Restore

            <input
              type="file"
              accept=".json,application/json"
              onChange={importSettings}
              className="hidden"
            />
          </label>

          <button
            onClick={saveSettings}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>

      {savedMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          <Check size={17} />
          {savedMessage}
        </div>
      )}

      {/* MAIN LAYOUT */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[250px_1fr]">

        {/* SIDEBAR */}

        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <p className="px-3 pb-3 pt-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Configuration
          </p>

          <div className="flex gap-2 overflow-x-auto lg:flex-col">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                    active
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="mt-5 hidden rounded-xl bg-gray-50 p-3 lg:block">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
              <ShieldCheck size={15} />
              Local Settings
            </div>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              Settings are stored in this browser until database
              integration is completed.
            </p>
          </div>
        </aside>

        {/* CONTENT */}

        <main className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-6 flex items-center gap-2 text-xs text-gray-400">
            <SettingsIcon size={14} />
            Settings
            <span>/</span>
            <span className="font-medium text-gray-700">
              {activeTabInfo?.label}
            </span>
          </div>

          {/* GYM PROFILE */}

          {activeTab === 'gym' && (
            <div>
              <SectionHeading
                title="Gym Profile"
                description="Manage your gym's basic information and contact details."
              />

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field
                  label="Gym Name"
                  value={settings.gym.name}
                  onChange={(v) => updateSection('gym', 'name', v)}
                  placeholder="Enter gym name"
                />

                <Field
                  label="Phone Number"
                  value={settings.gym.phone}
                  onChange={(v) => updateSection('gym', 'phone', v)}
                  placeholder="+92 300 0000000"
                />

                <Field
                  label="Email Address"
                  type="email"
                  value={settings.gym.email}
                  onChange={(v) => updateSection('gym', 'email', v)}
                  placeholder="gym@example.com"
                />

                <Field
                  label="Website"
                  value={settings.gym.website}
                  onChange={(v) => updateSection('gym', 'website', v)}
                  placeholder="https://example.com"
                />

                <div className="md:col-span-2">
                  <Field
                    label="Gym Address"
                    value={settings.gym.address}
                    onChange={(v) => updateSection('gym', 'address', v)}
                    placeholder="Enter complete gym address"
                  />
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">
                    Currency
                  </span>

                  <select
                    value={settings.gym.currency}
                    onChange={(e) =>
                      updateSection('gym', 'currency', e.target.value)
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="PKR">PKR - Pakistani Rupee</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </label>
              </div>

              <div className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
                <strong>Note:</strong> Currency changes here do not
                automatically convert existing wallet balances or
                transactions.
              </div>
            </div>
          )}

          {/* MEMBERSHIP PLANS */}

          {activeTab === 'plans' && (
            <div>
              <SectionHeading
                title="Membership Plans"
                description="Create and manage the membership packages offered by your gym."
              />

              <form
                onSubmit={addOrUpdatePlan}
                className="mb-7 rounded-2xl border border-gray-200 bg-gray-50 p-4"
              >
                <h3 className="mb-4 font-semibold text-gray-800">
                  {editingPlan !== null ? 'Edit Plan' : 'Add New Plan'}
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field
                    label="Plan Name"
                    value={planForm.name}
                    onChange={(v) =>
                      setPlanForm((p) => ({ ...p, name: v }))
                    }
                    placeholder="e.g. Monthly"
                    required
                  />

                  <Field
                    label="Duration (Days)"
                    type="number"
                    min="1"
                    value={planForm.duration}
                    onChange={(v) =>
                      setPlanForm((p) => ({ ...p, duration: v }))
                    }
                    placeholder="30"
                    required
                  />

                  <Field
                    label={`Fee (${currencySymbol})`}
                    type="number"
                    min="0"
                    value={planForm.fee}
                    onChange={(v) =>
                      setPlanForm((p) => ({ ...p, fee: v }))
                    }
                    placeholder="3000"
                    required
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <Plus size={16} />
                    {editingPlan !== null ? 'Update Plan' : 'Add Plan'}
                  </button>

                  {editingPlan !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlan(null)
                        setPlanForm({
                          name: '',
                          duration: '',
                          fee: '',
                        })
                      }}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Plan</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Fee</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {settings.plans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 font-semibold text-gray-800">
                          {plan.name}
                        </td>

                        <td className="px-4 py-4 text-gray-600">
                          {plan.duration} days
                        </td>

                        <td className="px-4 py-4 font-medium text-gray-800">
                          {currencySymbol}{' '}
                          {Number(plan.fee).toLocaleString()}
                        </td>

                        <td className="px-4 py-4">
                          <button
                            onClick={() => togglePlan(plan.id)}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              plan.active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {plan.active ? 'Active' : 'Inactive'}
                          </button>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => editPlan(plan)}
                              className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                              title="Edit plan"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              onClick={() => deletePlan(plan.id)}
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                              title="Delete plan"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {settings.plans.length === 0 && (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-4 py-10 text-center text-gray-400"
                        >
                          No membership plans created yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ATTENDANCE AND DYNAMIC SHIFTS */}

          {activeTab === 'attendance' && (
            <div>
              <SectionHeading
                title="Attendance & Shift Management"
                description="Create and manage as many gym shifts as you need."
              />

              <div className="mb-6 rounded-2xl border border-gray-200 p-5">
                <h3 className="mb-4 font-semibold text-gray-800">
                  Gym Operating Hours
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    label="Opening Time"
                    type="time"
                    value={settings.attendance.openingTime}
                    onChange={(v) =>
                      updateSection('attendance', 'openingTime', v)
                    }
                  />

                  <Field
                    label="Closing Time"
                    type="time"
                    value={settings.attendance.closingTime}
                    onChange={(v) =>
                      updateSection('attendance', 'closingTime', v)
                    }
                  />
                </div>
              </div>

              {/* SHIFT FORM */}

              <form
                onSubmit={saveShift}
                className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-5"
              >
                <h3 className="mb-4 font-semibold text-gray-800">
                  {editingShift !== null ? 'Edit Shift' : 'Create New Shift'}
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field
                    label="Shift Name"
                    value={shiftForm.name}
                    onChange={(v) =>
                      setShiftForm((current) => ({
                        ...current,
                        name: v,
                      }))
                    }
                    placeholder="e.g. Gents Evening"
                    required
                  />

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">
                      Shift Category
                    </span>

                    <select
                      value={shiftForm.category}
                      onChange={(e) =>
                        setShiftForm((current) => ({
                          ...current,
                          category: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="Gents">Gents</option>
                      <option value="Ladies">Ladies</option>
                      <option value="Mixed">Mixed</option>
                    </select>
                  </label>

                  <Field
                    label="Start Time"
                    type="time"
                    value={shiftForm.start}
                    onChange={(v) =>
                      setShiftForm((current) => ({
                        ...current,
                        start: v,
                      }))
                    }
                    required
                  />

                  <Field
                    label="End Time"
                    type="time"
                    value={shiftForm.end}
                    onChange={(v) =>
                      setShiftForm((current) => ({
                        ...current,
                        end: v,
                      }))
                    }
                    required
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    <Plus size={16} />
                    {editingShift !== null ? 'Update Shift' : 'Add Shift'}
                  </button>

                  {editingShift !== null && (
                    <button
                      type="button"
                      onClick={resetShiftForm}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              {/* SHIFT LIST */}

              <div className="mb-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">
                    Configured Shifts
                  </h3>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {settings.attendance.shifts.length} shifts
                  </span>
                </div>

                <div className="space-y-3">
                  {settings.attendance.shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex flex-col justify-between gap-4 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-gray-800">
                            {shift.name}
                          </h4>

                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                            {shift.category}
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              shift.active
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {shift.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-gray-500">
                          {shift.start || '--:--'} – {shift.end || '--:--'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => toggleShift(shift.id)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          {shift.active ? 'Deactivate' : 'Activate'}
                        </button>

                        <button
                          onClick={() => editShift(shift)}
                          className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                          title="Edit shift"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          onClick={() => deleteShift(shift.id)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                          title="Delete shift"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {settings.attendance.shifts.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                      No shifts configured. Create your first shift above.
                    </div>
                  )}
                </div>
              </div>

              {/* ATTENDANCE OPTIONS */}

              <div className="rounded-2xl border border-gray-200 px-5">
                <Toggle
                  label="Allow manual attendance"
                  description="Allow staff to mark attendance manually."
                  checked={settings.attendance.allowManualAttendance}
                  onChange={(v) =>
                    updateSection(
                      'attendance',
                      'allowManualAttendance',
                      v
                    )
                  }
                />

                <div className="border-t border-gray-100">
                  <Toggle
                    label="Prevent duplicate check-ins"
                    description="Prevent a member from being checked in twice on the same day."
                    checked={settings.attendance.preventDuplicateCheckin}
                    onChange={(v) =>
                      updateSection(
                        'attendance',
                        'preventDuplicateCheckin',
                        v
                      )
                    }
                  />
                </div>
              </div>

              <p className="mt-4 text-xs text-amber-700">
                Active shifts and their timings are used by Attendance after
                you save these settings. Existing attendance records keep the
                shift name and category captured when they were created.
              </p>
            </div>
          )}

          {/* PAYMENTS */}

          {activeTab === 'payments' && (
            <div>
              <SectionHeading
                title="Payment Settings"
                description="Choose accepted payment methods and configure payment preferences."
              />

              <div className="mb-7 rounded-2xl border border-gray-200 p-5">
                <h3 className="mb-1 font-semibold text-gray-800">
                  Accepted Payment Methods
                </h3>

                <p className="mb-4 text-sm text-gray-500">
                  Select the payment methods your gym accepts.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    'Cash',
                    'JazzCash',
                    'EasyPaisa',
                    'Bank Transfer',
                    'Credit Card',
                    'Debit Card',
                    'Other',
                  ].map((method) => {
                    const checked =
                      settings.payments.methods.includes(method)

                    return (
                      <label
                        key={method}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                          checked
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePaymentMethod(method)}
                          className="h-4 w-4 accent-blue-600"
                        />

                        <span className="text-sm font-medium text-gray-700">
                          {method}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="mb-5 rounded-2xl border border-gray-200 p-5">
                <h3 className="mb-4 font-semibold text-gray-800">
                  Receipt Configuration
                </h3>

                <Field
                  label="Receipt Reference Prefix"
                  value={settings.payments.receiptPrefix}
                  onChange={(v) =>
                    updateSection('payments', 'receiptPrefix', v)
                  }
                  placeholder="GF"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Example: GF-1001. This does not change existing transaction
                  reference numbers.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 px-5">
                <Toggle
                  label="Allow partial payments"
                  description="Allow members to pay their fees in installments."
                  checked={settings.payments.allowPartialPayments}
                  onChange={(v) =>
                    updateSection(
                      'payments',
                      'allowPartialPayments',
                      v
                    )
                  }
                />

                <div className="border-t border-gray-100">
                  <Toggle
                    label="Require payment notes"
                    description="Require a note when recording a payment."
                    checked={settings.payments.requirePaymentNotes}
                    onChange={(v) =>
                      updateSection(
                        'payments',
                        'requirePaymentNotes',
                        v
                      )
                    }
                  />
                </div>
              </div>

              <p className="mt-4 text-xs text-amber-700">
                Billing and Wallet use these accepted payment methods. Partial
                payment and note requirements are enforced when recording a
                membership payment.
              </p>
            </div>
          )}

          {/* PREFERENCES */}

          {activeTab === 'preferences' && (
            <div>
              <SectionHeading
                title="System Preferences"
                description="Customize how GymFlow displays and manages information."
              />

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">
                    Date Format
                  </span>

                  <select
                    value={settings.preferences.dateFormat}
                    onChange={(e) =>
                      updateSection(
                        'preferences',
                        'dateFormat',
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">
                    Language
                  </span>

                  <select
                    value={settings.preferences.language}
                    onChange={(e) =>
                      updateSection(
                        'preferences',
                        'language',
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="English">English</option>
                    <option value="Urdu">Urdu</option>
                  </select>
                </label>
              </div>

              <div className="rounded-2xl border border-gray-200 px-5">
                <Toggle
                  label="Notifications"
                  description="Enable application notification preferences."
                  checked={settings.preferences.notifications}
                  onChange={(v) =>
                    updateSection('preferences', 'notifications', v)
                  }
                />

                <div className="border-t border-gray-100">
                  <Toggle
                    label="Low wallet balance warning"
                    description="Configure a warning threshold for low wallet balances."
                    checked={settings.preferences.lowBalanceWarning}
                    onChange={(v) =>
                      updateSection(
                        'preferences',
                        'lowBalanceWarning',
                        v
                      )
                    }
                  />
                </div>

                <div className="border-t border-gray-100">
                  <Toggle
                    label="Auto-save preference"
                    description="Preference for automatic saving behavior."
                    checked={settings.preferences.autoSave}
                    onChange={(v) =>
                      updateSection('preferences', 'autoSave', v)
                    }
                  />
                </div>

                <div className="border-t border-gray-100">
                  <Toggle
                    label="Compact tables"
                    description="Preference for denser table layouts."
                    checked={settings.preferences.compactTables}
                    onChange={(v) =>
                      updateSection(
                        'preferences',
                        'compactTables',
                        v
                      )
                    }
                  />
                </div>
              </div>

              <div className="mt-5 max-w-sm">
                <Field
                  label="Low Balance Warning Threshold"
                  type="number"
                  min="0"
                  value={settings.preferences.lowBalanceLimit}
                  onChange={(v) =>
                    updateSection(
                      'preferences',
                      'lowBalanceLimit',
                      Number(v)
                    )
                  }
                  placeholder="5000"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Amount in {settings.gym.currency}. Active wallets below this
                  threshold appear in Wallet alerts when warnings are enabled.
                </p>
              </div>
            </div>
          )}

          {/* BOTTOM ACTIONS */}

          <div className="mt-10 flex flex-col justify-between gap-4 border-t border-gray-100 pt-6 sm:flex-row sm:items-center">
            <button
              onClick={resetSettings}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <RotateCcw size={16} />
              Reset Defaults
            </button>

            <button
              onClick={saveSettings}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Save size={17} />
              Save All Settings
            </button>
          </div>
        </main>
      </div>
    </div>
  )
}
