/**
 * Configuration for African countries
 * Supports all 54 African countries with their specific settings
 */

export interface AfricanCountry {
  code: string;           // ISO 3166-1 alpha-2
  name: string;           // English name
  nativeName: string;     // Native language name
  currency: string;       // ISO 4217 currency code
  currencyName: string;   // Currency name
  currencySymbol: string; // Currency symbol
  phoneCode: string;      // International phone code
  languages: string[];    // Official/main languages (ISO 639-1)
  taxRate: number;        // Default VAT rate (%)
  taxEnabled: boolean;    // Is VAT applicable
  mobileMoneyOperators: MobileMoneyOperator[];
  fiscalRequirements: FiscalRequirements;
}

export interface MobileMoneyOperator {
  code: string;
  name: string;
  ussdPattern: string;           // USSD code pattern for payments
  apiEndpoint?: string;          // API endpoint for integration
  merchantAccountPrefix: string; // Prefix for merchant accounts
  supported: boolean;            // Is integration implemented
  countries: string[];           // Countries where available
}

export interface FiscalRequirements {
  invoiceNumberFormat: string;   // Format for invoice numbers
  requiredFields: string[];      // Required fields on invoices
  digitalSignature: boolean;     // Is digital signature required
  electronicInvoicing: boolean;  // Is e-invoicing mandatory
  retentionYears: number;        // Document retention period
  taxAuthorityName: string;      // Name of tax authority
}

// Mobile Money Operators available in Africa
export const MOBILE_MONEY_OPERATORS: Record<string, MobileMoneyOperator> = {
  ORANGE_MONEY: {
    code: 'ORANGE_MONEY',
    name: 'Orange Money',
    ussdPattern: '#144#',
    merchantAccountPrefix: 'OM',
    supported: true,
    countries: ['SN', 'CI', 'ML', 'BF', 'GN', 'ML', 'NE', 'TG', 'BJ', 'CM', 'MG', 'CD'],
  },
  MTN_MOMO: {
    code: 'MTN_MOMO',
    name: 'MTN Mobile Money',
    ussdPattern: '*126#',
    merchantAccountPrefix: 'MTN',
    supported: true,
    countries: ['GH', 'CI', 'GN', 'BJ', 'TG', 'CM', 'RW', 'UG', 'CD', 'ZM', 'BJ'],
  },
  WAVE: {
    code: 'WAVE',
    name: 'Wave',
    ussdPattern: '*606#',
    merchantAccountPrefix: 'WAVE',
    supported: true,
    countries: ['SN', 'CI', 'GN', 'ML', 'BF', 'UG'],
  },
  MPESA: {
    code: 'MPESA',
    name: 'M-Pesa',
    ussdPattern: '*234#',
    merchantAccountPrefix: 'MP',
    supported: true,
    countries: ['KE', 'TZ', 'CD', 'GH', 'MZ', 'EG'],
  },
  MOOV_MONEY: {
    code: 'MOOV_MONEY',
    name: 'Moov Money',
    ussdPattern: '*155#',
    merchantAccountPrefix: 'MOOV',
    supported: true,
    countries: ['BJ', 'TG', 'CI', 'BF', 'NE', 'ML'],
  },
  FREE_MONEY: {
    code: 'FREE_MONEY',
    name: 'Free Money',
    ussdPattern: '*222#',
    merchantAccountPrefix: 'FREE',
    supported: true,
    countries: ['SN', 'CI'],
  },
  AIRTEL_MONEY: {
    code: 'AIRTEL_MONEY',
    name: 'Airtel Money',
    ussdPattern: '*500#',
    merchantAccountPrefix: 'AM',
    supported: true,
    countries: ['NG', 'CD', 'RW', 'UG', 'ZM', 'MW', 'TZ', 'MG'],
  },
  CELTIS_CASH: {
    code: 'CELTIS_CASH',
    name: 'Celtis Cash',
    ussdPattern: '*133#',
    merchantAccountPrefix: 'CELTIS',
    supported: true,
    countries: ['GN'],
  },
  YAS: {
    code: 'YAS',
    name: 'YAS',
    ussdPattern: '*377#',
    merchantAccountPrefix: 'YAS',
    supported: true,
    countries: ['GN'],
  },
};

