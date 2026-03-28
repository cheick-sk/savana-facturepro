/**
 * App Configuration
 */
export const APP_CONFIG = {
  name: 'SaaS Africa',
  version: '1.0.0',
  defaultLanguage: 'fr',
  supportedLanguages: ['fr', 'en'],
};

/**
 * API Configuration
 */
export const API_CONFIG = {
  baseUrl: 'https://api.savana-africa.com',
  timeout: 30000,
  urls: {
    facturepro: '/api/v1/facturepro',
    savanaflow: '/api/v1/savanaflow',
    schoolflow: '/api/v1/schoolflow',
  },
};

/**
 * App Types
 */
export const APP_TYPES = {
  FACTUREPRO: 'facturepro',
  SAVANAFLOW: 'savanaflow',
  SCHOOLFLOW: 'schoolflow',
} as const;

/**
 * App Details
 */
export const APPS = {
  facturepro: {
    id: 'facturepro',
    name: 'FacturePro',
    description: 'Facturation & Devis',
    color: '#2563eb',
    icon: 'document-text',
  },
  savanaflow: {
    id: 'savanaflow',
    name: 'SavanaFlow',
    description: 'Point de Vente',
    color: '#10b981',
    icon: 'cart',
  },
  schoolflow: {
    id: 'schoolflow',
    name: 'SchoolFlow',
    description: 'Gestion Scolaire',
    color: '#8b5cf6',
    icon: 'school',
  },
};

/**
 * Invoice Statuses
 */
export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
} as const;

export const INVOICE_STATUS_LABELS = {
  draft: 'Brouillon',
  sent: 'Envoyée',
  paid: 'Payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
};

/**
 * Attendance Statuses
 */
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
} as const;

export const ATTENDANCE_STATUS_LABELS = {
  present: 'Présent',
  absent: 'Absent',
  late: 'Retard',
  excused: 'Excusé',
};

/**
 * Payment Methods
 */
export const PAYMENT_METHODS = {
  CASH: 'cash',
  MOBILE_MONEY: 'mobile',
  CARD: 'card',
  BANK_TRANSFER: 'transfer',
  CHECK: 'check',
} as const;

export const PAYMENT_METHOD_LABELS = {
  cash: 'Espèces',
  mobile: 'Mobile Money',
  card: 'Carte bancaire',
  transfer: 'Virement bancaire',
  check: 'Chèque',
};

/**
 * Mobile Money Providers
 */
export const MOBILE_MONEY_PROVIDERS = [
  { id: 'orange', name: 'Orange Money', color: '#ff6600' },
  { id: 'mtn', name: 'MTN MoMo', color: '#ffcc00' },
  { id: 'wave', name: 'Wave', color: '#1dc3f0' },
  { id: 'moov', name: 'Moov Money', color: '#0066cc' },
  { id: 'airtel', name: 'Airtel Money', color: '#ed1c24' },
];

/**
 * Currency Configuration
 */
export const CURRENCY = {
  code: 'XOF',
  symbol: 'FCFA',
  name: 'Franc CFA',
  locale: 'fr-FR',
};

/**
 * Tax Configuration
 */
export const TAX = {
  rate: 0.18, // 18% TVA
  name: 'TVA',
};

/**
 * Sync Configuration
 */
export const SYNC_CONFIG = {
  interval: 30000, // 30 seconds
  maxRetries: 3,
  maxQueueSize: 100,
};

/**
 * Pagination
 */
export const PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100,
};

/**
 * Date Formats
 */
export const DATE_FORMATS = {
  display: 'dd MMMM yyyy',
  short: 'dd/MM/yyyy',
  time: 'HH:mm',
  dateTime: 'dd/MM/yyyy HH:mm',
  iso: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
};

/**
 * Validation Rules
 */
export const VALIDATION = {
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: false,
  },
  name: {
    minLength: 2,
    maxLength: 100,
  },
  email: {
    maxLength: 255,
  },
  phone: {
    minLength: 8,
    maxLength: 15,
  },
  description: {
    maxLength: 1000,
  },
};

/**
 * Storage Keys
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_PROFILE: 'user_profile',
  SELECTED_APP: 'selected_app',
  CART: 'cart',
  OFFLINE_QUEUE: 'offline_queue',
  LAST_SYNC: 'last_sync',
  SETTINGS: 'settings',
  LANGUAGE: 'app_language',
  THEME: 'app_theme',
};

/**
 * Notification Channels
 */
export const NOTIFICATION_CHANNELS = {
  SALES: 'sales',
  INVOICES: 'invoices',
  STOCK: 'stock',
  ATTENDANCE: 'attendance',
  SYSTEM: 'system',
};

/**
 * Theme Colors
 */
export const COLORS = {
  primary: '#2563eb',
  secondary: '#6b7280',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#0284c7',
  
  // App-specific
  facturepro: '#2563eb',
  savanaflow: '#10b981',
  schoolflow: '#8b5cf6',
  
  // Neutrals
  white: '#ffffff',
  black: '#111827',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};

export default {
  APP_CONFIG,
  API_CONFIG,
  APP_TYPES,
  APPS,
  INVOICE_STATUS,
  INVOICE_STATUS_LABELS,
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  MOBILE_MONEY_PROVIDERS,
  CURRENCY,
  TAX,
  SYNC_CONFIG,
  PAGINATION,
  DATE_FORMATS,
  VALIDATION,
  STORAGE_KEYS,
  NOTIFICATION_CHANNELS,
  COLORS,
};
