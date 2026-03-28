import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Award, Calendar, Clock,
  DollarSign, Mail, Bell, Settings, LogOut, Menu, X,
  GraduationCap, ChevronDown
} from 'lucide-react'
import { useState } from 'react'
import { useParentPortalStore } from '../../store/parentPortal'

const NAV = [
  { to: '/portal', icon: LayoutDashboard, label: 'Tableau de bord', exact: true },
  { to: '/portal/children', icon: Users, label: 'Mes enfants' },
  { to: '/portal/grades', icon: Award, label: 'Notes' },
  { to: '/portal/attendance', icon: Calendar, label: 'Présences' },
  { to: '/portal/timetable', icon: Clock, label: 'Emploi du temps' },
  { to: '/portal/fees', icon: DollarSign, label: 'Scolarité' },
  { to: '/portal/messages', icon: Mail, label: 'Messages' },
  { to: '/portal/notifications', icon: Bell, label: 'Notifications' },
  { to: '/portal/profile', icon: Settings, label: 'Paramètres' },
]

export default function PortalLayout() {
  const [open, setOpen] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { account, logout, notificationsUnread, messages } = useParentPortalStore()
  const navigate = useNavigate()

  const unreadMessages = messages.filter(m => !m.read).length

  const handleLogout = () => {
    logout()
    navigate('/portal/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-background-tertiary)' }}>
      {/* Sidebar */}
      <aside style={{
        width: open ? 240 : 64,
        transition: 'width .2s',
        background: 'linear-gradient(180deg, #064e3b 0%, #065f46 100%)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        color: 'white'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {open && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <GraduationCap size={24} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Portail Parents</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>SchoolFlow</div>
              </div>
            </div>
          )}
          <button
            onClick={() => setOpen(!open)}
            style={{
              border: 'none',
              background: 'rgba(255,255,255,0.1)',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              color: 'white'
            }}
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {NAV.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                margin: '2px 8px',
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 13,
                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: 'white',
                position: 'relative'
              })}
            >
              <Icon size={18} />
              {open && <span>{label}</span>}
              {/* Badge for unread */}
              {!open && label === 'Messages' && unreadMessages > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: '#ef4444',
                  borderRadius: '50%',
                  width: 8,
                  height: 8
                }} />
              )}
              {!open && label === 'Notifications' && notificationsUnread > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: '#ef4444',
                  borderRadius: '50%',
                  width: 8,
                  height: 8
                }} />
              )}
              {open && label === 'Messages' && unreadMessages > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: '#ef4444',
                  borderRadius: 12,
                  padding: '2px 6px',
                  fontSize: 11,
                  fontWeight: 600
                }}>
                  {unreadMessages}
                </span>
              )}
              {open && label === 'Notifications' && notificationsUnread > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: '#ef4444',
                  borderRadius: 12,
                  padding: '2px 6px',
                  fontSize: 11,
                  fontWeight: 600
                }}>
                  {notificationsUnread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {open && account && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{account.parent.full_name}</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>{account.email}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              color: 'white'
            }}
          >
            <LogOut size={14} />
            {open && 'Déconnexion'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <Outlet />
      </main>
    </div>
  )
}
