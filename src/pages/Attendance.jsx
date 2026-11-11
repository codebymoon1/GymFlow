
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  UserCheck,
  Download,
  Pencil,
  Trash2,
  UserX,
} from 'lucide-react'
import { useMembers } from '../context/MemberContext'

const ATTENDANCE_KEY = 'gymflow_attendance'
const SETTINGS_KEY = 'gymflow_settings'

const defaultAttendanceSettings = {
  allowManualAttendance: true,
  preventDuplicateCheckin: true,
}

function getLocalDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMemberCategory(gender) {
  const value = String(gender || '').toLowerCase()

  if (['female', 'f', 'woman', 'women', 'lady', 'ladies'].includes(value)) {
    return 'Ladies'
  }

  if (['male', 'm', 'man', 'men', 'gent', 'gents'].includes(value)) {
    return 'Gents'
  }

  return 'Unknown'
}

function formatDate(date) {
  if (!date) return '—'

  return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function loadAttendance() {
  try {
    const saved = localStorage.getItem(ATTENDANCE_KEY)
    const parsed = saved ? JSON.parse(saved) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function loadConfiguredShifts() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)

    if (!saved) return []

    const settings = JSON.parse(saved)
    const shifts = settings?.attendance?.shifts

    if (!Array.isArray(shifts)) return []

    return shifts
      .filter((shift) => shift.active !== false)
      .map((shift) => ({
        id: String(shift.id),
        name: String(shift.name || 'Unnamed Shift'),
        category: String(shift.category || 'Gents'),
        startTime: shift.start || shift.startTime || '',
        endTime: shift.end || shift.endTime || '',
      }))
      .filter((shift) => shift.id && shift.name)
  } catch {
    return []
  }
}

function loadAttendanceSettings() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY)
    if (!saved) return defaultAttendanceSettings

    const attendance = JSON.parse(saved)?.attendance || {}
    return {
      allowManualAttendance:
        attendance.allowManualAttendance ?? defaultAttendanceSettings.allowManualAttendance,
      preventDuplicateCheckin:
        attendance.preventDuplicateCheckin ?? defaultAttendanceSettings.preventDuplicateCheckin,
    }
  } catch {
    return defaultAttendanceSettings
  }
}

function getEligibleDays(member, month, today) {
  const [year, monthNumber] = month.split('-').map(Number)

  const monthStart = `${month}-01`
  const monthEnd = new Date(year, monthNumber, 0)

  const monthEndString = [
    year,
    String(monthNumber).padStart(2, '0'),
    String(monthEnd.getDate()).padStart(2, '0'),
  ].join('-')

  const endDate = monthEndString > today ? today : monthEndString

  const createdDate = member.createdAt
    ? String(member.createdAt).slice(0, 10)
    : monthStart

  const startDate = createdDate > monthStart
    ? createdDate
    : monthStart

  const expiryDate = member.expiry || monthEndString
  const finalDate = expiryDate < endDate ? expiryDate : endDate

  if (startDate > finalDate) return 0

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${finalDate}T00:00:00`)

  return Math.floor((end - start) / 86400000) + 1
}

function downloadCSV(filename, headers, rows) {
  const csv = [headers, ...rows]
    .map((row) =>
      row.map((value) =>
        `"${String(value ?? '').replace(/"/g, '""')}"`
      ).join(',')
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

