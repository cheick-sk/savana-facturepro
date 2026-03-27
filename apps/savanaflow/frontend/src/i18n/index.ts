import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import frTranslation from './locales/fr.json';
import enTranslation from './locales/en.json';
import woTranslation from './locales/wo.json';  // Wolof (Senegal)
import swTranslation from './locales/sw.json';  // Swahili (East Africa)
import susTranslation from './locales/sus.json';  // Soussou (Guinea)

// Clean corrupted localStorage values before i18n init
const LANG_KEY = 'savanaflow-lang';
try {
  const langValue = localStorage.getItem(LANG_KEY);
  if (langValue === 'undefined' || langValue === 'null' || langValue === '') {
    localStorage.removeItem(LANG_KEY);
  }
} catch {
  // Ignore errors
}

// Available languages
export const resources = {
  fr: { translation: frTranslation },
  en: { translation: enTranslation },
  wo: { translation: woTranslation },
  sw: { translation: swTranslation },
  sus: { translation: susTranslation },
} as const;

// Supported languages with metadata
export const supportedLanguages = [
  { 
    code: 'fr', 
    name: 'Français', 
    nativeName: 'Français',
    flag: '🇫🇷',
    countries: ['CI', 'SN', 'BF', 'ML', 'BJ', 'TG', 'NE', 'CM', 'GA', 'CG', 'GN'],
    default: true 
  },
  { 
    code: 'en', 
    name: 'English', 
    nativeName: 'English',
    flag: '🇬🇧',
    countries: ['NG', 'GH', 'KE', 'TZ', 'UG', 'RW', 'ZA', 'GM', 'SL', 'LR'],
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
  { 
    code: 'sus', 
    name: 'Soussou', 
    nativeName: 'Sosoxui',
    flag: '🇬🇳',
    countries: ['GN'],
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
      lookupLocalStorage: 'savanaflow-lang',
      caches: ['localStorage'],
      htmlTag: document.documentElement,
    },

    interpolation: {
      escapeValue: false,
      formatSeparator: ',',
    },

    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },

    load: 'languageOnly',
    supportedLngs: ['fr', 'en', 'wo', 'sw', 'sus'],
    nonExplicitSupportedLngs: true,
  });

export default i18n;

// Helper functions
export function getCurrentLanguage() {
  const currentLang = i18n.language || 'fr';
  return supportedLanguages.find(l => l.code === currentLang) || supportedLanguages[0];
}

export function getLanguageByCountry(countryCode: string): string {
  const lang = supportedLanguages.find(l => l.countries.includes(countryCode));
  return lang ? lang.code : 'fr';
}

export function formatCurrency(amount: number, currency: string = 'XOF'): string {
  const currentLang = i18n.language || 'fr';
  
  const currencyLocales: Record<string, string> = {
    XOF: 'fr-SN',
    XAF: 'fr-CM',
    GNF: 'fr-GN',
    NGN: 'en-NG',
    GHS: 'en-GH',
    KES: 'sw-KE',
    TZS: 'sw-TZ',
    UGX: 'sw-UG',
    RWF: 'sw-RW',
    ZAR: 'en-ZA',
    MAD: 'fr-MA',
    TND: 'ar-TN',
    EGP: 'ar-EG',
  };
  
  // Use simple formatting for African currencies
  if (['XOF', 'XAF', 'GNF'].includes(currency)) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ' + currency;
  }
  
  try {
    const locale = currencyLocales[currency] || currentLang;
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
    sus: 'fr-GN',
  };
  
  return new Intl.DateTimeFormat(localeMap[currentLang] || 'fr-FR', defaultOptions).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function t(key: string, options?: Record<string, any>): string {
  return i18n.t(key, options);
}

export function changeLanguage(languageCode: string): Promise<void> {
  return new Promise((resolve, reject) => {
    i18n.changeLanguage(languageCode, (err: Error | null | undefined) => {
      if (err) {
        reject(err);
      } else {
        localStorage.setItem('savanaflow-lang', languageCode);
        resolve();
      }
    });
  });
}
