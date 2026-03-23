import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  FileText, Users, Package, LayoutDashboard, CreditCard, 
  LogOut, Menu, X, Globe, Receipt, TrendingUp, FileSpreadsheet,
  ChevronDown
} from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/auth'
import { changeLanguage, getCurrentLanguage, supportedLanguages } from '../../i18n'

export default function Layout() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)
  const [showLangMenu, setShowLangMenu] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  
  const currentLang = getCurrentLanguage()

  const NAV = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('navigation.dashboard') },
    { to: '/invoices', icon: FileText, label: t('navigation.invoices') },
    { to: '/quotes', icon: Receipt, label: t('navigation.quotes') },
    { to: '/customers', icon: Users, label: t('navigation.customers') },
    { to: '/products', icon: Package, label: t('navigation.products') },
    { to: '/payments', icon: CreditCard, label: t('navigation.payments') },
    { to: '/expenses', icon: FileSpreadsheet, label: t('navigation.expenses') },
    { to: '/reports', icon: TrendingUp, label: t('navigation.reports') },
  ]

  const handleLanguageChange = async (langCode: string) => {
    await changeLanguage(langCode)
    setShowLangMenu(false)
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: open ? 240 : 72 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-xl z-40 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <AnimatePresence mode="wait">
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">{t('common.appName')}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Facturation Pro</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setOpen(!open)} 
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            title={open ? t('common.close') : t('common.open')}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink 
              key={to} 
              to={to} 
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'}
              `}
            >
              <Icon size={20} className="flex-shrink-0" />
              <AnimatePresence mode="wait">
                {open && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </nav>

        {/* Language Switcher */}
        <AnimatePresence>
          {open && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-3 border-t border-gray-200 dark:border-gray-800"
            >
              <div className="relative">
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center gap-2 w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                >
                  <Globe size={16} className="text-gray-500 dark:text-gray-400" />
                  <span className="flex-1 text-left text-gray-700 dark:text-gray-300">
                    {currentLang.flag} {currentLang.nativeName}
                  </span>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${showLangMenu ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {showLangMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden"
                    >
                      {supportedLanguages.map(lang => (
                        <button
                          key={lang.code}
                          onClick={() => handleLanguageChange(lang.code)}
                          className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm transition-colors
                            ${currentLang.code === lang.code 
                              ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                          <span>{lang.flag}</span>
                          <span>{lang.nativeName}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Section */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <AnimatePresence mode="wait">
            {open && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mb-3 px-1"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                      {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user?.first_name} {user?.last_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {user?.role}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => { logout(); navigate('/login') }} 
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut size={18} className="flex-shrink-0" />
            <AnimatePresence mode="wait">
              {open && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  {t('auth.logout')}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main 
        className="flex-1 overflow-auto p-6 transition-all duration-200"
        style={{ marginLeft: open ? 240 : 72 }}
      >
        <Outlet />
      </main>
    </div>
  )
}
