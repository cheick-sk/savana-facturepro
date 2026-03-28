import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as AsyncStorage from '@react-native-async-storage/async-storage';
import fr from './locales/fr.json';
import en from './locales/en.json';

export const resources = {
  fr: { translation: fr },
  en: { translation: en },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    defaultNS: 'translation',
    
    interpolation: {
      escapeValue: false,
    },
    
    react: {
      useSuspense: false,
    },
  });

// Language detector using AsyncStorage
export const initLanguage = async () => {
  try {
    const savedLang = await AsyncStorage.getItem('i18nextLng');
    if (savedLang && ['fr', 'en'].includes(savedLang)) {
      await i18n.changeLanguage(savedLang);
    }
  } catch (error) {
    console.error('Failed to load language:', error);
  }
};

export const changeLanguage = async (lang: string) => {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem('i18nextLng', lang);
};

export default i18n;
