import { create } from 'zustand'
import api from '../lib/api'

// Types
export interface FiscalYear {
  id: number
  name: string
  start_date: string
  end_date: string
  is_closed: boolean
  closed_at: string | null
  closed_by: number | null
  opening_balance: number
  created_at: string
}

export interface Account {
  id: number
  number: string
  name: string
  account_type: 'asset' | 'liability' | 'equity' | 'income' | 'expense'
  category: string
  parent_id: number | null
  is_active: boolean
  allow_manual_entry: boolean
  is_system: boolean
  debit_balance: number
  credit_balance: number
  balance: number
  children: Account[]
  created_at: string
}

export interface Journal {
  id: number
  code: string
  name: string
  journal_type: 'sales' | 'purchases' | 'cash' | 'bank' | 'general'
  is_active: boolean
  last_entry_number: number
  created_at: string
}

export interface JournalEntryLine {
  id: number
  account_id: number
  account: Account
  description: string | null
  debit: number
  credit: number
  third_party_type: 'customer' | 'supplier' | null
  third_party_id: number | null
  cost_center: string | null
  letter_code: string | null
  created_at: string
}

export interface JournalEntry {
  id: number
  journal_id: number
  journal: Journal
  fiscal_year_id: number
  fiscal_year: FiscalYear
  entry_number: string
  entry_date: string
  document_date: string | null
  document_ref: string | null
  source_type: string | null
  source_id: number | null
  description: string
  status: 'draft' | 'posted' | 'cancelled'
  total_debit: number
  total_credit: number
  is_balanced: boolean
  lines: JournalEntryLine[]
  created_by: number
  posted_by: number | null
  posted_at: string | null
  cancelled_by: number | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
}

export interface TaxRate {
  id: number
  name: string
  rate: number
  account_id: number | null
  is_default: boolean
  is_active: boolean
  created_at: string
}

export interface TrialBalanceLine {
  account_number: string
  account_name: string
  category: string
  account_type: string
  opening_debit: number
  opening_credit: number
  movement_debit: number
  movement_credit: number
  closing_debit: number
  closing_credit: number
}

export interface TrialBalance {
  organisation_name: string
  fiscal_year: string
  period_start: string
  period_end: string
  currency: string
  lines: TrialBalanceLine[]
  total_opening_debit: number
  total_opening_credit: number
  total_movement_debit: number
  total_movement_credit: number
  total_closing_debit: number
  total_closing_credit: number
  is_balanced: boolean
  generated_at: string
}

export interface IncomeStatementSection {
  title: string
  lines: {
    account_number: string
    account_name: string
    category: string
    amount: number
    percentage: number
  }[]
  total: number
}

export interface IncomeStatement {
  organisation_name: string
  fiscal_year: string
  period_start: string
  period_end: string
  currency: string
  operating_income: IncomeStatementSection
  operating_expenses: IncomeStatementSection
  operating_result: number
  financial_income: IncomeStatementSection
  financial_expenses: IncomeStatementSection
  financial_result: number
  ordinary_result: number
  extraordinary_income: IncomeStatementSection
  extraordinary_expenses: IncomeStatementSection
  extraordinary_result: number
  net_result_before_tax: number
  income_tax: number
  net_result: number
  generated_at: string
}

export interface BalanceSheetSection {
  title: string
  lines: {
    account_number: string
    account_name: string
    gross_amount: number
    depreciation: number
    net_amount: number
    previous_year: number | null
  }[]
  total_gross: number
  total_depreciation: number
  total_net: number
}

export interface BalanceSheet {
  organisation_name: string
  fiscal_year: string
  as_of_date: string
  currency: string
  fixed_assets: BalanceSheetSection
  current_assets: BalanceSheetSection
  cash_and_equivalents: BalanceSheetSection
  total_assets: number
  equity: BalanceSheetSection
  long_term_liabilities: BalanceSheetSection
  current_liabilities: BalanceSheetSection
  total_liabilities_and_equity: number
  is_balanced: boolean
  generated_at: string
}

interface AccountingState {
  // Fiscal Years
  fiscalYears: FiscalYear[]
  activeFiscalYear: FiscalYear | null
  
  // Accounts
  accounts: Account[]
  accountsTree: Account[]
  
  // Journals
  journals: Journal[]
  
  // Journal Entries
  entries: JournalEntry[]
  entriesTotal: number
  currentEntry: JournalEntry | null
  
  // Tax Rates
  taxRates: TaxRate[]
  
  // Reports
  trialBalance: TrialBalance | null
  incomeStatement: IncomeStatement | null
  balanceSheet: BalanceSheet | null
  
  // Loading states
  loading: boolean
  reportsLoading: boolean
  
  // Dashboard stats
  dashboardStats: Record<string, any> | null
  
  // Actions - Fiscal Years
  fetchFiscalYears: () => Promise<void>
  fetchActiveFiscalYear: () => Promise<void>
  createFiscalYear: (data: any) => Promise<FiscalYear>
  closeFiscalYear: (id: number) => Promise<void>
  
