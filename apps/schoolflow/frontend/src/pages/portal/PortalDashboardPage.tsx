import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Award, Calendar, DollarSign, Mail, Bell,
  TrendingUp, Clock, AlertCircle, ChevronRight, GraduationCap
} from 'lucide-react'
import { useParentPortalStore } from '../../store/parentPortal'

export default function PortalDashboardPage() {
  const { dashboard, fetchDashboard, loading, account } = useParentPortalStore()

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  if (loading && !dashboard) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--color-border-primary)', borderTopColor: '#059669', borderRadius: '50%', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>Chargement...</p>
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <AlertCircle size={48} style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }} />
        <p style={{ color: 'var(--color-text-secondary)' }}>Impossible de charger le tableau de bord</p>
        <button
          onClick={() => fetchDashboard()}
          style={{
            marginTop: 16,
            padding: '10px 20px',
            background: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer'
          }}
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)' }}>
          Bonjour, {dashboard.parent.first_name} 👋
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Bienvenue sur votre espace parent
        </p>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard
          icon={Users}
          label="Enfants"
          value={dashboard.children_count}
          color="#059669"
        />
        <StatCard
          icon={Mail}
          label="Messages non lus"
          value={dashboard.unread_messages}
          color="#3b82f6"
        />
        <StatCard
          icon={Bell}
          label="Notifications"
          value={dashboard.unread_notifications}
          color="#f59e0b"
        />
        <StatCard
          icon={DollarSign}
          label="Frais en attente"
          value={`${dashboard.pending_fees_total.toLocaleString()} FCFA`}
          color="#ef4444"
        />
      </div>

      {/* Children cards */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)' }}>Mes enfants</h2>
          <Link to="/portal/children" style={{ color: '#059669', fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            Voir tout <ChevronRight size={16} />
          </Link>
        </div>

        {dashboard.children.length === 0 ? (
          <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 32, textAlign: 'center' }}>
            <Users size={48} style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }} />
            <p style={{ color: 'var(--color-text-secondary)' }}>Aucun enfant associé à votre compte</p>
            <Link to="/portal/children" style={{ color: '#059669', fontSize: 14, textDecoration: 'none' }}>
              Ajouter un enfant
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {dashboard.children.map((child) => (
              <ChildCard key={child.id} child={child} />
            ))}
          </div>
        )}
      </div>

      {/* Two column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        {/* Recent grades */}
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>Notes récentes</h3>
            <Link to="/portal/grades" style={{ color: '#059669', fontSize: 13, textDecoration: 'none' }}>
              Voir tout
            </Link>
          </div>

          {dashboard.recent_grades.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 24 }}>
              Aucune note récente
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dashboard.recent_grades.slice(0, 5).map((grade) => (
                <div
                  key={grade.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 12,
                    background: 'var(--color-background-secondary)',
                    borderRadius: 8
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{grade.subject_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{grade.term_name}</div>
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: grade.score >= 10 ? '#ecfdf5' : '#fef2f2',
                    color: grade.score >= 10 ? '#059669' : '#dc2626',
                    fontWeight: 600,
                    fontSize: 14
                  }}>
                    {grade.score}/{grade.max_score}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent notifications */}
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>Notifications récentes</h3>
            <Link to="/portal/notifications" style={{ color: '#059669', fontSize: 13, textDecoration: 'none' }}>
              Voir tout
            </Link>
          </div>

          {dashboard.recent_notifications.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 24 }}>
              Aucune notification récente
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dashboard.recent_notifications.slice(0, 5).map((notif) => (
                <div
                  key={notif.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: 12,
                    background: notif.read ? 'var(--color-background-secondary)' : '#ecfdf5',
                    borderRadius: 8
                  }}
                >
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: notif.read ? 'var(--color-border-primary)' : '#059669',
                    marginTop: 6,
                    flexShrink: 0
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{notif.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      {notif.content.substring(0, 80)}...
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming payments */}
      {dashboard.upcoming_payments.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)' }}>Paiements à venir</h2>
            <Link to="/portal/fees" style={{ color: '#059669', fontSize: 14, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Voir tout <ChevronRight size={16} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dashboard.upcoming_payments.slice(0, 3).map((fee) => (
              <div
                key={fee.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  background: 'var(--color-background-primary)',
                  borderRadius: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ padding: 10, background: '#fef2f2', borderRadius: 10 }}>
                    <DollarSign size={20} style={{ color: '#dc2626' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{fee.description}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{fee.student_name}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: '#dc2626' }}>{fee.amount_remaining.toLocaleString()} FCFA</div>
                  {fee.due_date && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      Échéance: {new Date(fee.due_date).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Stat card component
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  return (
    <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ padding: 10, background: `${color}15`, borderRadius: 10 }}>
          <Icon size={20} style={{ color }} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)' }}>{value}</div>
        </div>
      </div>
    </div>
  )
}

// Child card component
function ChildCard({ child }: { child: any }) {
  return (
    <Link
      to={`/portal/children/${child.id}`}
      style={{
        display: 'block',
        background: 'var(--color-background-primary)',
        borderRadius: 12,
        padding: 20,
        textDecoration: 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #059669, #10b981)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 600,
          fontSize: 18
        }}>
          {child.first_name[0]}{child.last_name[0]}
        </div>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{child.full_name}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {child.class_name || 'Non assigné'} • {child.class_level || '-'}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Moyenne</div>
          <div style={{ fontWeight: 600, color: child.average_grade && child.average_grade >= 10 ? '#059669' : '#dc2626' }}>
            {child.average_grade ? child.average_grade.toFixed(2) : '-'}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Présence</div>
          <div style={{ fontWeight: 600, color: child.attendance_rate && child.attendance_rate >= 90 ? '#059669' : '#f59e0b' }}>
            {child.attendance_rate ? `${child.attendance_rate.toFixed(0)}%` : '-'}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Frais</div>
          <div style={{ fontWeight: 600, color: child.pending_fees > 0 ? '#dc2626' : '#059669' }}>
            {child.pending_fees > 0 ? `${(child.pending_fees / 1000).toFixed(0)}k` : 'OK'}
          </div>
        </div>
      </div>
    </Link>
  )
}
