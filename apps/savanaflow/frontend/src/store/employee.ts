import { create } from 'zustand'
import api from '../lib/api'

// Types
export interface Employee {
  id: number
  user_id: number | null
  first_name: string
  last_name: string
  full_name: string
  email: string | null
  phone: string | null
  employee_number: string
  position: 'vendeur' | 'caissier' | 'manager' | 'gerant'
  hire_date: string
  termination_date: string | null

  can_void_sale: boolean
  can_refund: boolean
  can_apply_discount: boolean
  max_discount_percent: number
  can_open_close_shift: boolean
  can_manage_products: boolean
  can_view_reports: boolean
  can_manage_employees: boolean

  commission_enabled: boolean
  commission_type: 'percent' | 'fixed'
  commission_value: number

  base_salary: number | null
  salary_frequency: 'daily' | 'weekly' | 'monthly'

  is_active: boolean
  total_sales: number
  total_commission: number

  assigned_stores: { id: number; name: string; city: string | null }[]
  permissions: EmployeePermission[]

  created_at: string
  updated_at: string
}

export interface EmployeePermission {
  id: number
  employee_id: number
  permission: string
  is_granted: boolean
}

export interface ShiftRecord {
  id: number
  employee_id: number
  store_id: number
  shift_id: number | null
  clock_in: string
  clock_out: string | null
  opening_cash: number | null
  closing_cash: number | null
  cash_difference: number
  sales_count: number
  sales_total: number
  refunds_count: number
  refunds_total: number
  commission_earned: number
  notes: string | null
  status: 'active' | 'closed'
  created_at: string
  employee?: Employee
  store?: { id: number; name: string; city: string | null }
}

export interface ActiveShift {
  id: number
  employee_id: number
  store_id: number
  clock_in: string
  opening_cash: number | null
  sales_count: number
  sales_total: number
  employee?: Employee
  store?: { id: number; name: string; city: string | null }
}

export interface EmployeeCommission {
  id: number
  employee_id: number
  shift_record_id: number | null
  sale_id: number | null
  sale_amount: number
  commission_rate: number
  commission_amount: number
  is_paid: boolean
  paid_at: string | null
  created_at: string
  employee?: Employee
}

export interface EmployeePerformance {
  employee_id: number
  employee_name: string
  period: string
  sales_count: number
  sales_total: number
  refunds_count: number
  refunds_total: number
  commission_earned: number
  hours_worked: number
  avg_sale_value: number
  top_products: { product_id: number; product_name: string; quantity_sold: number; total_sales: number }[]
  sales_by_day: { date: string; count: number; total: number }[]
  sales_by_hour: { hour: number; count: number; total: number }[]
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

interface EmployeeState {
  employees: Employee[]
  currentEmployee: Employee | null
  activeShifts: ActiveShift[]
  currentShift: ShiftRecord | null
  commissions: EmployeeCommission[]
  performance: EmployeePerformance | null
  loading: boolean
  error: string | null

  // Employee CRUD
  fetchEmployees: (params?: { store_id?: number; is_active?: boolean; position?: string; search?: string; page?: number; size?: number }) => Promise<PaginatedResponse<Employee>>
  fetchEmployee: (id: number) => Promise<Employee>
  createEmployee: (data: Partial<Employee>) => Promise<Employee>
  updateEmployee: (id: number, data: Partial<Employee>) => Promise<Employee>
  deactivateEmployee: (id: number) => Promise<void>
  activateEmployee: (id: number) => Promise<Employee>

  // Permissions
  fetchPermissions: (employeeId: number) => Promise<EmployeePermission[]>
  updatePermissions: (employeeId: number, permissions: { permission: string; is_granted: boolean }[]) => Promise<EmployeePermission[]>

  // Shift management
  clockIn: (data: { employee_id: number; store_id: number; shift_id?: number; opening_cash?: number; notes?: string }) => Promise<ShiftRecord>
  clockOut: (data: { shift_record_id: number; closing_cash: number; notes?: string }) => Promise<ShiftRecord>
  fetchActiveShifts: (storeId?: number) => Promise<ActiveShift[]>
  fetchShiftHistory: (params?: { employee_id?: number; store_id?: number; start_date?: string; end_date?: string; page?: number; size?: number }) => Promise<PaginatedResponse<ShiftRecord>>
  fetchShiftDetails: (shiftId: number) => Promise<ShiftRecord>

