import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import frTranslation from './locales/fr.json';
import enTranslation from './locales/en.json';
import woTranslation from './locales/wo.json';  // Wolof (Senegal)
import swTranslation from './locales/sw.json';  // Swahili (East Africa)

// Available languages
export const resources = {
  fr: { translation: frTranslation },
  en: { translation: enTranslation },
  wo: { translation: woTranslation },
  sw: { translation: swTranslation },
} as const;

// Supported languages with metadata
export const supportedLanguages = [
  { 
    code: 'fr', 
    name: 'Français', 
    nativeName: 'Français',
    flag: '🇫🇷',
    countries: ['CI', 'SN', 'BF', 'ML', 'BJ', 'TG', 'NE', 'CM', 'GA', 'CG'],
    default: true 
  },
  { 
    code: 'en', 
    name: 'English', 
    nativeName: 'English',
    flag: '🇬🇧',
    countries: ['NG', 'GH', 'KE', 'TZ', 'UG', 'RW', 'ZA'],
    default: false 
  },
  { 
    code: 'wo', 
    name: 'Wolof', 
    nativeName: 'Wolof',
    flag: '🇸🇳',
    countries: ['SN', 'MR', 'GM'],
    default: false 
  },
  { 
    code: 'sw', 
    name: 'Swahili', 
    nativeName: 'Kiswahili',
    flag: '🇰🇪',
    countries: ['KE', 'TZ', 'UG', 'RW', 'CD', 'MZ'],
    default: false 
  },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    defaultNS: 'translation',
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
      htmlTag: document.documentElement,
    },

    interpolation: {
      escapeValue: false, // React already escapes values
      formatSeparator: ',',
    },

    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },

    // Load translations lazily for better performance
    load: 'languageOnly',
    
    // Whitelist only supported languages
    supportedLngs: ['fr', 'en', 'wo', 'sw'],
    
    // Non-explicit whitelist - allow only supported languages
    nonExplicitSupportedLngs: true,
  });

export default i18n;

// Helper to get current language info
export function getCurrentLanguage() {
  const currentLang = i18n.language || 'fr';
  return supportedLanguages.find(l => l.code === currentLang) || supportedLanguages[0];
}

// Helper to get language by country code
export function getLanguageByCountry(countryCode: string): string {
  const lang = supportedLanguages.find(l => l.countries.includes(countryCode));
  return lang ? lang.code : 'fr';
}

// Format currency with locale
export function formatCurrency(amount: number, currency: string = 'XOF'): string {
  const currentLang = i18n.language || 'fr';
  
  const currencyLocales: Record<string, string> = {
    XOF: 'fr-SN',
    XAF: 'fr-CM',
    NGN: 'en-NG',
    GHS: 'en-GH',
    KES: 'sw-KE',
    TZS: 'sw-TZ',
    UGX: 'sw-UG',
    RWF: 'sw-RW',
    ZAR: 'en-ZA',
    MAD: 'fr-MA',
    TND: 'ar-TN',
    ETB: 'am-ET',
  };
  
  const locale = currencyLocales[currency] || currentLang;
  
  // Use simple formatting for African currencies that don't have proper locale support
  if (['XOF', 'XAF'].includes(currency)) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ' + currency;
  }
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ' + currency;
  }
}

// Format date with locale
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const currentLang = i18n.language || 'fr';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  };
  
  const localeMap: Record<string, string> = {
    fr: 'fr-FR',
    en: 'en-GB',
    wo: 'fr-SN',
    sw: 'sw-KE',
  };
  
  const locale = localeMap[currentLang] || 'fr-FR';
  
  return new Intl.DateTimeFormat(locale, defaultOptions).format(new Date(date));
}

// Format date and time with locale
export function formatDateTime(date: string | Date): string {
  return formatDate(date, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format number with locale
export function formatNumber(value: number, decimals: number = 0): string {
  const currentLang = i18n.language || 'fr';
  
  const localeMap: Record<string, string> = {
    fr: 'fr-FR',
    en: 'en-GB',
    wo: 'fr-SN',
    sw: 'sw-KE',
  };
  
  const locale = localeMap[currentLang] || 'fr-FR';
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Translate with interpolation
export function t(key: string, options?: Record<string, any>): string {
  return i18n.t(key, options);
}

// Change language and persist
export function changeLanguage(languageCode: string): Promise<void> {
  return new Promise((resolve, reject) => {
    i18n.changeLanguage(languageCode, (err: Error | null | undefined) => {
      if (err) {
        reject(err);
      } else {
        localStorage.setItem('i18nextLng', languageCode);
        resolve();
      }
    });
  });
}