  // Actions - Accounts
  fetchAccounts: (category?: string) => Promise<void>
  fetchAccountsTree: (category?: string) => Promise<void>
  createAccount: (data: any) => Promise<Account>
  updateAccount: (id: number, data: any) => Promise<Account>
  deleteAccount: (id: number) => Promise<void>
  importOhadaAccounts: () => Promise<void>
  
  // Actions - Journals
  fetchJournals: () => Promise<void>
  createJournal: (data: any) => Promise<Journal>
  
  // Actions - Journal Entries
  fetchEntries: (params: any) => Promise<void>
  fetchEntry: (id: number) => Promise<void>
  createEntry: (data: any) => Promise<JournalEntry>
  updateEntry: (id: number, data: any) => Promise<JournalEntry>
  deleteEntry: (id: number) => Promise<void>
  postEntry: (id: number) => Promise<void>
  cancelEntry: (id: number, reason: string) => Promise<void>
  
  // Actions - Auto entries
  createEntryFromInvoice: (invoiceId: number) => Promise<JournalEntry>
  createEntryFromPayment: (paymentId: number) => Promise<JournalEntry>
  createEntryFromExpense: (expenseId: number) => Promise<JournalEntry>
  
  // Actions - Tax Rates
  fetchTaxRates: () => Promise<void>
  createTaxRate: (data: any) => Promise<TaxRate>
  updateTaxRate: (id: number, data: any) => Promise<TaxRate>
  
  // Actions - Reports
  fetchTrialBalance: (periodStart: string, periodEnd: string) => Promise<void>
  fetchIncomeStatement: (periodStart: string, periodEnd: string) => Promise<void>
  fetchBalanceSheet: (asOfDate: string) => Promise<void>
  fetchDashboardStats: () => Promise<void>
  
  // Utility
  clearReports: () => void
}

