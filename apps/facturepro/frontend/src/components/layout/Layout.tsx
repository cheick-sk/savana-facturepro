import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { FileText, Users, Package, LayoutDashboard, CreditCard, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../store/auth'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/invoices', icon: FileText, label: 'Factures' },
  { to: '/customers', icon: Users, label: 'Clients' },
  { to: '/products', icon: Package, label: 'Produits/Services' },
  { to: '/payments', icon: CreditCard, label: 'Paiements' },
]

export default function Layout() {
  const [open, setOpen] = useState(true)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-background-tertiary)' }}>
      <aside style={{ width: open ? 240 : 64, transition: 'width .2s', background: 'var(--color-background-primary)', borderRight: '0.5px solid var(--color-border-tertiary)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 12px', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {open && <div><div style={{ fontWeight: 500, fontSize: 15 }}>FacturePro Africa</div><div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Facturation</div></div>}
          <button onClick={() => setOpen(!open)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}>{open ? <X size={16} /> : <Menu size={16} />}</button>
        </div>
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', margin: '2px 8px', borderRadius: 8, textDecoration: 'none', fontSize: 13, background: isActive ? 'var(--color-background-secondary)' : 'transparent', color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' })}>
              <Icon size={16} />{open && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '12px', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          {open && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 13, fontWeight: 500 }}>{user?.first_name} {user?.last_name}</div><div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{user?.role}</div></div>}
          <button onClick={() => { logout(); navigate('/login') }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8, border: '0.5px solid var(--color-border-secondary)', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--color-text-secondary)' }}>
            <LogOut size={14} />{open && 'Déconnexion'}
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}><Outlet /></main>
    </div>
  )
}
