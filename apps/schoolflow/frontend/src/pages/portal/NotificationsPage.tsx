import { useEffect } from 'react'
import {
  Bell, CheckCheck, Award, Calendar, DollarSign, Mail,
  AlertCircle, Info, CheckCircle, XCircle
} from 'lucide-react'
import { useParentPortalStore } from '../../store/parentPortal'

export default function NotificationsPage() {
  const { notifications, notificationsTotal, notificationsUnread, fetchNotifications, markNotificationRead, markAllNotificationsRead } = useParentPortalStore()

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
    grade: { icon: Award, color: '#059669', bg: '#ecfdf5' },
    attendance: { icon: Calendar, color: '#3b82f6', bg: '#eff6ff' },
    fee: { icon: DollarSign, color: '#f59e0b', bg: '#fffbeb' },
    message: { icon: Mail, color: '#8b5cf6', bg: '#f5f3ff' },
    announcement: { icon: Info, color: '#6b7280', bg: '#f3f4f6' }
  }

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead()
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)' }}>Notifications</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
            {notificationsUnread > 0 ? `${notificationsUnread} notification(s) non lue(s)` : 'Toutes les notifications sont lues'}
          </p>
        </div>
        {notificationsUnread > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              background: 'var(--color-background-primary)',
              border: '1px solid var(--color-border-primary)',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <CheckCheck size={18} />
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <Bell size={48} style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>Aucune notification</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map((notif) => {
            const config = typeConfig[notif.type] || typeConfig.announcement
            const Icon = config.icon
            return (
              <div
                key={notif.id}
                onClick={() => !notif.read && markNotificationRead(notif.id)}
                style={{
                  background: notif.read ? 'var(--color-background-primary)' : '#ecfdf5',
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  gap: 16,
                  cursor: notif.read ? 'default' : 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: config.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={20} style={{ color: config.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{ fontWeight: notif.read ? 500 : 600 }}>{notif.title}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {new Date(notif.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    {notif.content}
                  </p>
                  {notif.student_name && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      Concernant: <span style={{ fontWeight: 500 }}>{notif.student_name}</span>
                    </div>
                  )}
                </div>
                {!notif.read && (
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#059669',
                    flexShrink: 0,
                    marginTop: 6
                  }} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
