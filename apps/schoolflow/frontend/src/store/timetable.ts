import { create } from 'zustand'
import api from '../lib/api'

// Types
export interface TimeSlot {
  id: number
  name: string
  start_time: string
  end_time: string
  order: number
  is_active: boolean
  created_at: string
}

export interface TimetableEntry {
  id: number
  class_id: number
  subject_id: number
  teacher_id: number | null
  time_slot_id: number
  day_of_week: number
  room: string | null
  notes: string | null
  created_at: string
  updated_at: string
  class_name?: string
  subject_name?: string
  teacher_name?: string
  time_slot_name?: string
  start_time?: string
  end_time?: string
}

export interface TimetableConflict {
  id: number
  entry1_id: number
  entry2_id: number
  conflict_type: 'teacher_double_booking' | 'room_conflict'
  severity: 'warning' | 'error'
  description: string | null
  resolved: boolean
  resolved_at: string | null
  created_at: string
  entry1?: TimetableEntry
  entry2?: TimetableEntry
}

export interface DaySchedule {
  day_of_week: number
  day_name: string
  entries: TimetableEntry[]
}

export interface ClassTimetable {
  class_id: number
  class_name: string
  level: string
  academic_year: string
  days: DaySchedule[]
}

export interface TeacherTimetable {
  teacher_id: number
  teacher_name: string
  days: DaySchedule[]
}

interface TimetableState {
  // Time slots
  timeSlots: TimeSlot[]
  timeSlotsLoading: boolean

  // Entries
  entries: TimetableEntry[]
  entriesLoading: boolean

  // Class timetable
  classTimetable: ClassTimetable | null
  classTimetableLoading: boolean

  // Teacher timetable
  teacherTimetable: TeacherTimetable | null
  teacherTimetableLoading: boolean

  // Conflicts
  conflicts: TimetableConflict[]
  conflictsLoading: boolean

  // Actions
  fetchTimeSlots: (activeOnly?: boolean) => Promise<void>
  createTimeSlot: (data: Partial<TimeSlot>) => Promise<TimeSlot>
  updateTimeSlot: (id: number, data: Partial<TimeSlot>) => Promise<TimeSlot>
  deleteTimeSlot: (id: number) => Promise<void>

  fetchEntries: (filters?: { class_id?: number; teacher_id?: number; day?: number }) => Promise<void>
  createEntry: (data: Partial<TimetableEntry>) => Promise<TimetableEntry>
  updateEntry: (id: number, data: Partial<TimetableEntry>) => Promise<TimetableEntry>
  deleteEntry: (id: number) => Promise<void>

  fetchClassTimetable: (classId: number) => Promise<void>
  fetchTeacherTimetable: (teacherId: number) => Promise<void>

  fetchConflicts: (resolved?: boolean) => Promise<void>
  resolveConflict: (conflictId: number, action: 'ignore' | 'swap' | 'delete_entry1' | 'delete_entry2') => Promise<void>
  detectConflicts: () => Promise<void>

  exportPDF: (classId: number) => Promise<void>

  reset: () => void
}

const initialState = {
  timeSlots: [],
  timeSlotsLoading: false,
  entries: [],
  entriesLoading: false,
  classTimetable: null,
  classTimetableLoading: false,
  teacherTimetable: null,
  teacherTimetableLoading: false,
  conflicts: [],
  conflictsLoading: false,
}

export const useTimetableStore = create<TimetableState>((set, get) => ({
  ...initialState,

  // Time Slots
  fetchTimeSlots: async (activeOnly = true) => {
    set({ timeSlotsLoading: true })
    try {
      const { data } = await api.get('/timetable/slots', { params: { active_only: activeOnly } })
      set({ timeSlots: data, timeSlotsLoading: false })
    } catch (error) {
      set({ timeSlotsLoading: false })
      throw error
    }
  },

  createTimeSlot: async (data) => {
    const { data: slot } = await api.post('/timetable/slots', data)
    set((state) => ({ timeSlots: [...state.timeSlots, slot] }))
    return slot
  },

  updateTimeSlot: async (id, data) => {
    const { data: slot } = await api.put(`/timetable/slots/${id}`, data)
    set((state) => ({
      timeSlots: state.timeSlots.map((s) => (s.id === id ? slot : s)),
    }))
    return slot
  },

  deleteTimeSlot: async (id) => {
    await api.delete(`/timetable/slots/${id}`)
    set((state) => ({
      timeSlots: state.timeSlots.filter((s) => s.id !== id),
    }))
  },

  // Entries
  fetchEntries: async (filters) => {
    set({ entriesLoading: true })
    try {
      const { data } = await api.get('/timetable/entries', { params: filters })
      set({ entries: data, entriesLoading: false })
    } catch (error) {
      set({ entriesLoading: false })
      throw error
    }
  },

  createEntry: async (data) => {
    const { data: entry } = await api.post('/timetable/entries', data)
    set((state) => ({ entries: [...state.entries, entry] }))
    return entry
  },

  updateEntry: async (id, data) => {
    const { data: entry } = await api.put(`/timetable/entries/${id}`, data)
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? entry : e)),
    }))
    return entry
  },

  deleteEntry: async (id) => {
    await api.delete(`/timetable/entries/${id}`)
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
    }))
  },

  // Class Timetable
  fetchClassTimetable: async (classId) => {
    set({ classTimetableLoading: true })
    try {
      const { data } = await api.get(`/timetable/class/${classId}`)
      set({ classTimetable: data, classTimetableLoading: false })
    } catch (error) {
      set({ classTimetableLoading: false })
      throw error
    }
  },

  // Teacher Timetable
  fetchTeacherTimetable: async (teacherId) => {
    set({ teacherTimetableLoading: true })
    try {
      const { data } = await api.get(`/timetable/teacher/${teacherId}`)
      set({ teacherTimetable: data, teacherTimetableLoading: false })
    } catch (error) {
      set({ teacherTimetableLoading: false })
      throw error
    }
  },

  // Conflicts
  fetchConflicts: async (resolved = false) => {
    set({ conflictsLoading: true })
    try {
      const { data } = await api.get('/timetable/conflicts', { params: { resolved } })
      set({ conflicts: data, conflictsLoading: false })
    } catch (error) {
      set({ conflictsLoading: false })
      throw error
    }
  },

  resolveConflict: async (conflictId, action) => {
    await api.post('/timetable/conflicts/resolve', { conflict_id: conflictId, action })
    set((state) => ({
      conflicts: state.conflicts.filter((c) => c.id !== conflictId),
    }))
  },

  detectConflicts: async () => {
    set({ conflictsLoading: true })
    try {
      const { data } = await api.post('/timetable/detect-conflicts')
      set({ conflicts: data, conflictsLoading: false })
    } catch (error) {
      set({ conflictsLoading: false })
      throw error
    }
  },

  // PDF Export
  exportPDF: async (classId) => {
    const response = await api.get(`/timetable/pdf/${classId}`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `emploi-du-temps-${classId}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  // Reset
  reset: () => set(initialState),
}))
