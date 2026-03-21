import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CURRENCIES, EXCHANGE_RATES, INVERSE_RATES, formatCurrency, convertCurrency, type Currency } from '../lib/currency'

interface CurrencyState {
  // Devise active
  activeCurrency: Currency
  // Taux de change personnalisés (peuvent être mis à jour)
  customRates: Record<string, number>
  // Historique des taux
  ratesLastUpdated: string | null
  
  // Actions
  setActiveCurrency: (code: string) => void
  updateExchangeRate: (code: string, rate: number) => void
  formatAmount: (amount: number, currencyCode?: string) => string
  convertAmount: (amount: number, fromCurrency?: string) => number
  convertToGNF: (amount: number, fromCurrency: string) => number
  getExchangeRate: (code: string) => number
  getAvailableCurrencies: () => Currency[]
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      activeCurrency: CURRENCIES.find(c => c.isDefault) || CURRENCIES[0],
      customRates: {},
      ratesLastUpdated: null,

      setActiveCurrency: (code: string) => {
        const currency = CURRENCIES.find(c => c.code === code)
        if (currency) {
          set({ activeCurrency: currency })
        }
      },

      updateExchangeRate: (code: string, rate: number) => {
        set(state => ({
          customRates: { ...state.customRates, [code]: rate },
          ratesLastUpdated: new Date().toISOString()
        }))
      },

      formatAmount: (amount: number, currencyCode?: string) => {
        const code = currencyCode || get().activeCurrency.code
        return formatCurrency(amount, code)
      },

      convertAmount: (amount: number, fromCurrency?: string) => {
        const from = fromCurrency || 'GNF'
        const to = get().activeCurrency.code
        return convertCurrency(amount, from, to)
      },

      convertToGNF: (amount: number, fromCurrency: string) => {
        const customRates = get().customRates
        const rate = customRates[fromCurrency] || INVERSE_RATES[fromCurrency] || 1
        return amount * rate
      },

      getExchangeRate: (code: string) => {
        const customRates = get().customRates
        return customRates[code] || EXCHANGE_RATES[code] || 1
      },

      getAvailableCurrencies: () => CURRENCIES
    }),
    {
      name: 'savanaflow-currency',
      partialize: (state) => ({
        activeCurrency: state.activeCurrency,
        customRates: state.customRates,
        ratesLastUpdated: state.ratesLastUpdated
      })
    }
  )
)
