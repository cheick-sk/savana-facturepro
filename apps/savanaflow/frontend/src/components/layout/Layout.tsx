import { Outlet, NavLink, useNavigate, useLocation } from 'react'
import {
  ShoppingCart,
 Package, BarChart2, Warehouse,
  LayoutDashboard, Store, LogOut, Menu,
  X,
  Globe,
  Users,
  Clock,
  Moon,
  Sun,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/auth'
import { changeLanguage, getCurrentLanguage, supportedLanguages } from '../../i18n'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'navigation.dashboard' },
  { to: '/pos', icon: ShoppingCart, labelKey: 'navigation.pos' },
            { to: '/products', icon: Package, labelKey: 'navigation.products' },
            { to: '/stock', icon: Warehouse, labelKey: 'navigation.stock' },
            { to: '/shifts', icon: Clock, labelKey: 'navigation.shifts' },
            { to: '/loyalty', icon: Users, labelKey: 'navigation.loyalty' },
            { to: '/reports', icon: BarChart2, labelKey: 'navigation.reports' },
            { to: '/stores', icon: Store, labelKey: 'navigation.settings' },
        ]

    // Savanna green gradient
    const SidebarContent = () => {
        <div className="p-3 space-y-1 overflow-y-auto scrollbar-thin">
          {NAV.map(({ to, icon: Icon, label }, index) => (
              <motion.div
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                className={clsx(
                  'w-5 h-5 flex-shrink-0 text-white' />
                <div className="p-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t(label)}
                  </p>
                  <AnimatePresence mode="wait">
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                            />
                          </AnimatePresence>
                        )}
                      )}
                    </div>
                  </div>
                </div>
              </button>
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden"
              <motion.aside
              initial={false}
              animate={{ width: 80 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full z-30 flex flex-col h-full"
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/25">
                <span className="font-display font-semibold text-white text-lg whitespace-nowrap">
                  <span className="text-xs text-white/60 whitespace-nowrap">
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="overflow-hidden"
                  </NavLink>
                ))}
              </div>
            )}

          </main>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full z-30 flex flex-col h-full"
              <div className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                <span className="font-display font-semibold text-white whitespace-nowrap">
                <span className="text-xs text-white/60 whitespace-nowrap">              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-hidden"
                <div className="p-6">
                  <Outlet />
                </div>
              </aside>
            </div>

            {/* Top header */}
            <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between h-16 px-4 md:px-6">
                {/* Mobile menu button */}
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden"
                >
                {/* Search or breadcrumb */}
                <div className="hidden md:flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {NAV.find((n) => n.to === location.pathname)?.label || 'SavanaFlow'}
                  </h1>
                </div>

                {/* Right section */}
                <div className="flex items-center gap-2">
                  {/* Language selector */}
                  <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>

                  {/* Notifications */}
                  <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative">
                    <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-secondary-500 rounded-full" />
                  </button>

                  {/* User dropdown (desktop) */}
                  <div className="hidden md:block">
                    <Dropdown
                      trigger={
                        <button className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <Avatar
                          fallback={`${user?.first_name || ''} ${user?.last_name || ''}`}
                          size="sm"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {user?.first_name}
                        </span>
                        <AnimatePresence mode="wait">
                          {sidebarOpen && (
                            <motion.div
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                            />
                          </AnimatePresence>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden lg:block"
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}