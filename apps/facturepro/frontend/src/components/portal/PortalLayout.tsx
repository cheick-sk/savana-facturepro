import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FileText, FileCheck, CreditCard, User, LogOut, Menu, X
} from 'lucide-react'

interface PortalLayoutProps {
  children: React.ReactNode
  clientName: string
  onLogout: () => void
}

export default function PortalLayout({ children, clientName, onLogout }: PortalLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = [
    { path: '/portal', icon: LayoutDashboard, label: 'Tableau de bord' },
    { path: '/portal/invoices', icon: FileText, label: 'Factures' },
    { path: '/portal/quotes', icon: FileCheck, label: 'Devis' },
    { path: '/portal/payments', icon: CreditCard, label: 'Paiements' },
    { path: '/portal/profile', icon: User, label: 'Mon profil' },
  ]

  const isActive = (path: string) => {
    if (path === '/portal') {
      return location.pathname === '/portal'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f9fafb',
    }}>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'fixed',
          top: '16px',
          left: '16px',
          zIndex: 50,
          padding: '10px',
          borderRadius: '8px',
          border: 'none',
          background: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          display: 'none', // Hidden on desktop
        }}
        className="mobile-menu-btn"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside style={{
        width: '260px',
        background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        zIndex: 40,
        transition: 'transform 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <h1 style={{
            fontSize: '20px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #a78bfa 0%, #c4b5fd 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Portail Client
          </h1>
          <p style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.6)',
            marginTop: '4px',
          }}>
            {clientName}
          </p>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path)
                setSidebarOpen(false)
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '10px',
                border: 'none',
                background: isActive(item.path)
                  ? 'rgba(255,255,255,0.15)'
                  : 'transparent',
                color: isActive(item.path) ? 'white' : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                marginBottom: '4px',
                textAlign: 'left',
              }}
            >
              <item.icon size={20} />
              <span style={{ fontWeight: isActive(item.path) ? 600 : 400 }}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={onLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#fca5a5',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px',
          textAlign: 'center',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.4)',
        }}>
          Propulsé par FacturePro Africa
        </div>
      </aside>

      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: '260px',
        minHeight: '100vh',
      }}>
        {children}
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 30,
          }}
        />
      )}

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: block !important;
          }
          aside {
            transform: translateX(-100%);
          }
          aside.open {
            transform: translateX(0);
          }
          main {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  )
}