export default function Attendance({ navbarSearch = '' }) {
  const { members = [] } = useMembers()

  const today = getLocalDate()
  const currentMonth = today.slice(0, 7)

  const [rollNo, setRollNo] = useState('')
  const [shifts, setShifts] = useState(loadConfiguredShifts)
  const [attendanceSettings, setAttendanceSettings] = useState(loadAttendanceSettings)
  const [selectedShiftId, setSelectedShiftId] = useState('')
  const [result, setResult] = useState(null)
  const [logs, setLogs] = useState(loadAttendance)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('today')
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  const inputRef = useRef(null)

  // Refresh settings when Attendance mounts and when another tab updates them.
  useEffect(() => {
    function refreshShifts() {
      setShifts(loadConfiguredShifts())
      setAttendanceSettings(loadAttendanceSettings())
    }

    refreshShifts()
    window.addEventListener('storage', refreshShifts)

    return () => {
      window.removeEventListener('storage', refreshShifts)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(logs))
  }, [logs])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const effectiveSelectedShiftId = shifts.some(
    (shift) => shift.id === selectedShiftId
  ) ? selectedShiftId : shifts[0]?.id || ''
  const selectedShift = shifts.find(
    (shift) => shift.id === effectiveSelectedShiftId
  )

  function getApplicableShifts(member) {
    const category = getMemberCategory(member.gender)

    if (category === 'Unknown') return []

    return shifts.filter((shift) => {
      const shiftCategory = shift.category.toLowerCase()

      return (
        shiftCategory === category.toLowerCase() ||
        shiftCategory === 'mixed'
      )
    })
  }

  function getShiftForMember(member) {
    const applicable = getApplicableShifts(member)

    return (
      applicable.find((shift) => shift.id === selectedShiftId) ||
      applicable[0] ||
      null
    )
  }

  // Today's attendance
  const todayLogs = useMemo(
    () => logs.filter((log) => log.date === today),
    [logs, today]
  )

  const todayPresentLogs = todayLogs.filter(
    (log) => log.status === 'Present'
  )

  const presentIds = new Set(
    todayPresentLogs.map((log) => String(log.memberId))
  )

  const activeMembers = members.filter((member) => {
    if (member.expiry && member.expiry < today) return false
    return true
  })

  const absentMembers = activeMembers.filter(
    (member) => !presentIds.has(String(member.id))
  )

  const attendanceRate = activeMembers.length
    ? Math.round((presentIds.size / activeMembers.length) * 100)
    : 0

  // Monthly attendance
  const monthlyLogs = useMemo(
    () => logs.filter((log) => log.date?.startsWith(selectedMonth)),
    [logs, selectedMonth]
  )

  const monthlyPresent = monthlyLogs.filter(
    (log) => log.status === 'Present'
  )

  const monthlyAbsent = monthlyLogs.filter(
    (log) => log.status === 'Absent'
  )

  const monthlyReport = useMemo(() => {
    return members.map((member) => {
      const memberLogs = monthlyLogs.filter(
        (log) => String(log.memberId) === String(member.id)
      )

      const presentDays = memberLogs.filter(
        (log) => log.status === 'Present'
      ).length

      const recordedAbsent = memberLogs.filter(
        (log) => log.status === 'Absent'
      ).length

      const eligibleDays = getEligibleDays(
        member,
        selectedMonth,
        today
      )

      const notPresentDays = Math.max(eligibleDays - presentDays, 0)

      const percentage = eligibleDays
        ? Math.round((presentDays / eligibleDays) * 100)
        : 0

      return {
        ...member,
        presentDays,
        recordedAbsent,
        eligibleDays,
        notPresentDays,
        percentage,
      }
    })
  }, [members, monthlyLogs, selectedMonth, today])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        String(log.name || '').toLowerCase().includes(search.toLowerCase()) ||
        String(log.rollNo || '').toLowerCase().includes(search.toLowerCase()) ||
        String(log.shift || '').toLowerCase().includes(search.toLowerCase())
      const matchesNavbarSearch =
        `${log.name || ''} ${log.rollNo || ''} ${log.shift || ''} ${log.category || ''} ${log.date || ''}`
          .toLowerCase()
          .includes(navbarSearch.toLowerCase())

      const matchesDate =
        dateFilter === 'all' ||
        (dateFilter === 'today' && log.date === today)

      return matchesSearch && matchesNavbarSearch && matchesDate
    })
  }, [logs, search, navbarSearch, dateFilter, today])

  const monthlyAverage = monthlyReport.length
    ? Math.round(
        monthlyReport.reduce((sum, item) => sum + item.percentage, 0) /
          monthlyReport.length
      )
    : 0

  function resetInput() {
    setRollNo('')
    inputRef.current?.focus()
  }

  // Add or update a daily attendance record.
  function saveAttendance(member, status, manual = false) {
    if (manual && !attendanceSettings.allowManualAttendance) return

    const memberId = member.id

    const chosenShift = getShiftForMember(member)

    if (!chosenShift) {
      setResult({
        type: 'error',
        title: 'No Suitable Shift',
        message: `There is no active shift configured for ${member.name}'s membership category. Check Settings.`,
      })
      return
    }

    const existing = manual || attendanceSettings.preventDuplicateCheckin
      ? logs.find(
          (log) =>
            String(log.memberId) === String(memberId) &&
            log.date === today
        )
      : null

    const attendanceRecord = {
      id: existing?.id || `${Date.now()}-${memberId}`,
      memberId,
      rollNo: member.rollNo,
      name: member.name,

      // New dynamic shift information.
      shift: chosenShift.name,
      shiftId: chosenShift.id,
      shiftCategory: chosenShift.category,

      date: today,
      time: existing?.time || new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status,
      manuallyEdited: manual,
    }

    setLogs((current) => {
      if (status === 'Present' && !manual && !attendanceSettings.preventDuplicateCheckin) {
        return [attendanceRecord, ...current]
      }

      const index = current.findIndex(
        (log) =>
          String(log.memberId) === String(memberId) &&
          log.date === today
      )

      if (index === -1) {
        return [attendanceRecord, ...current]
      }

      return current.map((log, i) =>
        i === index ? attendanceRecord : log
      )
    })

    setResult({
      type: status === 'Present' ? 'success' : 'warning',
      title: status === 'Present' ? 'Attendance Recorded!' : 'Marked Absent',
      message: `${member.name} has been marked ${status.toLowerCase()} for ${chosenShift.name}.`,
    })
  }

  // Roll-number check-in.
  function handleAttendance(e) {
    e.preventDefault()

    const enteredRoll = rollNo.trim().toUpperCase()

    if (!enteredRoll) return

    const member = members.find(
      (item) =>
        String(item.rollNo || '').toUpperCase() === enteredRoll
    )

    if (!member) {
      setResult({
        type: 'error',
        title: 'Member Not Found',
        message: 'This Roll Number does not exist in your member records.',
      })
      resetInput()
      return
    }

    if (member.expiry && member.expiry < today) {
      setResult({
        type: 'error',
        title: 'Membership Expired',
        message: `${member.name}'s membership expired on ${formatDate(member.expiry)}.`,
      })
      resetInput()
      return
    }

    const applicableShifts = getApplicableShifts(member)

    if (applicableShifts.length === 0) {
      setResult({
        type: 'error',
        title: 'No Suitable Shift',
        message: `No active shift is configured for ${getMemberCategory(member.gender)} members. Please check Settings.`,
      })
      resetInput()
      return
    }

    const chosenShift = applicableShifts.find(
      (shift) => shift.id === effectiveSelectedShiftId
    )

    if (!chosenShift) {
      setResult({
        type: 'error',
        title: 'Select Correct Shift',
        message: `${member.name} cannot attend the selected shift. Please select an applicable shift.`,
      })
      resetInput()
      return
    }

    const alreadyMarked = attendanceSettings.preventDuplicateCheckin && logs.some(
      (log) =>
        String(log.memberId) === String(member.id) &&
        log.date === today
    )

    if (alreadyMarked) {
      setResult({
        type: 'warning',
        title: 'Already Recorded',
        message: `${member.name} already has an attendance record today. Contact the admin if it needs correction.`,
      })
      resetInput()
      return
    }

    saveAttendance(member, 'Present')
    resetInput()
  }

  // Manual attendance correction.
  function changeAttendanceStatus(log, newStatus) {
    if (!attendanceSettings.allowManualAttendance) return

    setLogs((current) =>
      current.map((item) =>
        item.id === log.id
          ? { ...item, status: newStatus, manuallyEdited: true }
          : item
      )
    )
  }

  function deleteAttendance(log) {
    if (!attendanceSettings.allowManualAttendance) return

    const confirmed = window.confirm(
      `Delete attendance record for ${log.name} on ${formatDate(log.date)}?`
    )

    if (!confirmed) return

    setLogs((current) =>
      current.filter((item) => item.id !== log.id)
    )
  }

  function exportAttendance() {
    const headers = [
      'Date',
      'Time',
      'Roll Number',
      'Member',
      'Shift',
      'Shift Category',
      'Status',
    ]

    const rows = filteredLogs.map((log) => [
      log.date,
      log.time,
      log.rollNo,
      log.name,
      log.shift,
      log.shiftCategory || '',
      log.status,
    ])

    downloadCSV(
      `gymflow-attendance-${today}.csv`,
      headers,
      rows
    )
  }

  function exportMonthlyReport() {
    const headers = [
      'Roll Number',
      'Member',
      'Present Days',
      'Recorded Absences',
      'Days Not Present',
      'Eligible Calendar Days',
      'Attendance Percentage',
    ]

    const rows = monthlyReport.map((member) => [
      member.rollNo,
      member.name,
      member.presentDays,
      member.recordedAbsent,
      member.notPresentDays,
      member.eligibleDays,
      `${member.percentage}%`,
    ])

    downloadCSV(
      `gymflow-monthly-attendance-${selectedMonth}.csv`,
      headers,
      rows
    )
  }

  return (
    <div className="space-y-8">

      {/* Heading */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Attendance Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage check-ins, daily registers and monthly attendance reports.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Present Today</p>
            <h2 className="text-2xl font-bold text-slate-900">
              {presentIds.size}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-red-50 p-3 text-red-600">
            <UserX size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Not Checked In</p>
            <h2 className="text-2xl font-bold text-slate-900">
              {absentMembers.length}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
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
          <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Attendance Rate</p>
            <h2 className="text-2xl font-bold text-slate-900">
              {attendanceRate}%
            </h2>
          </div>
        </div>

      </div>

      {/* Dynamic shift check-in */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            Member Check-in
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Select an active shift and enter the member's Roll Number.
          </p>
        </div>

        {shifts.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            No active shifts found. Go to Settings → Attendance and create or activate a shift first.
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Select Gym Shift
              </label>

              <select
                value={effectiveSelectedShiftId}
                onChange={(e) => {
                  setSelectedShiftId(e.target.value)
                  setResult(null)
                  inputRef.current?.focus()
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 sm:max-w-md"
              >
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name} ({shift.category})
                    {shift.startTime && shift.endTime
                      ? ` · ${shift.startTime}–${shift.endTime}`
                      : ''}
                  </option>
                ))}
              </select>

              {selectedShift && (
                <p className="mt-2 text-xs text-slate-400">
                  Selected: {selectedShift.name} · {selectedShift.category}
                </p>
              )}
            </div>

            <form onSubmit={handleAttendance}>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Member Roll Number
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-emerald-500">
                  <Search size={20} className="text-slate-400" />

                  <input
                    ref={inputRef}
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    placeholder="Enter member roll number"
                    className="w-full py-4 text-base outline-none"
                    autoComplete="off"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!rollNo.trim() || !effectiveSelectedShiftId}
                  className="rounded-xl bg-emerald-600 px-7 py-4 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Check In
                </button>
              </div>
            </form>
          </>
        )}

        {result && (
          <div
            className={`mt-6 flex items-start gap-4 rounded-xl border p-5 ${
              result.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : result.type === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {result.type === 'success' ? (
              <CheckCircle2 size={26} />
            ) : result.type === 'warning' ? (
              <Clock size={26} />
            ) : (
              <XCircle size={26} />
            )}

            <div>
              <h3 className="font-bold">{result.title}</h3>
              <p className="mt-1 text-sm">{result.message}</p>
            </div>
          </div>
        )}

        <p className="mt-5 text-xs text-slate-400">
          Active shifts are loaded from Settings. Each attendance record saves its shift ID and name.
        </p>
      </div>

      {/* Not checked in today */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h2 className="font-bold text-slate-900">
              Not Checked In Today
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              You can manually mark a member present or absent.
            </p>
          </div>

          <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
            {absentMembers.length} Members
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {absentMembers.map((member) => {
            const existing = todayLogs.find(
              (log) => String(log.memberId) === String(member.id)
            )

            const memberShifts = getApplicableShifts(member)

            return (
              <div
                key={member.id}
                className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {member.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Roll No: {member.rollNo || 'Not assigned'}
                    {' · '}
                    {getMemberCategory(member.gender)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {existing?.status === 'Absent' ? (
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                      Marked Absent
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      Not Present
                    </span>
                  )}

                  {attendanceSettings.allowManualAttendance && (
                    <button
                      onClick={() => saveAttendance(member, 'Present', true)}
                      disabled={memberShifts.length === 0}
                      className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                    >
                      Mark Present
                    </button>
                  )}

                  {attendanceSettings.allowManualAttendance && !existing && (
                    <button
                      onClick={() => saveAttendance(member, 'Absent', true)}
                      disabled={memberShifts.length === 0}
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-40"
                    >
                      Mark Absent
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {absentMembers.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              All active members have checked in today!
            </p>
          )}
        </div>
      </div>

      {/* Monthly report */}
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Monthly Attendance Report
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Review each member's monthly attendance.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />

            <button
              onClick={exportMonthlyReport}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Download size={17} />
              Export Report
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Present Records</p>
            <h3 className="mt-1 text-2xl font-bold text-emerald-600">
              {monthlyPresent.length}
            </h3>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Recorded Absences</p>
            <h3 className="mt-1 text-2xl font-bold text-red-600">
              {monthlyAbsent.length}
            </h3>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Members</p>
            <h3 className="mt-1 text-2xl font-bold text-slate-900">
              {members.length}
            </h3>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Average Attendance</p>
            <h3 className="mt-1 text-2xl font-bold text-blue-600">
              {monthlyAverage}%
            </h3>
          </div>

        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-4">Roll No</th>
                <th className="px-4 py-4">Member</th>
                <th className="px-4 py-4">Present</th>
                <th className="px-4 py-4">Recorded Absent</th>
                <th className="px-4 py-4">Not Present</th>
                <th className="px-4 py-4">Attendance</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {monthlyReport.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 font-semibold text-emerald-700">
                    {member.rollNo || '—'}
                  </td>

                  <td className="px-4 py-4 font-medium text-slate-800">
                    {member.name}
                  </td>

                  <td className="px-4 py-4 font-semibold text-emerald-600">
                    {member.presentDays}
                  </td>

                  <td className="px-4 py-4 text-red-600">
                    {member.recordedAbsent}
                  </td>

                  <td className="px-4 py-4 text-slate-600">
                    {member.notPresentDays}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${member.percentage}%` }}
                        />
                      </div>
                      <span className="font-semibold text-slate-700">
                        {member.percentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}

              {monthlyReport.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-slate-400">
                    No members available for this report.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400">
          Attendance percentage uses eligible calendar days in the selected month.
          Recorded absences are separate from days without a check-in record.
        </p>
      </div>

      {/* Attendance register */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">
              Attendance Register
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              View, correct or remove attendance records.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
            >
              <option value="today">Today</option>
              <option value="all">All History</option>
            </select>

            <button
              onClick={exportAttendance}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Download size={17} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="border-b border-slate-100 p-5">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4">
            <Search size={19} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by member, roll number or shift..."
              className="w-full py-3 text-sm outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Roll No</th>
                <th className="px-5 py-4">Member</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Shift</th>
                <th className="px-5 py-4">Time</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">

                  <td className="px-5 py-4 font-semibold text-emerald-700">
                    {log.rollNo || '—'}
                  </td>

                  <td className="px-5 py-4 font-medium text-slate-800">
                    {log.name}
                  </td>

                  <td className="px-5 py-4 text-slate-500">
                    {formatDate(log.date)}
                  </td>

                  <td className="px-5 py-4 text-slate-500">
                    <div>{log.shift || '—'}</div>
                    {log.shiftCategory && (
                      <div className="mt-1 text-xs text-slate-400">
                        {log.shiftCategory}
                      </div>
                    )}
                  </td>

                  <td className="px-5 py-4 text-slate-500">
                    {log.time}
                  </td>

                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      log.status === 'Present'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-600'
                    }`}>
                      {log.status}
                    </span>

                    {log.manuallyEdited && (
                      <p className="mt-1 text-xs text-slate-400">
                        Manually edited
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    {attendanceSettings.allowManualAttendance && (
                    <div className="flex items-center gap-2">

                      <button
                        title="Toggle attendance status"
                        onClick={() =>
                          changeAttendanceStatus(
                            log,
                            log.status === 'Present' ? 'Absent' : 'Present'
                          )
                        }
                        className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil size={17} />
                      </button>

                      <button
                        title="Delete attendance record"
                        onClick={() => deleteAttendance(log)}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={17} />
                      </button>

                    </div>
                    )}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-400">
          Showing {filteredLogs.length} attendance record(s)
        </div>

      </div>

    </div>
  )
}
