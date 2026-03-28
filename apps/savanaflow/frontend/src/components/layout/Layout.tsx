import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { 
  ShoppingCart, Package, BarChart2, Warehouse, LayoutDashboard, Store, LogOut, 
  Menu, X, ChevronLeft, ChevronRight, Bell, Settings, Search, 
  TrendingUp, Users, HelpCircle, Moon, Sun, Gift, UserCog, Clock, DollarSign,
  Globe, Truck, Tag
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../../store/auth'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', section: 'main' },
  { to: '/pos', icon: ShoppingCart, label: 'Point de Vente', section: 'main' },
  { to: '/products', icon: Package, label: 'Produits', section: 'inventory' },
  { to: '/stock', icon: Warehouse, label: 'Stock', section: 'inventory' },
  { to: '/stores', icon: Store, label: 'Magasins', section: 'inventory' },
  { to: '/ecommerce', icon: Globe, label: 'E-commerce', section: 'ecommerce' },
  { to: '/ecommerce/products', icon: Package, label: 'Produits en ligne', section: 'ecommerce' },
  { to: '/ecommerce/orders', icon: ShoppingCart, label: 'Commandes', section: 'ecommerce' },
  { to: '/ecommerce/delivery', icon: Truck, label: 'Livraison', section: 'ecommerce' },
  { to: '/ecommerce/coupons', icon: Tag, label: 'Promotions', section: 'ecommerce' },
  { to: '/employees', icon: UserCog, label: 'Employés', section: 'hr' },
  { to: '/shifts', icon: Clock, label: 'Shifts', section: 'hr' },
  { to: '/commissions', icon: DollarSign, label: 'Commissions', section: 'hr' },
  { to: '/loyalty', icon: Gift, label: 'Fidélité', section: 'customers' },
  { to: '/reports', icon: BarChart2, label: 'Rapports', section: 'analytics' },
]