  // Commissions
  fetchCommissions: (employeeId: number, params?: { is_paid?: boolean; start_date?: string; end_date?: string; page?: number; size?: number }) => Promise<PaginatedResponse<EmployeeCommission>>
  fetchUnpaidCommissions: (employeeId?: number) => Promise<EmployeeCommission[]>
  payCommissions: (commissionIds: number[]) => Promise<{ message: string; total_paid: number }>
  fetchCommissionReport: (params?: { employee_id?: number; start_date?: string; end_date?: string }) => Promise<any[]>

  // Performance
  fetchPerformance: (employeeId: number, startDate?: string, endDate?: string) => Promise<EmployeePerformance>
  compareEmployees: (employeeIds: number[], metric?: string, startDate?: string, endDate?: string) => Promise<any>

  // Reports
  fetchHoursReport: (employeeId?: number, startDate?: string, endDate?: string) => Promise<any>
  fetchSalesByEmployee: (startDate?: string, endDate?: string, storeId?: number) => Promise<any[]>

  clearError: () => void
}

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  employees: [],
  currentEmployee: null,
  activeShifts: [],
  currentShift: null,
  commissions: [],
  performance: null,
  loading: false,
  error: null,

  // Employee CRUD
  fetchEmployees: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const queryParams = new URLSearchParams()
      if (params.store_id) queryParams.append('store_id', params.store_id.toString())
      if (params.is_active !== undefined) queryParams.append('is_active', params.is_active.toString())
      if (params.position) queryParams.append('position', params.position)
      if (params.search) queryParams.append('search', params.search)
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.size) queryParams.append('size', params.size.toString())

      const { data } = await api.get(`/employees?${queryParams.toString()}`)
      set({ employees: data.items, loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch employees', loading: false })
      throw error
    }
  },

  fetchEmployee: async (id) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/employees/${id}`)
      set({ currentEmployee: data, loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch employee', loading: false })
      throw error
    }
  },

  createEmployee: async (employeeData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/employees', employeeData)
      set(state => ({ employees: [...state.employees, data], loading: false }))
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to create employee', loading: false })
      throw error
    }
  },

  updateEmployee: async (id, employeeData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.put(`/employees/${id}`, employeeData)
      set(state => ({
        employees: state.employees.map(e => e.id === id ? data : e),
        currentEmployee: state.currentEmployee?.id === id ? data : state.currentEmployee,
        loading: false
      }))
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to update employee', loading: false })
      throw error
    }
  },

  deactivateEmployee: async (id) => {
    set({ loading: true, error: null })
    try {
      await api.delete(`/employees/${id}`)
      set(state => ({
        employees: state.employees.map(e => e.id === id ? { ...e, is_active: false } : e),
        loading: false
      }))
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to deactivate employee', loading: false })
      throw error
    }
  },

  activateEmployee: async (id) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post(`/employees/${id}/activate`)
      set(state => ({
        employees: state.employees.map(e => e.id === id ? data : e),
        loading: false
      }))
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to activate employee', loading: false })
      throw error
    }
  },

  // Permissions
  fetchPermissions: async (employeeId) => {
    try {
      const { data } = await api.get(`/employees/${employeeId}/permissions`)
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch permissions' })
      throw error
    }
  },

  updatePermissions: async (employeeId, permissions) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.put(`/employees/${employeeId}/permissions`, permissions)
      set({ loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to update permissions', loading: false })
      throw error
    }
  },

  // Shift management
  clockIn: async (clockInData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/shifts/clock-in', clockInData)
      set({ currentShift: data, loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to clock in', loading: false })
      throw error
    }
  },

  clockOut: async (clockOutData) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/shifts/clock-out', clockOutData)
      set({ currentShift: null, loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to clock out', loading: false })
      throw error
    }
  },

  fetchActiveShifts: async (storeId) => {
    set({ loading: true, error: null })
    try {
      const queryParams = storeId ? `?store_id=${storeId}` : ''
      const { data } = await api.get(`/shifts/active${queryParams}`)
      set({ activeShifts: data, loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch active shifts', loading: false })
      throw error
    }
  },

  fetchShiftHistory: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const queryParams = new URLSearchParams()
      if (params.employee_id) queryParams.append('employee_id', params.employee_id.toString())
      if (params.store_id) queryParams.append('store_id', params.store_id.toString())
      if (params.start_date) queryParams.append('start_date', params.start_date)
      if (params.end_date) queryParams.append('end_date', params.end_date)
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.size) queryParams.append('size', params.size.toString())

      const { data } = await api.get(`/shifts/history?${queryParams.toString()}`)
      set({ loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch shift history', loading: false })
      throw error
    }
  },

  fetchShiftDetails: async (shiftId) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.get(`/shifts/${shiftId}`)
      set({ currentShift: data, loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch shift details', loading: false })
      throw error
    }
  },

  // Commissions
  fetchCommissions: async (employeeId, params = {}) => {
    set({ loading: true, error: null })
    try {
      const queryParams = new URLSearchParams()
      if (params.is_paid !== undefined) queryParams.append('is_paid', params.is_paid.toString())
      if (params.start_date) queryParams.append('start_date', params.start_date)
      if (params.end_date) queryParams.append('end_date', params.end_date)
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.size) queryParams.append('size', params.size.toString())

      const { data } = await api.get(`/employees/${employeeId}/commissions?${queryParams.toString()}`)
      set({ commissions: data.items, loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch commissions', loading: false })
      throw error
    }
  },

  fetchUnpaidCommissions: async (employeeId) => {
    set({ loading: true, error: null })
    try {
      const queryParams = employeeId ? `?employee_id=${employeeId}` : ''
      const { data } = await api.get(`/commissions/unpaid${queryParams}`)
      set({ loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch unpaid commissions', loading: false })
      throw error
    }
  },

  payCommissions: async (commissionIds) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/commissions/pay', { commission_ids: commissionIds })
      set({ loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to pay commissions', loading: false })
      throw error
    }
  },

  fetchCommissionReport: async (params = {}) => {
    set({ loading: true, error: null })
    try {
      const queryParams = new URLSearchParams()
      if (params.employee_id) queryParams.append('employee_id', params.employee_id.toString())
      if (params.start_date) queryParams.append('start_date', params.start_date)
      if (params.end_date) queryParams.append('end_date', params.end_date)

      const { data } = await api.get(`/commissions/report?${queryParams.toString()}`)
      set({ loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch commission report', loading: false })
      throw error
    }
  },

  // Performance
  fetchPerformance: async (employeeId, startDate, endDate) => {
    set({ loading: true, error: null })
    try {
      const queryParams = new URLSearchParams()
      if (startDate) queryParams.append('start_date', startDate)
      if (endDate) queryParams.append('end_date', endDate)

      const { data } = await api.get(`/employees/${employeeId}/performance?${queryParams.toString()}`)
      set({ performance: data, loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch performance', loading: false })
      throw error
    }
  },

  compareEmployees: async (employeeIds, metric = 'sales_total', startDate, endDate) => {
    set({ loading: true, error: null })
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('employee_ids', employeeIds.join(','))
      queryParams.append('metric', metric)
      if (startDate) queryParams.append('start_date', startDate)
      if (endDate) queryParams.append('end_date', endDate)

      const { data } = await api.get(`/employees/performance/compare?${queryParams.toString()}`)
      set({ loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to compare employees', loading: false })
      throw error
    }
  },

  // Reports
  fetchHoursReport: async (employeeId, startDate, endDate) => {
    set({ loading: true, error: null })
    try {
      const queryParams = new URLSearchParams()
      if (employeeId) queryParams.append('employee_id', employeeId.toString())
      if (startDate) queryParams.append('start_date', startDate)
      if (endDate) queryParams.append('end_date', endDate)

      const { data } = await api.get(`/employees/reports/hours?${queryParams.toString()}`)
      set({ loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch hours report', loading: false })
      throw error
    }
  },

  fetchSalesByEmployee: async (startDate, endDate, storeId) => {
    set({ loading: true, error: null })
    try {
      const queryParams = new URLSearchParams()
      if (startDate) queryParams.append('start_date', startDate)
      if (endDate) queryParams.append('end_date', endDate)
      if (storeId) queryParams.append('store_id', storeId.toString())

      const { data } = await api.get(`/employees/reports/sales?${queryParams.toString()}`)
      set({ loading: false })
      return data
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to fetch sales report', loading: false })
      throw error
    }
  },

  clearError: () => set({ error: null }),
}))
