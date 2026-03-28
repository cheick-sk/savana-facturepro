import { create } from 'zustand'
import portalApi from '../lib/portalApi'

// Types
interface Parent {
  id: number
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
  full_name: string
}

interface ParentAccount {
  id: number
  email: string
  phone: string | null
  preferred_language: string
  notification_channels: string[]
  receive_sms_notifications: boolean
  receive_email_notifications: boolean
  is_active: boolean
  email_verified: boolean
  last_login: string | null
  created_at: string
  parent: Parent
}

interface Child {
  id: number
  student_number: string
  first_name: string
  last_name: string
  full_name: string
  birth_date: string | null
  gender: string | null
  is_active: boolean
  class_id: number | null
  class_name: string | null
  class_level: string | null
  relationship: string | null
  is_primary: boolean
}

interface ChildDetail extends Child {
  average_grade: number | null
  attendance_rate: number | null
  pending_fees: number
  total_fees: number
}

interface Grade {
  id: number
  subject_id: number
  subject_name: string
  subject_coefficient: number
  term_id: number
  term_name: string
  academic_year: string
  score: number
  max_score: number
  percentage: number
  comment: string | null
  created_at: string
}

interface AttendanceRecord {
  id: number
  date: string
  status: string
  arrival_time: string | null
  notes: string | null
  class_name: string
}

interface AttendanceStats {
  student_id: number
  total_days: number
  present_days: number
  absent_days: number
  late_days: number
  excused_days: number
  attendance_rate: number
  punctuality_rate: number
  consecutive_absences?: number
}

interface FeeInvoice {
  id: number
  invoice_number: string
  student_id: number
  student_name: string
  term_id: number | null
  term_name: string | null
  amount: number
  description: string
  due_date: string | null
  status: string
  created_at: string
  amount_paid: number
  amount_remaining: number
  payments: Array<{
    id: number
    amount: number
    method: string
    reference: string | null
    paid_at: string
  }>
}

interface Message {
  id: number
  subject: string
  content: string
  sender_type: string
  sender_name: string | null
  thread_id: string | null
  reply_to_id: number | null
  student_id: number | null
  priority: string
  category: string | null
  read: boolean
  read_at: string | null
  created_at: string
}

interface Notification {
  id: number
  type: string
  title: string
  content: string
  student_id: number | null
  student_name: string | null
  reference_type: string | null
  reference_id: number | null
  read: boolean
  read_at: string | null
  created_at: string
}

interface Dashboard {
  parent: Parent
  children_count: number
  unread_messages: number
  unread_notifications: number
  pending_fees_total: number
  upcoming_payments: FeeInvoice[]
  recent_grades: Grade[]
  recent_attendance: AttendanceRecord[]
  recent_notifications: Notification[]
  children: ChildDetail[]
}

interface TimetableEntry {
  id: number
  day_of_week: number
  day_name: string
  time_slot_id: number
  slot_name: string
  start_time: string
  end_time: string
  subject_name: string
  teacher_name: string | null
  room: string | null
}

interface DayTimetable {
  day_of_week: number
  day_name: string
  entries: TimetableEntry[]
}

interface WeekTimetable {
  student_id: number
  student_name: string
  class_name: string
  days: DayTimetable[]
}

// Store state
interface ParentPortalState {
  // Auth
  account: ParentAccount | null
  isAuthenticated: boolean
  loading: boolean

  // Children
  children: Child[]
  selectedChild: ChildDetail | null

  // Dashboard
  dashboard: Dashboard | null

  // Grades
  grades: Grade[]

  // Attendance
  attendanceRecords: AttendanceRecord[]
  attendanceStats: AttendanceStats | null

  // Timetable
  timetable: WeekTimetable | null

  // Fees
  feeInvoices: FeeInvoice[]

  // Messages
  messages: Message[]
  messagesTotal: number

  // Notifications
  notifications: Notification[]
  notificationsTotal: number
  notificationsUnread: number