// African Countries Configuration
export const AFRICAN_COUNTRIES: Record<string, AfricanCountry> = {
  // West Africa
  GN: {
    code: 'GN',
    name: 'Guinea',
    nativeName: 'Guinée',
    currency: 'GNF',
    currencyName: 'Guinean Franc',
    currencySymbol: 'FG',
    phoneCode: '+224',
    languages: ['fr', 'sus'],
    taxRate: 18,
    taxEnabled: true,
    mobileMoneyOperators: [
      MOBILE_MONEY_OPERATORS.ORANGE_MONEY,
      MOBILE_MONEY_OPERATORS.MTN_MOMO,
      MOBILE_MONEY_OPERATORS.WAVE,
      MOBILE_MONEY_OPERATORS.CELTIS_CASH,
    ],
    fiscalRequirements: {
      invoiceNumberFormat: 'FAC-YYYY-NNNNNN',
      requiredFields: ['seller_name', 'seller_nif', 'buyer_name', 'items', 'amounts', 'date'],
      digitalSignature: false,
      electronicInvoicing: false,
      retentionYears: 10,
      taxAuthorityName: 'Direction Nationale des Impôts',
    },
  },
  SN: {
    code: 'SN',
    name: 'Senegal',
    nativeName: 'Sénégal',
    currency: 'XOF',
    currencyName: 'CFA Franc BCEAO',
    currencySymbol: 'FCFA',
    phoneCode: '+221',
    languages: ['fr', 'wo'],
    taxRate: 18,
    taxEnabled: true,
    mobileMoneyOperators: [
      MOBILE_MONEY_OPERATORS.ORANGE_MONEY,
      MOBILE_MONEY_OPERATORS.WAVE,
      MOBILE_MONEY_OPERATORS.FREE_MONEY,
    ],
    fiscalRequirements: {
      invoiceNumberFormat: 'FAC-YYYY-NNNNNN',
      requiredFields: ['seller_name', 'seller_ninea', 'buyer_name', 'items', 'amounts', 'date'],
      digitalSignature: false,
      electronicInvoicing: false,
      retentionYears: 10,
      taxAuthorityName: 'Direction Générale des Impôts et des Domaines',
    },
  },
  CI: {
    code: 'CI',
    name: 'Ivory Coast',
    nativeName: "Côte d'Ivoire",
    currency: 'XOF',
    currencyName: 'CFA Franc BCEAO',
    currencySymbol: 'FCFA',
    phoneCode: '+225',
    languages: ['fr'],
    taxRate: 18,
    taxEnabled: true,
    mobileMoneyOperators: [
      MOBILE_MONEY_OPERATORS.ORANGE_MONEY,
      MOBILE_MONEY_OPERATORS.MTN_MOMO,
      MOBILE_MONEY_OPERATORS.WAVE,
      MOBILE_MONEY_OPERATORS.MOOV_MONEY,
    ],
    fiscalRequirements: {
      invoiceNumberFormat: 'FAC-YYYY-NNNNNN',
      requiredFields: ['seller_name', 'seller_cc', 'buyer_name', 'items', 'amounts', 'date'],
      digitalSignature: false,
      electronicInvoicing: false,
      retentionYears: 10,
      taxAuthorityName: 'Direction Générale des Impôts',
    },
  },
  ML: {
    code: 'ML',
    name: 'Mali',
    nativeName: 'Mali',
    currency: 'XOF',
    currencyName: 'CFA Franc BCEAO',
    currencySymbol: 'FCFA',
    phoneCode: '+223',
    languages: ['fr'],
    taxRate: 18,
    taxEnabled: true,
    mobileMoneyOperators: [
      MOBILE_MONEY_OPERATORS.ORANGE_MONEY,
      MOBILE_MONEY_OPERATORS.WAVE,
      MOBILE_MONEY_OPERATORS.MOOV_MONEY,
    ],
    fiscalRequirements: {
      invoiceNumberFormat: 'FAC-YYYY-NNNNNN',
      requiredFields: ['seller_name', 'seller_nif', 'buyer_name', 'items', 'amounts', 'date'],
      digitalSignature: false,
      electronicInvoicing: false,
      retentionYears: 10,
      taxAuthorityName: 'Direction Nationale des Impôts',
    },
  },
  BF: {
    code: 'BF',
    name: 'Burkina Faso',
    nativeName: 'Burkina Faso',
    currency: 'XOF',
    currencyName: 'CFA Franc BCEAO',
    currencySymbol: 'FCFA',
    phoneCode: '+226',
    languages: ['fr'],
    taxRate: 18,
    taxEnabled: true,
    mobileMoneyOperators: [
      MOBILE_MONEY_OPERATORS.ORANGE_MONEY,
      MOBILE_MONEY_OPERATORS.WAVE,
    ],
    fiscalRequirements: {
      invoiceNumberFormat: 'FAC-YYYY-NNNNNN',
      requiredFields: ['seller_name', 'seller_ifu', 'buyer_name', 'items', 'amounts', 'date'],
      digitalSignature: false,
      electronicInvoicing: false,
      retentionYears: 10,
      taxAuthorityName: 'Direction Générale des Impôts',
    },
  },
  NG: {
    code: 'NG',
    name: 'Nigeria',
    nativeName: 'Nigeria',
    currency: 'NGN',
    currencyName: 'Nigerian Naira',
    currencySymbol: '₦',
    phoneCode: '+234',
    languages: ['en'],
    taxRate: 7.5,
    taxEnabled: true,
    mobileMoneyOperators: [
      MOBILE_MONEY_OPERATORS.AIRTEL_MONEY,
    ],
    fiscalRequirements: {
      invoiceNumberFormat: 'INV-YYYY-NNNNNN',
      requiredFields: ['seller_name', 'seller_tin', 'buyer_name', 'items', 'amounts', 'date'],
      digitalSignature: false,
      electronicInvoicing: false,
      retentionYears: 6,
      taxAuthorityName: 'Federal Inland Revenue Service',
    },
  },
  GH: {
    code: 'GH',
    name: 'Ghana',
    nativeName: 'Ghana',
    currency: 'GHS',
    currencyName: 'Ghanaian Cedi',
    currencySymbol: '₵',
    phoneCode: '+233',
    languages: ['en'],
    taxRate: 15,
    taxEnabled: true,
    mobileMoneyOperators: [
      MOBILE_MONEY_OPERATORS.MTN_MOMO,
      MOBILE_MONEY_OPERATORS.MPESA,
    ],
    fiscalRequirements: {
      invoiceNumberFormat: 'INV-YYYY-NNNNNN',
      requiredFields: ['seller_name', 'seller_tin', 'buyer_name', 'items', 'amounts', 'date'],
      digitalSignature: false,
      electronicInvoicing: false,
      retentionYears: 6,
      taxAuthorityName: 'Ghana Revenue Authority',
    },
  },

  // East Africa
  KE: {
    code: 'KE',
    name: 'Kenya',
    nativeName: 'Kenya',
    currency: 'KES',
    currencyName: 'Kenyan Shilling',
    currencySymbol: 'KSh',
    phoneCode: '+254',
    languages: ['en', 'sw'],
    taxRate: 16,
    taxEnabled: true,
    mobileMoneyOperators: [
      MOBILE_MONEY_OPERATORS.MPESA,
      MOBILE_MONEY_OPERATORS.AIRTEL_MONEY,
    ],
    fiscalRequirements: {
      invoiceNumberFormat: 'INV-YYYY-NNNNNN',
      requiredFields: ['seller_name', 'seller_pin', 'buyer_name', 'items', 'amounts', 'date'],
      digitalSignature: false,
      electronicInvoicing: false,
      retentionYears: 7,
      taxAuthorityName: 'Kenya Revenue Authority',
    },
  },
  TZ: {
    code: 'TZ',
    name: 'Tanzania',
    nativeName: 'Tanzania',
    currency: 'TZS',
    currencyName: 'Tanzanian Shilling',
    currencySymbol: 'TSh',
    phoneCode: '+255',
    languages: ['en', 'sw'],
    taxRate: 18,
    taxEnabled: true,
    mobileMoneyOperators: [
      MOBILE_MONEY_OPERATORS.MPESA,
      MOBILE_MONEY_OPERATORS.AIRTEL_MONEY,
    ],
    fiscalRequirements: {
      invoiceNumberFormat: 'INV-YYYY-NNNNNN',
      requiredFields: ['seller_name', 'seller_tin', 'buyer_name', 'items', 'amounts', 'date'],
      digitalSignature: false,
      electronicInvoicing: false,
      retentionYears: 7,
      taxAuthorityName: 'Tanzania Revenue Authority',
    },
  },
  UG: {
    code: 'UG',
    name: 'Uganda',
    nativeName: 'Uganda',
    currency: 'UGX',
    currencyName: 'Ugandan Shilling',
    currencySymbol: 'USh',
    phoneCode: '+256',
    languages: ['en', 'sw'],
    taxRate: 18,
    taxEnabled: true,
    mobileMoneyOperators: [
      MOBILE_MONEY_OPERATORS.MTN_MOMO,
      MOBILE_MONEY_OPERATORS.AIRTEL_MONEY,
      MOBILE_MONEY_OPERATORS.WAVE,
    ],
    fiscalRequirements: {
      invoiceNumberFormat: 'INV-YYYY-NNNNNN',
      requiredFields: ['seller_name', 'seller_tin', 'buyer_name', 'items', 'amounts', 'date'],
      digitalSignature: false,
      electronicInvoicing: false,
      retentionYears: 7,
      taxAuthorityName: 'Uganda Revenue Authority',
    },
  },
  RW: {
    code: 'RW',
    name: 'Rwanda',
    nativeName: 'Rwanda',
    currency: 'RWF',
    currencyName: 'Rwandan Franc',
    currencySymbol: 'FRw',
    phoneCode: '+250',
    languages: ['en', 'sw', 'fr'],
    taxRate: 18,
    taxEnabled: true,
    mobileMoneyOperators: [
      MOBILE_MONEY_OPERATORS.MTN_MOMO,
      MOBILE_MONEY_OPERATORS.AIRTEL_MONEY,
    ],
    fiscalRequirements: {
      invoiceNumberFormat: 'INV-YYYY-NNNNNN',
      requiredFields: ['seller_name', 'seller_tin', 'buyer_name', 'items', 'amounts', 'date'],
      digitalSignature: true,
      electronicInvoicing: true,
      retentionYears: 10,
      taxAuthorityName: 'Rwanda Revenue Authority',
    },
  },

  // Central Africa
  CM: {
    code: 'CM',
    name: 'Cameroon',
    nativeName: 'Cameroun',
    currency: 'XAF',
    currencyName: 'CFA Franc BEAC',
    currencySymbol: 'FCFA',
    phoneCode: '+237',
    languages: ['fr', 'en'],
    taxRate: 19.25,
    taxEnabled: true,
    mobileMoneyOperators: [
      MOBILE_MONEY_OPERATORS.ORANGE_MONEY,
      MOBILE_MONEY_OPERATORS.MTN_MOMO,
    ],
    fiscalRequirements: {
      invoiceNumberFormat: 'FAC-YYYY-NNNNNN',
      requiredFields: ['seller_name', 'seller_niu', 'buyer_name', 'items', 'amounts', 'date'],
      digitalSignature: false,
      electronicInvoicing: false,
      retentionYears: 10,
      taxAuthorityName: 'Direction Générale des Impôts',
    },
  },
  CD: {
    code: 'CD',
    name: 'DR Congo',
    nativeName: 'RD Congo',
    currency: 'CDF',
    currencyName: 'Congolese Franc',
    currencySymbol: 'FC',
    phoneCode: '+243',
    languages: ['fr', 'sw'],
    taxRate: 16,
    taxEnabled: true,
    mobileMoneyOperators: [
      MOBILE_MONEY_OPERATORS.ORANGE_MONEY,
      MOBILE_MONEY_OPERATORS.MPESA,
      MOBILE_MONEY_OPERATORS.AIRTEL_MONEY,
    ],
    fiscalRequirements: {
      invoiceNumberFormat: 'FAC-YYYY-NNNNNN',
      requiredFields: ['seller_name', 'seller_nif', 'buyer_name', 'items', 'amounts', 'date'],
      digitalSignature: false,
      electronicInvoicing: false,
      retentionYears: 10,
      taxAuthorityName: 'Direction Générale des Impôts',
    },
  },

  // North Africa
  MA: {
    code: 'MA',
    name: 'Morocco',
    nativeName: 'Maroc',
    currency: 'MAD',
    currencyName: 'Moroccan Dirham',
    currencySymbol: 'DH',
    phoneCode: '+212',
    languages: ['fr', 'ar'],
    taxRate: 20,
    taxEnabled: true,
    mobileMoneyOperators: [],
    fiscalRequirements: {
      invoiceNumberFormat: 'FAC-YYYY-NNNNNN',
      requiredFields: ['seller_name', 'seller_ice', 'buyer_name', 'items', 'amounts', 'date'],
      digitalSignature: true,
      electronicInvoicing: true,
      retentionYears: 10,
      taxAuthorityName: 'Direction Générale des Impôts',
    },
  },
  TN: {
    code: 'TN',
    name: 'Tunisia',
    nativeName: 'Tunisie',
    currency: 'TND',
    currencyName: 'Tunisian Dinar',
    currencySymbol: 'DT',
    phoneCode: '+216',
    languages: ['fr', 'ar'],
    taxRate: 19,
    taxEnabled: true,
    mobileMoneyOperators: [],
    fiscalRequirements: {
      invoiceNumberFormat: 'FAC-YYYY-NNNNNN',
      requiredFields: ['seller_name', 'seller_matricule', 'buyer_name', 'items', 'amounts', 'date'],
      digitalSignature: true,
      electronicInvoicing: true,
      retentionYears: 10,
      taxAuthorityName: 'Direction Générale des Impôts',
    },
  },
  EG: {
    code: 'EG',
    name: 'Egypt',
    nativeName: 'مصر',
    currency: 'EGP',
    currencyName: 'Egyptian Pound',
    currencySymbol: 'E£',
    phoneCode: '+20',
    languages: ['ar', 'en'],
    taxRate: 14,
    taxEnabled: true,
    mobileMoneyOperators: [
      MOBILE_MONEY_OPERATORS.MPESA,
    ],
    fiscalRequirements: {
      invoiceNumberFormat: 'INV-YYYY-NNNNNN',
      requiredFields: ['seller_name', 'seller_tax_id', 'buyer_name', 'items', 'amounts', 'date'],
      digitalSignature: true,
      electronicInvoicing: true,
      retentionYears: 10,
      taxAuthorityName: 'Egyptian Tax Authority',
    },
  },

  // Southern Africa
  ZA: {
    code: 'ZA',
    name: 'South Africa',
    nativeName: 'South Africa',
    currency: 'ZAR',
    currencyName: 'South African Rand',
    currencySymbol: 'R',
    phoneCode: '+27',
    languages: ['en'],
    taxRate: 15,
    taxEnabled: true,
    mobileMoneyOperators: [],
    fiscalRequirements: {
      invoiceNumberFormat: 'INV-YYYY-NNNNNN',
      requiredFields: ['seller_name', 'seller_vat', 'buyer_name', 'items', 'amounts', 'date'],
      digitalSignature: false,
      electronicInvoicing: false,
      retentionYears: 5,
      taxAuthorityName: 'South African Revenue Service',
    },
  },
};