const SECTIONS = {
  main: { label: 'Principal', collapsed: false },
  inventory: { label: 'Gestion', collapsed: false },
  ecommerce: { label: 'E-commerce', collapsed: false },
  hr: { label: 'Ressources Humaines', collapsed: false },
  customers: { label: 'Clients', collapsed: false },
  analytics: { label: 'Analyse', collapsed: false },
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [sectionsState, setSectionsState] = useState(SECTIONS)
  const [darkMode, setDarkMode] = useState(false)
  
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => { logout(); navigate('/login') }
  
  const isCollapsed = !sidebarOpen && !sidebarHovered

  // Toggle section collapse
  const toggleSection = (sectionKey: string) => {
    setSectionsState(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey as keyof typeof prev], collapsed: !prev[sectionKey as keyof typeof prev].collapsed }
    }))
  }

  // Group nav items by section
  const navBySection = NAV_ITEMS.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = []
    acc[item.section].push(item)
    return acc
  }, {} as Record<string, typeof NAV_ITEMS>)

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchOpen])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      // Escape to close modals
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex min-h-screen bg-[var(--bg-tertiary)]">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fadeIn"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:sticky top-0 left-0 z-50 lg:z-auto
          h-screen flex flex-col
          bg-[var(--bg-primary)] border-r border-[var(--border-light)]
          transition-all duration-300 ease-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'w-[72px]' : 'w-[260px]'}
        `}
        onMouseEnter={() => !sidebarOpen && setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        {/* Logo section */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            {(!isCollapsed) && (
              <div className="animate-fadeIn">
                <div className="font-semibold text-[var(--text-primary)] text-sm">SavanaFlow</div>
                <div className="text-xs text-[var(--text-tertiary)]">Point de Vente</div>
              </div>
            )}
          </div>
          
          {/* Collapse button - desktop only */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all"
            title={sidebarOpen ? 'Réduire' : 'Étendre'}
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
          
          {/* Close button - mobile only */}
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-md hover:bg-[var(--bg-secondary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {Object.entries(navBySection).map(([sectionKey, items]) => (
            <div key={sectionKey} className="mb-2">
              {(!isCollapsed) && (
                <button
                  onClick={() => toggleSection(sectionKey)}
                  className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider hover:text-[var(--text-secondary)] transition-colors"
                >
                  <span>{SECTIONS[sectionKey as keyof typeof SECTIONS].label}</span>
                  <ChevronLeft 
                    size={12} 
                    className={`transition-transform duration-200 ${sectionsState[sectionKey as keyof typeof SECTIONS].collapsed ? '-rotate-90' : ''}`}
                  />
                </button>
              )}
              
              <div className={`space-y-0.5 overflow-hidden transition-all duration-200 ${sectionsState[sectionKey as keyof typeof SECTIONS].collapsed && !isCollapsed ? 'h-0' : ''}`}>
                {items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => `
                      nav-item group relative
                      ${isActive ? 'active' : ''}
                    `}
                    title={isCollapsed ? label : undefined}
                  >
                    <Icon size={20} className="nav-item-icon flex-shrink-0" />
                    {(!isCollapsed) && (
                      <span className="truncate text-sm">{label}</span>
                    )}
                    
                    {/* Active indicator for collapsed state */}
                    {isCollapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-r-full opacity-0 transition-opacity nav-item.active &:opacity-100" />
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-[var(--border-light)] p-3">
          {/* Help & Settings */}
          <div className="space-y-0.5">
            <NavLink to="/help" className="nav-item">
              <HelpCircle size={20} className="nav-item-icon" />
              {(!isCollapsed) && <span className="text-sm">Aide</span>}
            </NavLink>
            <NavLink to="/settings" className="nav-item">
              <Settings size={20} className="nav-item-icon" />
              {(!isCollapsed) && <span className="text-sm">Paramètres</span>}
            </NavLink>
          </div>

          {/* User profile */}
          <div className="mt-3 pt-3 border-t border-[var(--border-light)]">
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="avatar avatar-md flex-shrink-0">
                {user?.first_name?.[0] || 'U'}
              </div>
              {(!isCollapsed) && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {user?.first_name} {user?.last_name}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)] capitalize truncate">
                    {user?.role || 'Utilisateur'}
                  </div>
                </div>
              )}
              {(!isCollapsed) && (
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-[var(--danger-50)] text-[var(--text-tertiary)] hover:text-[var(--danger-600)] transition-all"
                  title="Déconnexion"
                >
                  <LogOut size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-light)]">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            {/* Left side */}
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--bg-secondary)]"
              >
                <Menu size={20} />
              </button>
              
              {/* Search button */}
              <button 
                onClick={() => setSearchOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-tertiary)] bg-[var(--bg-secondary)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                <Search size={16} />
                <span>Rechercher...</span>
                <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-xs bg-[var(--bg-primary)] rounded border border-[var(--border-light)]">
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Quick stats - desktop only */}
              <div className="hidden lg:flex items-center gap-4 mr-4 text-sm">
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <TrendingUp size={16} className="text-emerald-500" />
                  <span className="font-medium text-[var(--text-primary)]">+12.5%</span>
                  <span className="text-xs">vs hier</span>
                </div>
              </div>

              {/* Dark mode toggle */}
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Notifications */}
              <div ref={notificationRef} className="relative">
                <button 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-colors"
                >
                  <Bell size={18} />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                </button>
                
                {/* Notifications dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-primary)] rounded-xl shadow-xl border border-[var(--border-light)] animate-slideDown overflow-hidden">
                    <div className="px-4 py-3 border-b border-[var(--border-light)] flex items-center justify-between">
                      <h3 className="font-semibold text-sm">Notifications</h3>
                      <span className="badge badge-primary">3 nouvelles</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {[
                        { title: 'Nouvelle vente', desc: 'Vente #1234 - 250,000 GNF', time: 'Il y a 5 min', type: 'success' },
                        { title: 'Stock faible', desc: 'Produit X - 5 unités restantes', time: 'Il y a 1h', type: 'warning' },
                        { title: 'Rapport disponible', desc: 'Rapport mensuel prêt', time: 'Il y a 2h', type: 'info' },
                      ].map((notif, i) => (
                        <div key={i} className="px-4 py-3 hover:bg-[var(--bg-secondary)] cursor-pointer border-b border-[var(--border-light)] last:border-0">
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 mt-2 rounded-full ${
                              notif.type === 'success' ? 'bg-emerald-500' : 
                              notif.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-[var(--text-primary)]">{notif.title}</div>
                              <div className="text-xs text-[var(--text-secondary)] truncate">{notif.desc}</div>
                              <div className="text-xs text-[var(--text-tertiary)] mt-1">{notif.time}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-3 border-t border-[var(--border-light)] bg-[var(--bg-secondary)]">
                      <button className="w-full text-sm text-center text-[var(--primary-600)] hover:text-[var(--primary-700)] font-medium">
                        Voir toutes les notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div ref={userMenuRef} className="relative">
                <button 
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  <div className="avatar avatar-sm">
                    {user?.first_name?.[0] || 'U'}
                  </div>
                  <ChevronRight size={14} className={`text-[var(--text-tertiary)] transition-transform ${userMenuOpen ? 'rotate-90' : ''}`} />
                </button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-primary)] rounded-xl shadow-xl border border-[var(--border-light)] animate-slideDown overflow-hidden">
                    <div className="px-4 py-3 border-b border-[var(--border-light)]">
                      <div className="font-medium text-sm text-[var(--text-primary)]">
                        {user?.first_name} {user?.last_name}
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)]">{user?.email}</div>
                    </div>
                    <div className="py-1">
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-secondary)] flex items-center gap-3">
                        <Users size={16} className="text-[var(--text-tertiary)]" />
                        Mon profil
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-secondary)] flex items-center gap-3">
                        <Settings size={16} className="text-[var(--text-tertiary)]" />
                        Paramètres
                      </button>
                    </div>
                    <div className="py-1 border-t border-[var(--border-light)]">
                      <button 
                        onClick={handleLogout}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-[var(--danger-50)] text-[var(--danger-600)] flex items-center gap-3"
                      >
                        <LogOut size={16} />
                        Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="py-3 px-4 lg:px-6 border-t border-[var(--border-light)] bg-[var(--bg-primary)] text-center text-xs text-[var(--text-tertiary)]">
          © 2024 SavanaFlow. Tous droits réservés.
        </footer>
      </div>

      {/* Search modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 animate-fadeIn" onClick={() => setSearchOpen(false)}>
          <div 
            className="w-full max-w-lg bg-[var(--bg-primary)] rounded-xl shadow-2xl animate-slideDown overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 border-b border-[var(--border-light)]">
              <Search size={18} className="text-[var(--text-tertiary)]" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Rechercher des produits, ventes, clients..."
                className="flex-1 py-4 border-none outline-none text-sm bg-transparent"
              />
              <kbd className="px-1.5 py-0.5 text-xs bg-[var(--bg-secondary)] rounded border border-[var(--border-light)]">ESC</kbd>
            </div>
            <div className="p-4">
              <div className="text-xs text-[var(--text-tertiary)] mb-2">Suggestions</div>
              <div className="space-y-1">
                {['Produits populaires', 'Dernières ventes', 'Rapports du jour'].map((suggestion, i) => (
                  <button key={i} className="w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-[var(--bg-secondary)] flex items-center gap-2">
                    <Search size={14} className="text-[var(--text-tertiary)]" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
