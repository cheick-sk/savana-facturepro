import { create } from 'zustand'
import api from '../lib/api'
import toast from 'react-hot-toast'

// Types
export interface AttendanceSession {
  id: number
  class_id: number
  date: string
  created_by: number
  total_students: number
  present_count: number
  absent_count: number
  late_count: number
  excused_count: number
  status: 'in_progress' | 'completed'
  created_at: string
  updated_at: string
  class_name?: string
  created_by_name?: string
}

export interface AttendanceRecord {
  id: number
  session_id: number
  student_id: number
  status: 'present' | 'absent' | 'late' | 'excused'
  arrival_time: string | null
  notes: string | null
  parent_notified: boolean
  notification_sent_at: string | null
  created_at: string
  student_first_name?: string
  student_last_name?: string
  student_number?: string
}

export interface AttendanceSessionDetail extends AttendanceSession {
  records: AttendanceRecord[]
}

export interface AttendanceStats {
  total_days: number
  present_days: number
  absent_days: number
  late_days: number
  excused_days: number
  attendance_rate: number
  punctuality_rate: number
}

export interface ClassStats extends AttendanceStats {
  class_id: number
  class_name: string
  period_start: string
  period_end: string
}

export interface StudentStats extends AttendanceStats {
  student_id: number
  student_name: string
  student_number: string
  consecutive_absences: number
}

export interface DailyStats {
  date: string
  present: number
  absent: number
  late: number
  excused: number
  total: number
  attendance_rate: number
}

export interface CalendarDay {
  date: string
  status: 'completed' | 'in_progress' | 'not_started'
  present_count: number
  absent_count: number
  late_count: number
  total_students: number
}

export interface AttendanceSettings {
  id: number
  auto_notify_absence: boolean
  notification_channels: string[]
  late_threshold_minutes: number
  absence_alert_after: number
  school_start_time: string | null
  school_end_time: string | null
}

interface AttendanceState {
  // Sessions
  sessions: AttendanceSession[]
  currentSession: AttendanceSessionDetail | null
  sessionsLoading: boolean
  sessionsTotal: number

  // Today's attendance
  todaySession: AttendanceSessionDetail | null
  todayLoading: boolean

  // Stats
  classStats: ClassStats | null
  studentStats: StudentStats | null
  statsLoading: boolean

  // Calendar
  calendar: CalendarDay[]
  dailyStats: DailyStats[]
  calendarLoading: boolean

  // Settings
  settings: AttendanceSettings | null
  settingsLoading: boolean

  // Actions
  fetchSessions: (params?: { class_id?: number; start_date?: string; end_date?: string; status?: string; page?: number }) => Promise<void>
  fetchSession: (sessionId: number) => Promise<void>
  startSession: (classId: number, date?: string) => Promise<AttendanceSessionDetail | null>
  completeSession: (sessionId: number) => Promise<void>

  fetchTodaySession: (classId: number) => Promise<void>
  recordAttendance: (sessionId: number, studentId: number, status: string, arrivalTime?: string, notes?: string) => Promise<void>
  bulkRecordAttendance: (classId: number, records: { student_id: number; status: string; arrival_time?: string; notes?: string }[], date?: string) => Promise<AttendanceSessionDetail | null>

  fetchClassStats: (classId: number, startDate?: string, endDate?: string) => Promise<void>
  fetchStudentStats: (studentId: number, startDate?: string, endDate?: string) => Promise<void>
  fetchCalendar: (classId: number, month: number, year: number) => Promise<void>
  fetchDailyStats: (classId: number, month: number, year: number) => Promise<void>

  fetchSettings: () => Promise<void>
  updateSettings: (settings: Partial<AttendanceSettings>) => Promise<void>

  reset: () => void
}