export const useAccountingStore = create<AccountingState>((set, get) => ({
  // Initial state
  fiscalYears: [],
  activeFiscalYear: null,
  accounts: [],
  accountsTree: [],
  journals: [],
  entries: [],
  entriesTotal: 0,
  currentEntry: null,
  taxRates: [],
  trialBalance: null,
  incomeStatement: null,
  balanceSheet: null,
  loading: false,
  reportsLoading: false,
  dashboardStats: null,
  
  // Fiscal Years
  fetchFiscalYears: async () => {
    try {
      const { data } = await api.get('/accounting/fiscal-years')
      set({ fiscalYears: data })
    } catch (error) {
      console.error('Error fetching fiscal years:', error)
    }
  },
  
  fetchActiveFiscalYear: async () => {
    try {
      const { data } = await api.get('/accounting/fiscal-years/active')
      set({ activeFiscalYear: data })
    } catch (error) {
      console.error('Error fetching active fiscal year:', error)
      set({ activeFiscalYear: null })
    }
  },
  
  createFiscalYear: async (data) => {
    const response = await api.post('/accounting/fiscal-years', data)
    const fiscalYear = response.data
    set(state => ({ fiscalYears: [...state.fiscalYears, fiscalYear] }))
    return fiscalYear
  },
  
  closeFiscalYear: async (id) => {
    await api.post(`/accounting/fiscal-years/${id}/close`, {})
    set(state => ({
      fiscalYears: state.fiscalYears.map(fy => 
        fy.id === id ? { ...fy, is_closed: true } : fy
      )
    }))
  },
  
  // Accounts
  fetchAccounts: async (category?: string) => {
    set({ loading: true })
    try {
      const params = category ? { category, include_tree: false } : { include_tree: false }
      const { data } = await api.get('/accounting/accounts', { params })
      set({ accounts: data, loading: false })
    } catch (error) {
      console.error('Error fetching accounts:', error)
      set({ loading: false })
    }
  },
  
  fetchAccountsTree: async (category?: string) => {
    set({ loading: true })
    try {
      const params = category ? { category } : {}
      const { data } = await api.get('/accounting/accounts', { params })
      set({ accountsTree: data, loading: false })
    } catch (error) {
      console.error('Error fetching accounts tree:', error)
      set({ loading: false })
    }
  },
  
  createAccount: async (data) => {
    const response = await api.post('/accounting/accounts', data)
    return response.data
  },
  
  updateAccount: async (id, data) => {
    const response = await api.put(`/accounting/accounts/${id}`, data)
    return response.data
  },
  
  deleteAccount: async (id) => {
    await api.delete(`/accounting/accounts/${id}`)
    set(state => ({
      accounts: state.accounts.filter(a => a.id !== id)
    }))
  },
  
  importOhadaAccounts: async () => {
    set({ loading: true })
    try {
      await api.post('/accounting/accounts/import-ohada')
      // Refresh accounts tree after import
      await get().fetchAccountsTree()
    } catch (error) {
      console.error('Error importing OHADA accounts:', error)
      set({ loading: false })
    }
  },
  
  // Journals
  fetchJournals: async () => {
    try {
      const { data } = await api.get('/accounting/journals')
      set({ journals: data })
    } catch (error) {
      console.error('Error fetching journals:', error)
    }
  },
  
  createJournal: async (data) => {
    const response = await api.post('/accounting/journals', data)
    const journal = response.data
    set(state => ({ journals: [...state.journals, journal] }))
    return journal
  },
  
  // Journal Entries
  fetchEntries: async (params) => {
    set({ loading: true })
    try {
      const { data } = await api.get('/accounting/entries', { params })
      set({
        entries: data.items,
        entriesTotal: data.total,
        loading: false
      })
    } catch (error) {
      console.error('Error fetching entries:', error)
      set({ loading: false })
    }
  },
  
  fetchEntry: async (id) => {
    set({ loading: true })
    try {
      const { data } = await api.get(`/accounting/entries/${id}`)
      set({ currentEntry: data, loading: false })
    } catch (error) {
      console.error('Error fetching entry:', error)
      set({ loading: false })
    }
  },
  
  createEntry: async (data) => {
    const response = await api.post('/accounting/entries', data)
    const entry = response.data
    set(state => ({
      entries: [entry, ...state.entries],
      entriesTotal: state.entriesTotal + 1
    }))
    return entry
  },
  
  updateEntry: async (id, data) => {
    const response = await api.put(`/accounting/entries/${id}`, data)
    const entry = response.data
    set(state => ({
      entries: state.entries.map(e => e.id === id ? entry : e),
      currentEntry: state.currentEntry?.id === id ? entry : state.currentEntry
    }))
    return entry
  },
  
  deleteEntry: async (id) => {
    await api.delete(`/accounting/entries/${id}`)
    set(state => ({
      entries: state.entries.filter(e => e.id !== id),
      entriesTotal: state.entriesTotal - 1,
      currentEntry: state.currentEntry?.id === id ? null : state.currentEntry
    }))
  },
  
  postEntry: async (id) => {
    const { data } = await api.post(`/accounting/entries/${id}/post`)
    set(state => ({
      entries: state.entries.map(e => e.id === id ? data : e),
      currentEntry: state.currentEntry?.id === id ? data : state.currentEntry
    }))
  },
  
  cancelEntry: async (id, reason) => {
    const { data } = await api.post(`/accounting/entries/${id}/cancel`, null, {
      params: { reason }
    })
    set(state => ({
      entries: state.entries.map(e => e.id === id ? data : e),
      currentEntry: state.currentEntry?.id === id ? data : state.currentEntry
    }))
  },
  
  // Auto entries
  createEntryFromInvoice: async (invoiceId) => {
    const { data } = await api.post(`/accounting/auto/invoice/${invoiceId}`)
    return data
  },
  
  createEntryFromPayment: async (paymentId) => {
    const { data } = await api.post(`/accounting/auto/payment/${paymentId}`)
    return data
  },
  
  createEntryFromExpense: async (expenseId) => {
    const { data } = await api.post(`/accounting/auto/expense/${expenseId}`)
    return data
  },
  
  // Tax Rates
  fetchTaxRates: async () => {
    try {
      const { data } = await api.get('/accounting/tax-rates')
      set({ taxRates: data })
    } catch (error) {
      console.error('Error fetching tax rates:', error)
    }
  },
  
  createTaxRate: async (data) => {
    const response = await api.post('/accounting/tax-rates', data)
    const taxRate = response.data
    set(state => ({ taxRates: [...state.taxRates, taxRate] }))
    return taxRate
  },
  
  updateTaxRate: async (id, data) => {
    const response = await api.put(`/accounting/tax-rates/${id}`, data)
    const taxRate = response.data
    set(state => ({
      taxRates: state.taxRates.map(t => t.id === id ? taxRate : t)
    }))
    return taxRate
  },
  
  // Reports
  fetchTrialBalance: async (periodStart, periodEnd) => {
    set({ reportsLoading: true })
    try {
      const { data } = await api.get('/accounting/reports/trial-balance', {
        params: { period_start: periodStart, period_end: periodEnd }
      })
      set({ trialBalance: data, reportsLoading: false })
    } catch (error) {
      console.error('Error fetching trial balance:', error)
      set({ reportsLoading: false })
    }
  },
  
  fetchIncomeStatement: async (periodStart, periodEnd) => {
    set({ reportsLoading: true })
    try {
      const { data } = await api.get('/accounting/reports/income-statement', {
        params: { period_start: periodStart, period_end: periodEnd }
      })
      set({ incomeStatement: data, reportsLoading: false })
    } catch (error) {
      console.error('Error fetching income statement:', error)
      set({ reportsLoading: false })
    }
  },
  
  fetchBalanceSheet: async (asOfDate) => {
    set({ reportsLoading: true })
    try {
      const { data } = await api.get('/accounting/reports/balance-sheet', {
        params: { as_of_date: asOfDate }
      })
      set({ balanceSheet: data, reportsLoading: false })
    } catch (error) {
      console.error('Error fetching balance sheet:', error)
      set({ reportsLoading: false })
    }
  },
  
  fetchDashboardStats: async () => {
    try {
      const { data } = await api.get('/accounting/reports/dashboard')
      set({ dashboardStats: data })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    }
  },
  
  // Utility
  clearReports: () => {
    set({
      trialBalance: null,
      incomeStatement: null,
      balanceSheet: null
    })
  }
}))
