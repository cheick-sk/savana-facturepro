import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Translations
const resources = {
  fr: {
    translation: {
      common: {
        appName: 'SavanaFlow POS',
        loading: 'Chargement...',
        save: 'Enregistrer',
        cancel: 'Annuler',
        delete: 'Supprimer',
        search: 'Rechercher',
        confirm: 'Confirmer',
        close: 'Fermer',
        total: 'Total',
        subtotal: 'Sous-total',
        quantity: 'Quantité',
        price: 'Prix',
        name: 'Nom',
      },
      auth: {
        login: 'Connexion',
        logout: 'Déconnexion',
        email: 'Email',
        password: 'Mot de passe',
        loginButton: 'Se connecter',
        loginSuccess: 'Connexion réussie !',
        invalidCredentials: 'Email ou mot de passe incorrect',
      },
      pos: {
        title: 'Point de Vente',
        newSale: 'Nouvelle vente',
        cart: 'Panier',
        emptyCart: 'Panier vide',
        searchProduct: 'Rechercher un produit...',
        scanBarcode: 'Scanner',
        addProduct: 'Ajouter',
        quantity: 'Qté',
        removeItem: 'Supprimer',
        clearCart: 'Vider',
        paymentMethod: 'Mode de paiement',
        cash: 'Espèces',
        mobileMoney: 'Mobile Money',
        completeSale: 'Valider',
        saleCompleted: 'Vente enregistrée !',
        printReceipt: 'Imprimer',
        amountTendered: 'Montant donné',
        change: 'Monnaie',
        discount: 'Remise',
        noCustomer: 'Sans client',
        selectCustomer: 'Client',
      },
      product: {
        title: 'Produits',
        outOfStock: 'Rupture',
        lowStock: 'Stock bas',
        inStock: 'Disponible',
      },
      sale: {
        history: 'Historique',
        today: 'Aujourd\'hui',
        total: 'Total',
      },
      settings: {
        title: 'Paramètres',
        profile: 'Mon profil',
        store: 'Magasin',
        language: 'Langue',
        logout: 'Déconnexion',
      },
      offline: {
        title: 'Mode hors ligne',
        message: 'Vous êtes hors ligne',
      },
      error: {
        networkError: 'Erreur réseau',
        generic: 'Une erreur est survenue',
      },
    },
  },
  en: {
    translation: {
      common: {
        appName: 'SavanaFlow POS',
        loading: 'Loading...',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        search: 'Search',
        confirm: 'Confirm',
        close: 'Close',
        total: 'Total',
        quantity: 'Quantity',
        price: 'Price',
      },
      auth: {
        login: 'Login',
        logout: 'Logout',
        email: 'Email',
        password: 'Password',
        loginButton: 'Sign in',
        loginSuccess: 'Login successful!',
        invalidCredentials: 'Invalid email or password',
      },
      pos: {
        title: 'Point of Sale',
        cart: 'Cart',
        emptyCart: 'Empty cart',
        cash: 'Cash',
        mobileMoney: 'Mobile Money',
        completeSale: 'Complete',
        saleCompleted: 'Sale completed!',
      },
      product: {
        title: 'Products',
        outOfStock: 'Out of stock',
        inStock: 'In stock',
      },
      settings: {
        title: 'Settings',
        logout: 'Logout',
      },
      offline: {
        title: 'Offline mode',
        message: 'You are offline',
      },
    },
  },
  sw: {
    translation: {
      common: {
        appName: 'SavanaFlow POS',
        loading: 'Inapakia...',
        total: 'Jumla',
        price: 'Bei',
      },
      auth: {
        login: 'Ingia',
        logout: 'Toka',
        email: 'Barua pepe',
        password: 'Nenosiri',
      },
      pos: {
        title: 'Pointi ya Mauzo',
        cart: 'Kikapu',
        cash: 'Pesa taslimu',
        mobileMoney: 'Pesa ya mkononi',
      },
      settings: {
        title: 'Mipangilio',
        logout: 'Toka',
      },
    },
  },
  wo: {
    translation: {
      common: {
        appName: 'SavanaFlow POS',
        loading: 'Ni yebu...',
        total: 'Yépp',
        price: 'Nax',
      },
      auth: {
        login: 'Duggu',
        logout: 'Génn',
        email: 'Màkkaanu email',
        password: 'Baatujàll',
      },
      pos: {
        title: 'Kàddu',
        cart: 'Xar',
        cash: 'Seq',
        mobileMoney: 'Seq bu mët',
      },
      settings: {
        title: 'Parãmee',
        logout: 'Génn',
      },
    },
  },
};

const LANGUAGE_KEY = 'user-language';

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources,
    compatibilityJSON: 'v3',
    lng: 'fr',
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export const changeLanguage = async (lang: string): Promise<void> => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
};

export const getCurrentLanguage = (): string => {
  return i18n.language || 'fr';
};

export const supportedLanguages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
  { code: 'wo', name: 'Wolof', flag: '🇸🇳' },
];

export default i18n;
