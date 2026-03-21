/**
 * Système Multi-Devises pour SavanaFlow
 * Devise par défaut: Franc Guinéen (GNF)
 */

export interface Currency {
  code: string
  name: string
  symbol: string
  flag: string
  decimalPlaces: number
  isDefault?: boolean
}

export interface ExchangeRate {
  from: string
  to: string
  rate: number
  lastUpdated: Date
}

// Devises disponibles
export const CURRENCIES: Currency[] = [
  {
    code: 'GNF',
    name: 'Franc Guinéen',
    symbol: 'FG',
    flag: '🇬🇳',
    decimalPlaces: 0,
    isDefault: true
  },
  {
    code: 'XOF',
    name: 'Franc CFA (BCEAO)',
    symbol: 'CFA',
    flag: '🇸🇳',
    decimalPlaces: 0
  },
  {
    code: 'XAF',
    name: 'Franc CFA (BEAC)',
    symbol: 'FCFA',
    flag: '🇨🇲',
    decimalPlaces: 0
  },
  {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    flag: '🇪🇺',
    decimalPlaces: 2
  },
  {
    code: 'USD',
    name: 'Dollar US',
    symbol: '$',
    flag: '🇺🇸',
    decimalPlaces: 2
  },
  {
    code: 'GBP',
    name: 'Livre Sterling',
    symbol: '£',
    flag: '🇬🇧',
    decimalPlaces: 2
  },
  {
    code: 'MAD',
    name: 'Dirham Marocain',
    symbol: 'DH',
    flag: '🇲🇦',
    decimalPlaces: 2
  },
  {
    code: 'DZD',
    name: 'Dinar Algérien',
    symbol: 'DA',
    flag: '🇩🇿',
    decimalPlaces: 2
  },
  {
    code: 'TND',
    name: 'Dinar Tunisien',
    symbol: 'DT',
    flag: '🇹🇳',
    decimalPlaces: 3
  },
  {
    code: 'GHS',
    name: 'Cedi Ghanéen',
    symbol: 'GH₵',
    flag: '🇬🇭',
    decimalPlaces: 2
  },
  {
    code: 'NGN',
    name: 'Naira Nigérian',
    symbol: '₦',
    flag: '🇳🇬',
    decimalPlaces: 2
  },
  {
    code: 'KES',
    name: 'Shilling Kenyan',
    symbol: 'KSh',
    flag: '🇰🇪',
    decimalPlaces: 2
  },
  {
    code: 'ZAR',
    name: 'Rand Sud-Africain',
    symbol: 'R',
    flag: '🇿🇦',
    decimalPlaces: 2
  }
]

// Taux de change (par rapport au GNF - Franc Guinéen)
export const EXCHANGE_RATES: Record<string, number> = {
  GNF: 1,           // Base
  XOF: 0.058,       // 1 GNF = 0.058 XOF
  XAF: 0.058,       // 1 GNF = 0.058 XAF
  EUR: 0.000088,    // 1 GNF = 0.000088 EUR
  USD: 0.000096,    // 1 GNF = 0.000096 USD
  GBP: 0.000076,    // 1 GNF = 0.000076 GBP
  MAD: 0.00095,     // 1 GNF = 0.00095 MAD
  DZD: 0.013,       // 1 GNF = 0.013 DZD
  TND: 0.00029,     // 1 GNF = 0.00029 TND
  GHS: 0.0015,      // 1 GNF = 0.0015 GHS
  NGN: 0.15,        // 1 GNF = 0.15 NGN
  KES: 0.014,       // 1 GNF = 0.014 KES
  ZAR: 0.0018       // 1 GNF = 0.0018 ZAR
}

// Taux inverses (pour conversion vers GNF)
export const INVERSE_RATES: Record<string, number> = {
  GNF: 1,
  XOF: 17.24,       // 1 XOF = 17.24 GNF
  XAF: 17.24,       // 1 XAF = 17.24 GNF
  EUR: 11363.64,    // 1 EUR = 11363.64 GNF
  USD: 10416.67,    // 1 USD = 10416.67 GNF
  GBP: 13157.89,    // 1 GBP = 13157.89 GNF
  MAD: 1052.63,     // 1 MAD = 1052.63 GNF
  DZD: 76.92,       // 1 DZD = 76.92 GNF
  TND: 3448.28,     // 1 TND = 3448.28 GNF
  GHS: 666.67,      // 1 GHS = 666.67 GNF
  NGN: 6.67,        // 1 NGN = 6.67 GNF
  KES: 71.43,       // 1 KES = 71.43 GNF
  ZAR: 555.56       // 1 ZAR = 555.56 GNF
}

/**
 * Formate un montant dans une devise donnée
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'GNF',
  locale: string = 'fr-GN'
): string {
  const currency = CURRENCIES.find(c => c.code === currencyCode) || CURRENCIES[0]
  
  if (currencyCode === 'GNF') {
    // Format spécial pour le Franc Guinéen (pas de décimales)
    return `${currency.symbol} ${new Intl.NumberFormat(locale).format(Math.round(amount))}`
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currency.decimalPlaces,
    maximumFractionDigits: currency.decimalPlaces
  }).format(amount)
}

/**
 * Convertit un montant d'une devise à une autre
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) return amount
  
  // Convertir d'abord en GNF (devise de base)
  const amountInGNF = fromCurrency === 'GNF' 
    ? amount 
    : amount * (INVERSE_RATES[fromCurrency] || 1)
  
  // Puis convertir de GNF vers la devise cible
  return toCurrency === 'GNF'
    ? amountInGNF
    : amountInGNF * (EXCHANGE_RATES[toCurrency] || 1)
}

/**
 * Obtient la devise par défaut
 */
export function getDefaultCurrency(): Currency {
  return CURRENCIES.find(c => c.isDefault) || CURRENCIES[0]
}

/**
 * Obtient une devise par son code
 */
export function getCurrencyByCode(code: string): Currency | undefined {
  return CURRENCIES.find(c => c.code === code)
}

/**
 * Calcule le montant avec taxe
 */
export function calculateWithTax(amount: number, taxRate: number): number {
  return amount * (1 + taxRate / 100)
}

/**
 * Calcule la taxe à partir du montant TTC
 */
export function extractTax(amountWithTax: number, taxRate: number): number {
  return amountWithTax * taxRate / (100 + taxRate)
}
