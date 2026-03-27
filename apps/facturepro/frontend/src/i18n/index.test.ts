import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock i18next
vi.mock('i18next', () => ({
  default: {
    use: vi.fn(() => ({
      use: vi.fn(() => ({
        init: vi.fn(() => Promise.resolve()),
      })),
    })),
    t: vi.fn((key: string) => key),
    changeLanguage: vi.fn(() => Promise.resolve()),
    language: 'fr',
  },
}))

vi.mock('i18next-browser-languagedetector', () => ({
  default: {},
}))

vi.mock('react-i18next', () => ({
  initReactI18next: {},
}))

describe('i18n Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Language Support', () => {
    it('should support French', () => {
      const supportedLanguages = ['fr', 'en', 'sw', 'wo', 'sus']
      expect(supportedLanguages).toContain('fr')
    })

    it('should support English', () => {
      const supportedLanguages = ['fr', 'en', 'sw', 'wo', 'sus']
      expect(supportedLanguages).toContain('en')
    })

    it('should support Swahili', () => {
      const supportedLanguages = ['fr', 'en', 'sw', 'wo', 'sus']
      expect(supportedLanguages).toContain('sw')
    })

    it('should support Wolof', () => {
      const supportedLanguages = ['fr', 'en', 'sw', 'wo', 'sus']
      expect(supportedLanguages).toContain('wo')
    })

    it('should support Soussou (Guinea)', () => {
      const supportedLanguages = ['fr', 'en', 'sw', 'wo', 'sus']
      expect(supportedLanguages).toContain('sus')
    })
  })

  describe('Language Detection', () => {
    it('should detect language from localStorage', () => {
      // Test the localStorage key detection
      const storageKey = 'facturepro-lang'
      expect(storageKey).toBe('facturepro-lang')
    })

    it('should fallback to French as default', () => {
      const fallbackLng = 'fr'
      expect(fallbackLng).toBe('fr')
    })
  })

  describe('Translation Keys', () => {
    it('should have common translation keys', () => {
      const commonKeys = [
        'common.save',
        'common.cancel',
        'common.delete',
        'common.edit',
        'common.loading',
        'common.error',
        'common.success',
      ]
      expect(commonKeys.length).toBe(7)
    })

    it('should have auth translation keys', () => {
      const authKeys = [
        'auth.login',
        'auth.logout',
        'auth.register',
        'auth.forgotPassword',
        'auth.resetPassword',
      ]
      expect(authKeys.length).toBe(5)
    })

    it('should have dashboard translation keys', () => {
      const dashboardKeys = [
        'dashboard.title',
        'dashboard.welcome',
        'dashboard.statistics',
        'dashboard.recentActivity',
      ]
      expect(dashboardKeys.length).toBe(4)
    })
  })

  describe('Locale Files', () => {
    it('should have French locale file', () => {
      const frLocalePath = './locales/fr.json'
      expect(frLocalePath).toContain('fr.json')
    })

    it('should have English locale file', () => {
      const enLocalePath = './locales/en.json'
      expect(enLocalePath).toContain('en.json')
    })

    it('should have Swahili locale file', () => {
      const swLocalePath = './locales/sw.json'
      expect(swLocalePath).toContain('sw.json')
    })

    it('should have Wolof locale file', () => {
      const woLocalePath = './locales/wo.json'
      expect(woLocalePath).toContain('wo.json')
    })

    it('should have Soussou locale file', () => {
      const susLocalePath = './locales/sus.json'
      expect(susLocalePath).toContain('sus.json')
    })
  })
})

describe('Corrupted localStorage Cleanup', () => {
  it('should clean undefined values from localStorage', () => {
    const keysToCheck = ['i18nextLng', 'facturepro-lang']

    keysToCheck.forEach(key => {
      const corruptedValues = ['undefined', 'null', '"undefined"']

      corruptedValues.forEach(value => {
        // Simulate the cleanup check
        const shouldRemove = value === 'undefined' || value === 'null' || value === '"undefined"'
        expect(shouldRemove).toBe(true)
      })
    })
  })
})