  // Actions - Auth
  login: (email: string, password: string) => Promise<void>
  requestMagicLink: (email: string) => Promise<void>
  verifyMagicLink: (token: string) => Promise<void>
  logout: () => void
  initAuth: () => void

  // Actions - Profile
  updateProfile: (data: Partial<Parent>) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>

  // Actions - Children
  fetchChildren: () => Promise<void>
  fetchChildDetail: (studentId: number) => Promise<void>
  linkStudent: (studentNumber: string, relationship: string) => Promise<void>

  // Actions - Dashboard
  fetchDashboard: () => Promise<void>

  // Actions - Grades
  fetchGrades: (studentId: number, termId?: number) => Promise<void>

  // Actions - Attendance
  fetchAttendance: (studentId: number, startDate?: string, endDate?: string) => Promise<void>
  fetchAttendanceStats: (studentId: number, startDate?: string, endDate?: string) => Promise<void>

  // Actions - Timetable
  fetchTimetable: (studentId: number) => Promise<void>

  // Actions - Fees
  fetchFees: (studentId: number) => Promise<void>
  payFee: (feeId: number, amount: number, method: string) => Promise<void>
  payFeeMobileMoney: (feeId: number, amount: number, provider: string, phoneNumber: string) => Promise<any>

  // Actions - Messages
  fetchMessages: (unreadOnly?: boolean, page?: number) => Promise<void>
  sendMessage: (subject: string, content: string, studentId?: number, category?: string, priority?: string) => Promise<void>
  replyToMessage: (messageId: number, content: string) => Promise<void>
  markMessageRead: (messageId: number) => Promise<void>

  // Actions - Notifications
  fetchNotifications: (unreadOnly?: boolean, page?: number) => Promise<void>
  markNotificationRead: (notificationId: number) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
}

