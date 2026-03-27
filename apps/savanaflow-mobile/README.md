# SavanaFlow POS Mobile

Application mobile React Native pour le système de point de vente SavanaFlow.

## 🚀 Fonctionnalités

- **Caisse tactile** - Interface POS intuitive
- **Scanner code-barres** - Via caméra
- **Paiements Mobile Money** - Orange Money, MTN MoMo, Wave
- **Mode hors ligne** - Fonctionne sans connexion
- **Multi-langue** - Français, English, Wolof, Kiswahili
- **Programme fidélité** - Points et récompenses
- **Authentification biométrique** - Face ID / Touch ID

## 📱 Captures d'écran

| POS | Produits | Paiement |
|-----|----------|----------|
| ![POS](./screenshots/pos.png) | ![Products](./screenshots/products.png) | ![Payment](./screenshots/payment.png) |

## 🛠️ Installation

```bash
# Installer les dépendances
npm install

# Démarrer en mode développement
npx expo start

# Démarrer sur Android
npx expo start --android

# Démarrer sur iOS
npx expo start --ios
```

## 📦 Dépendances principales

- **Expo SDK 51** - Framework React Native
- **React Navigation 6** - Navigation
- **React Native Paper 5** - UI Components (Material Design 3)
- **Zustand** - State management
- **i18next** - Internationalisation
- **Expo Camera** - Scanner code-barres
- **Expo SecureStore** - Stockage sécurisé
- **Expo LocalAuthentication** - Biométrie

## 🌍 Langues supportées

| Langue | Code | Pays |
|--------|------|------|
| Français | `fr` | Côte d'Ivoire, Sénégal, UEMOA |
| English | `en` | Nigeria, Ghana, Afrique de l'Est |
| Wolof | `wo` | Sénégal, Gambie, Mauritanie |
| Kiswahili | `sw` | Kenya, Tanzanie, Ouganda |

## 💳 Paiements Mobile Money

| Opérateur | Pays | Devise |
|-----------|------|--------|
| Orange Money | CI, SN, BF, ML | XOF |
| MTN MoMo | CI, GH, UG, RW | XOF, GHS, UGX, RWF |
| Wave | CI, SN | XOF |
| M-Pesa | KE, TZ | KES, TZS |

## 🔧 Configuration

Créer un fichier `.env`:

```env
API_URL=http://localhost:8003/api/v1
DEFAULT_CURRENCY=XOF
DEFAULT_LANGUAGE=fr
```

## 📱 Build & Deploy

```bash
# Configurer EAS
eas login

# Build Android APK
eas build --platform android --profile preview

# Build iOS (requiert compte Apple Developer)
eas build --platform ios --profile preview

# Build production
eas build --platform all --profile production
```

## 🔒 Sécurité

- Tokens stockés dans **Expo SecureStore**
- Authentification biométrique optionnelle
- HTTPS obligatoire en production
- Données locales chiffrées

## 📄 Licence

Propriétaire - SavanaFlow © 2025
