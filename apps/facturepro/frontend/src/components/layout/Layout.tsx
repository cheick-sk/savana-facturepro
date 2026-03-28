import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  CreditCard,
  LogOut,
  Menu,
  X,
  Settings,
  Bell,
  Search,
  ChevronDown,
  Building2,
  Receipt,
  TrendingUp,
  HelpCircle,
  ShoppingBag,
  Truck,
  BookOpen,
  ClipboardList,
  Calendar,
  PieChart,
  Webhook
} from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../store/auth'

const NAV_ITEMS = [
  {
    section: 'Principal',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
      { to: '/invoices', icon: FileText, label: 'Factures' },
      { to: '/quotes', icon: Receipt, label: 'Devis' },
      { to: '/customers', icon: Users, label: 'Clients' },
    ]
  },
  {
    section: 'Gestion',
    items: [
      { to: '/products', icon: Package, label: 'Produits/Services' },
      { to: '/payments', icon: CreditCard, label: 'Paiements' },
      { to: '/expenses', icon: TrendingUp, label: 'Dépenses' },
      { to: '/reports', icon: Building2, label: 'Rapports' },
    ]
  },
  {
    section: 'Achats',
    items: [
      { to: '/purchase-orders', icon: ShoppingBag, label: 'Commandes fournisseur' },
      { to: '/supplier-invoices', icon: Truck, label: 'Factures fournisseurs' },
    ]
  },
  {
    section: 'Comptabilité',
    items: [
      { to: '/accounting/chart', icon: BookOpen, label: 'Plan comptable' },
      { to: '/accounting/entries', icon: ClipboardList, label: 'Écritures' },
      { to: '/accounting/fiscal-years', icon: Calendar, label: 'Exercices' },
      { to: '/accounting/reports', icon: PieChart, label: 'États financiers' },
    ]
  },
  {
    section: 'Paramètres',
    items: [
      { to: '/webhooks', icon: Webhook, label: 'Webhooks' },
    ]
  }
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-secondary)'
    }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 260 : 80,
        minWidth: sidebarOpen ? 260 : 80,
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 50,
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)'
      }}>
        {/* Logo */}
        <div style={{
          padding: sidebarOpen ? '20px 24px' : '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarOpen ? 'space-between' : 'center',
          gap: 12
        }}>
          {sidebarOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
              }}>
                <Receipt size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.3px' }}>FacturePro</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Africa</div>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 8,
              padding: 8,
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)',
              transition: 'all 0.2s'
            }}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          {NAV_ITEMS.map((section, idx) => (
            <div key={idx} style={{ marginBottom: 24 }}>
              {sidebarOpen && (
                <div style={{
                  padding: '0 24px',
                  marginBottom: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'rgba(255,255,255,0.4)'
                }}>
                  {section.section}
                </div>
              )}
              {section.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: sidebarOpen ? '12px 24px' : '12px 20px',
                    justifyContent: sidebarOpen ? 'flex-start' : 'center',
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                    background: isActive ? 'linear-gradient(90deg, rgba(59,130,246,0.2) 0%, transparent 100%)' : 'transparent',
                    borderRight: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: isActive ? 500 : 400,
                    transition: 'all 0.2s'
                  })}
                >
                  <Icon size={20} />
                  {sidebarOpen && <span>{label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div style={{
          padding: sidebarOpen ? '16px 20px' : '16px 12px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.2)'
        }}>
          {sidebarOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 16
              }}>
                {user?.first_name?.[0] || 'A'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14, truncate: 'ellipsis', overflow: 'hidden' }}>
                  {user?.first_name} {user?.last_name}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  {user?.role === 'admin' ? 'Administrateur' : user?.role}
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: 8,
                  padding: 8,
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.6)'
                }}
                title="Déconnexion"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 16
              }}>
                {user?.first_name?.[0] || 'A'}
              </div>
              <button
                onClick={handleLogout}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: 8,
                  padding: 8,
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.6)'
                }}
                title="Déconnexion"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: sidebarOpen ? 260 : 80,
        transition: 'margin-left 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh'
      }}>
        {/* Top Header */}
        <header style={{
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-light)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}>
          <div>
            <h1 style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0
            }}>
              {NAV_ITEMS.flatMap(s => s.items).find(i => i.to === location.pathname)?.label || 'Tableau de bord'}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Search */}
            <div style={{
              position: 'relative',
              marginRight: 8
            }}>
              <Search size={16} style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)'
              }} />
              <input
                type="text"
                placeholder="Rechercher..."
                style={{
                  width: 240,
                  padding: '8px 12px 8px 38px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 8,
                  fontSize: 13
                }}
              />
            </div>

            {/* Notifications */}
            <button style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              borderRadius: 8,
              padding: 8,
              cursor: 'pointer',
              position: 'relative'
            }}>
              <Bell size={18} color="var(--text-secondary)" />
              <span style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 8,
                height: 8,
                background: 'var(--danger-500)',
                borderRadius: '50%'
              }} />
            </button>

            {/* Help */}
            <button style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              borderRadius: 8,
              padding: 8,
              cursor: 'pointer'
            }}>
              <HelpCircle size={18} color="var(--text-secondary)" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div style={{
          flex: 1,
          padding: '24px',
          animation: 'fadeIn 0.3s ease'
        }}>
          <Outlet />
        </div>

        {/* Footer */}
        <footer style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-light)',
          background: 'var(--bg-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'var(--text-tertiary)'
        }}>
          <div>© 2024 FacturePro Africa. Tous droits réservés.</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="#" style={{ color: 'var(--text-tertiary)' }}>Confidentialité</a>
            <a href="#" style={{ color: 'var(--text-tertiary)' }}>Conditions</a>
            <a href="#" style={{ color: 'var(--text-tertiary)' }}>Aide</a>
          </div>
        </footer>
      </main>
    </div>
  )
}