const initialState = {
  sessions: [],
  currentSession: null,
  sessionsLoading: false,
  sessionsTotal: 0,
  todaySession: null,
  todayLoading: false,
  classStats: null,
  studentStats: null,
  statsLoading: false,
  calendar: [],
  dailyStats: [],
  calendarLoading: false,
  settings: null,
  settingsLoading: false,
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  ...initialState,

  fetchSessions: async (params = {}) => {
    set({ sessionsLoading: true })
    try {
      const { data } = await api.get('/attendance/sessions', { params })
      set({ sessions: data.items, sessionsTotal: data.total, sessionsLoading: false })
    } catch (error) {
      set({ sessionsLoading: false })
      toast.error('Erreur lors du chargement des sessions')
    }
  },

  fetchSession: async (sessionId: number) => {
    set({ sessionsLoading: true })
    try {
      const { data } = await api.get(`/attendance/sessions/${sessionId}`)
      set({ currentSession: data, sessionsLoading: false })
    } catch (error) {
      set({ sessionsLoading: false })
      toast.error('Erreur lors du chargement de la session')
    }
  },

  startSession: async (classId: number, sessionDate?: string) => {
    try {
      const { data } = await api.post('/attendance/sessions', {
        class_id: classId,
        date: sessionDate
      })
      // Fetch full session details
      const { data: detail } = await api.get(`/attendance/sessions/${data.id}`)
      set({ currentSession: detail, todaySession: detail })
      toast.success('Session d\'appel démarrée')
      return detail
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Erreur lors de la création de la session')
      return null
    }
  },

  completeSession: async (sessionId: number) => {
    try {
      await api.put(`/attendance/sessions/${sessionId}/complete`)
      const { currentSession } = get()
      if (currentSession) {
        set({ currentSession: { ...currentSession, status: 'completed' } })
      }
      toast.success('Session terminée')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Erreur lors de la finalisation')
    }
  },

  fetchTodaySession: async (classId: number) => {
    set({ todayLoading: true })
    try {
      const { data } = await api.get(`/attendance/class/${classId}/today`)
      set({ todaySession: data, todayLoading: false })
    } catch (error) {
      set({ todaySession: null, todayLoading: false })
    }
  },

  recordAttendance: async (sessionId: number, studentId: number, status: string, arrivalTime?: string, notes?: string) => {
    try {
      await api.post('/attendance/records', {
        session_id: sessionId,
        student_id: studentId,
        status,
        arrival_time: arrivalTime,
        notes
      })
      // Update local state
      const { currentSession, todaySession } = get()
      const updateRecords = (session: AttendanceSessionDetail | null) => {
        if (!session) return session
        const records = session.records.map(r =>
          r.student_id === studentId ? { ...r, status: status as any, arrival_time: arrivalTime || null, notes: notes || null } : r
        )
        return { ...session, records }
      }
      set({
        currentSession: updateRecords(currentSession),
        todaySession: updateRecords(todaySession)
      })
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Erreur lors de l\'enregistrement')
    }
  },

  bulkRecordAttendance: async (classId: number, records: { student_id: number; status: string; arrival_time?: string; notes?: string }[], sessionDate?: string) => {
    try {
      const { data } = await api.post('/attendance/bulk', {
        class_id: classId,
        date: sessionDate,
        records
      })
      set({ currentSession: data, todaySession: data })
      toast.success('Présences enregistrées')
      return data
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Erreur lors de l\'enregistrement')
      return null
    }
  },

  fetchClassStats: async (classId: number, startDate?: string, endDate?: string) => {
    set({ statsLoading: true })
    try {
      const { data } = await api.get(`/attendance/class/${classId}/stats`, {
        params: { start_date: startDate, end_date: endDate }
      })
      set({ classStats: data, statsLoading: false })
    } catch (error) {
      set({ statsLoading: false })
      toast.error('Erreur lors du chargement des statistiques')
    }
  },

  fetchStudentStats: async (studentId: number, startDate?: string, endDate?: string) => {
    set({ statsLoading: true })
    try {
      const { data } = await api.get(`/attendance/student/${studentId}/stats`, {
        params: { start_date: startDate, end_date: endDate }
      })
      set({ studentStats: data, statsLoading: false })
    } catch (error) {
      set({ statsLoading: false })
    }
  },

  fetchCalendar: async (classId: number, month: number, year: number) => {
    set({ calendarLoading: true })
    try {
      const { data } = await api.get(`/attendance/class/${classId}/calendar`, {
        params: { month, year }
      })
      set({ calendar: data, calendarLoading: false })
    } catch (error) {
      set({ calendarLoading: false })
    }
  },

  fetchDailyStats: async (classId: number, month: number, year: number) => {
    set({ calendarLoading: true })
    try {
      const { data } = await api.get(`/attendance/class/${classId}/daily-stats`, {
        params: { month, year }
      })
      set({ dailyStats: data, calendarLoading: false })
    } catch (error) {
      set({ calendarLoading: false })
    }
  },

  fetchSettings: async () => {
    set({ settingsLoading: true })
    try {
      const { data } = await api.get('/attendance/settings')
      set({ settings: data, settingsLoading: false })
    } catch (error) {
      set({ settingsLoading: false })
    }
  },

  updateSettings: async (settings: Partial<AttendanceSettings>) => {
    try {
      const { data } = await api.put('/attendance/settings', settings)
      set({ settings: data })
      toast.success('Paramètres mis à jour')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Erreur lors de la mise à jour')
    }
  },

  reset: () => set(initialState),
}))