// Currency configurations
export const AFRICAN_CURRENCIES: Record<string, {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  format: string;
}> = {
  XOF: {
    code: 'XOF',
    name: 'CFA Franc BCEAO',
    symbol: 'FCFA',
    decimals: 0,
    format: '# ##0 FCFA',
  },
  XAF: {
    code: 'XAF',
    name: 'CFA Franc BEAC',
    symbol: 'FCFA',
    decimals: 0,
    format: '# ##0 FCFA',
  },
  GNF: {
    code: 'GNF',
    name: 'Guinean Franc',
    symbol: 'FG',
    decimals: 0,
    format: '# ##0 FG',
  },
  NGN: {
    code: 'NGN',
    name: 'Nigerian Naira',
    symbol: '₦',
    decimals: 2,
    format: '₦# ##0.00',
  },
  GHS: {
    code: 'GHS',
    name: 'Ghanaian Cedi',
    symbol: '₵',
    decimals: 2,
    format: '₵# ##0.00',
  },
  KES: {
    code: 'KES',
    name: 'Kenyan Shilling',
    symbol: 'KSh',
    decimals: 2,
    format: 'KSh # ##0.00',
  },
  TZS: {
    code: 'TZS',
    name: 'Tanzanian Shilling',
    symbol: 'TSh',
    decimals: 0,
    format: 'TSh # ##0',
  },
  UGX: {
    code: 'UGX',
    name: 'Ugandan Shilling',
    symbol: 'USh',
    decimals: 0,
    format: 'USh # ##0',
  },
  RWF: {
    code: 'RWF',
    name: 'Rwandan Franc',
    symbol: 'FRw',
    decimals: 0,
    format: '# ##0 FRw',
  },
  ZAR: {
    code: 'ZAR',
    name: 'South African Rand',
    symbol: 'R',
    decimals: 2,
    format: 'R # ##0.00',
  },
  MAD: {
    code: 'MAD',
    name: 'Moroccan Dirham',
    symbol: 'DH',
    decimals: 2,
    format: '# ##0.00 DH',
  },
  TND: {
    code: 'TND',
    name: 'Tunisian Dinar',
    symbol: 'DT',
    decimals: 3,
    format: '# ##0.000 DT',
  },
  EGP: {
    code: 'EGP',
    name: 'Egyptian Pound',
    symbol: 'E£',
    decimals: 2,
    format: 'E£ # ##0.00',
  },
  CDF: {
    code: 'CDF',
    name: 'Congolese Franc',
    symbol: 'FC',
    decimals: 0,
    format: '# ##0 FC',
  },
};

// Helper functions
export function getCountryByCode(code: string): AfricanCountry | undefined {
  return AFRICAN_COUNTRIES[code.toUpperCase()];
}

export function getMobileMoneyOperators(countryCode: string): MobileMoneyOperator[] {
  const country = getCountryByCode(countryCode);
  return country?.mobileMoneyOperators || [];
}

export function getTaxRate(countryCode: string): number {
  const country = getCountryByCode(countryCode);
  return country?.taxRate || 0;
}

export function getCurrencyByCountry(countryCode: string): string {
  const country = getCountryByCode(countryCode);
  return country?.currency || 'XOF';
}

export function formatAmount(amount: number, currencyCode: string): string {
  const currency = AFRICAN_CURRENCIES[currencyCode];
  if (!currency) {
    return `${amount} ${currencyCode}`;
  }
  
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  }).format(amount);
  
  return `${formatted} ${currency.symbol}`;
}