// Safe JSON parse
function safeJsonParse<T>(str: string | null): T | null {
  if (!str || str === 'undefined' || str === 'null') return null
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

export const useParentPortalStore = create<ParentPortalState>((set, get) => ({
  // Initial state
  account: null,
  isAuthenticated: false,
  loading: false,
  children: [],
  selectedChild: null,
  dashboard: null,
  grades: [],
  attendanceRecords: [],
  attendanceStats: null,
  timetable: null,
  feeInvoices: [],
  messages: [],
  messagesTotal: 0,
  notifications: [],
  notificationsTotal: 0,
  notificationsUnread: 0,

  // Auth actions
  initAuth: () => {
    const raw = localStorage.getItem('parent_user')
    const account = safeJsonParse<ParentAccount>(raw)
    if (account) {
      set({ account, isAuthenticated: true })
    }
  },

  login: async (email, password) => {
    set({ loading: true })
    try {
      const { data } = await portalApi.post('/auth/login', { email, password })
      localStorage.setItem('parent_access_token', data.access_token)
      localStorage.setItem('parent_refresh_token', data.refresh_token)
      localStorage.setItem('parent_user', JSON.stringify(data.parent))
      set({ account: data.parent, isAuthenticated: true, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  requestMagicLink: async (email) => {
    await portalApi.post('/auth/magic-link', { email })
  },

  verifyMagicLink: async (token) => {
    set({ loading: true })
    try {
      const { data } = await portalApi.post('/auth/verify-magic', { token })
      localStorage.setItem('parent_access_token', data.access_token)
      localStorage.setItem('parent_refresh_token', data.refresh_token)
      localStorage.setItem('parent_user', JSON.stringify(data.parent))
      set({ account: data.parent, isAuthenticated: true, loading: false })
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('parent_access_token')
    localStorage.removeItem('parent_refresh_token')
    localStorage.removeItem('parent_user')
    set({
      account: null,
      isAuthenticated: false,
      children: [],
      selectedChild: null,
      dashboard: null,
      grades: [],
      attendanceRecords: [],
      attendanceStats: null,
      timetable: null,
      feeInvoices: [],
      messages: [],
      notifications: []
    })
  },

  // Profile actions
  updateProfile: async (data) => {
    const { data: updated } = await portalApi.put('/profile', data)
    const account = get().account
    if (account) {
      const newAccount = { ...account, parent: updated }
      localStorage.setItem('parent_user', JSON.stringify(newAccount))
      set({ account: newAccount })
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    await portalApi.put('/password', {
      current_password: currentPassword,
      new_password: newPassword
    })
  },

  // Children actions
  fetchChildren: async () => {
    const { data } = await portalApi.get('/children')
    set({ children: data })
  },

  fetchChildDetail: async (studentId) => {
    const { data } = await portalApi.get(`/children/${studentId}`)
    set({ selectedChild: data })
  },

  linkStudent: async (studentNumber, relationship) => {
    await portalApi.post('/children/link', {
      student_number: studentNumber,
      relationship
    })
    // Refresh children list
    await get().fetchChildren()
  },

  // Dashboard actions
  fetchDashboard: async () => {
    const { data } = await portalApi.get('/dashboard')
    set({ dashboard: data, children: data.children })
  },

  // Grades actions
  fetchGrades: async (studentId, termId) => {
    const url = termId
      ? `/children/${studentId}/grades?term_id=${termId}`
      : `/children/${studentId}/grades`
    const { data } = await portalApi.get(url)
    set({ grades: data })
  },

  // Attendance actions
  fetchAttendance: async (studentId, startDate, endDate) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    const { data } = await portalApi.get(`/children/${studentId}/attendance?${params}`)
    set({ attendanceRecords: data })
  },

  fetchAttendanceStats: async (studentId, startDate, endDate) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    const { data } = await portalApi.get(`/children/${studentId}/attendance/stats?${params}`)
    set({ attendanceStats: data })
  },

  // Timetable actions
  fetchTimetable: async (studentId) => {
    const { data } = await portalApi.get(`/children/${studentId}/timetable`)
    set({ timetable: data })
  },

  // Fees actions
  fetchFees: async (studentId) => {
    const { data } = await portalApi.get(`/children/${studentId}/fees`)
    set({ feeInvoices: data })
  },

  payFee: async (feeId, amount, method) => {
    await portalApi.post(`/fees/${feeId}/pay`, { amount, method })
  },

  payFeeMobileMoney: async (feeId, amount, provider, phoneNumber) => {
    const { data } = await portalApi.post(`/fees/${feeId}/pay/mobile-money`, {
      amount,
      provider,
      phone_number: phoneNumber
    })
    return data
  },

  // Messages actions
  fetchMessages: async (unreadOnly = false, page = 1) => {
    const { data } = await portalApi.get(`/messages?unread_only=${unreadOnly}&page=${page}`)
    set({ messages: data.items, messagesTotal: data.total })
  },

  sendMessage: async (subject, content, studentId, category, priority = 'normal') => {
    await portalApi.post('/messages', {
      subject,
      content,
      student_id: studentId,
      category,
      priority
    })
  },

  replyToMessage: async (messageId, content) => {
    await portalApi.post(`/messages/${messageId}/reply`, { content })
  },

  markMessageRead: async (messageId) => {
    await portalApi.put(`/messages/${messageId}/read`)
    const messages = get().messages.map(m =>
      m.id === messageId ? { ...m, read: true } : m
    )
    set({ messages })
  },

  // Notifications actions
  fetchNotifications: async (unreadOnly = false, page = 1) => {
    const { data } = await portalApi.get(`/notifications?unread_only=${unreadOnly}&page=${page}`)
    set({
      notifications: data.items,
      notificationsTotal: data.total,
      notificationsUnread: data.unread_count
    })
  },

  markNotificationRead: async (notificationId) => {
    await portalApi.put(`/notifications/${notificationId}/read`)
    const notifications = get().notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    )
    const unread = get().notificationsUnread - 1
    set({ notifications, notificationsUnread: Math.max(0, unread) })
  },

  markAllNotificationsRead: async () => {
    await portalApi.put('/notifications/read-all')
    const notifications = get().notifications.map(n => ({ ...n, read: true }))
    set({ notifications, notificationsUnread: 0 })
  }
}))
