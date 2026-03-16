import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { ShoppingCart, Package, BarChart2, Warehouse, LayoutDashboard, Store, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../store/auth'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/pos', icon: ShoppingCart, label: 'Caisse POS' },
  { to: '/products', icon: Package, label: 'Produits' },
  { to: '/stock', icon: Warehouse, label: 'Stock' },
  { to: '/reports', icon: BarChart2, label: 'Rapports' },
  { to: '/stores', icon: Store, label: 'Magasins' },
]

export default function Layout() {
  const [open, setOpen] = useState(true)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-background-tertiary)' }}>
      {/* Sidebar */}
      <aside style={{
        width: open ? 240 : 64, transition: 'width .2s',
        background: 'var(--color-background-primary)',
        borderRight: '0.5px solid var(--color-border-tertiary)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '16px 12px', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {open && (
            <div>
              <div style={{ fontWeight: 500, fontSize: 15, color: 'var(--color-text-primary)' }}>SavanaFlow</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Point de Vente</div>
            </div>
          )}
          <button onClick={() => setOpen(!open)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 4 }}>
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', margin: '2px 8px', borderRadius: 8,
              textDecoration: 'none', fontSize: 13, fontWeight: 400,
              background: isActive ? 'var(--color-background-secondary)' : 'transparent',
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              transition: 'background .15s',
            })}>
              <Icon size={16} />
              {open && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '12px', borderTop: '0.5px solid var(--color-border-tertiary)' }}>
          {open && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>{user?.first_name} {user?.last_name}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          )}
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '8px 10px', borderRadius: 8,
            border: '0.5px solid var(--color-border-secondary)',
            background: 'none', cursor: 'pointer', fontSize: 12,
            color: 'var(--color-text-secondary)',
          }}>
            <LogOut size={14} />
            {open && 'Déconnexion'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <Outlet />
      </main>
    </div>
  )
}
