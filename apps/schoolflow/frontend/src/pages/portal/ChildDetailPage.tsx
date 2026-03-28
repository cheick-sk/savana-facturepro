import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ChevronLeft, Award, Calendar, Clock, DollarSign,
  TrendingUp, TrendingDown, Minus, Mail, Phone
} from 'lucide-react'
import { useParentPortalStore } from '../../store/parentPortal'

export default function ChildDetailPage() {
  const { id } = useParams()
  const { selectedChild, fetchChildDetail, fetchGrades, fetchAttendanceStats, fetchFees, grades, attendanceStats, feeInvoices } = useParentPortalStore()
  const [activeTab, setActiveTab] = useState<'overview' | 'grades' | 'attendance' | 'fees'>('overview')

  const studentId = parseInt(id || '0')

  useEffect(() => {
    if (studentId) {
      fetchChildDetail(studentId)
      fetchGrades(studentId)
      fetchAttendanceStats(studentId)
      fetchFees(studentId)
    }
  }, [studentId, fetchChildDetail, fetchGrades, fetchAttendanceStats, fetchFees])

  if (!selectedChild) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Chargement...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Back button */}
      <Link
        to="/portal/children"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--color-text-secondary)',
          textDecoration: 'none',
          marginBottom: 16
        }}
      >
        <ChevronLeft size={20} />
        Retour aux enfants
      </Link>

      {/* Header */}
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #059669, #10b981)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 600,
            fontSize: 28
          }}>
            {selectedChild.first_name[0]}{selectedChild.last_name[0]}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>{selectedChild.full_name}</h1>
            <div style={{ color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              N° {selectedChild.student_number} • {selectedChild.class_name || 'Non assigné'}
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {selectedChild.class_level}
              </span>
              {selectedChild.gender && (
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {selectedChild.gender === 'M' ? 'Garçon' : 'Fille'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 24 }}>
          <StatBox
            icon={Award}
            label="Moyenne générale"
            value={selectedChild.average_grade ? selectedChild.average_grade.toFixed(2) : '-'}
            suffix="/20"
            trend={selectedChild.average_grade && selectedChild.average_grade >= 10 ? 'up' : selectedChild.average_grade && selectedChild.average_grade < 10 ? 'down' : 'neutral'}
            color="#059669"
          />
          <StatBox
            icon={Calendar}
            label="Taux de présence"
            value={selectedChild.attendance_rate ? selectedChild.attendance_rate.toFixed(0) : '-'}
            suffix="%"
            trend={selectedChild.attendance_rate && selectedChild.attendance_rate >= 90 ? 'up' : 'neutral'}
            color="#3b82f6"
          />
          <StatBox
            icon={DollarSign}
            label="Frais en attente"
            value={selectedChild.pending_fees > 0 ? selectedChild.pending_fees.toLocaleString() : '0'}
            suffix=" FCFA"
            trend={selectedChild.pending_fees > 0 ? 'down' : 'up'}
            color={selectedChild.pending_fees > 0 ? '#ef4444' : '#059669'}
          />
          <StatBox
            icon={Clock}
            label="Total frais"
            value={selectedChild.total_fees.toLocaleString()}
            suffix=" FCFA"
            trend="neutral"
            color="#6b7280"
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['overview', 'grades', 'attendance', 'fees'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === tab ? '#059669' : 'var(--color-background-primary)',
              color: activeTab === tab ? 'white' : 'var(--color-text-primary)',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {tab === 'overview' ? 'Vue d\'ensemble' : tab === 'grades' ? 'Notes' : tab === 'attendance' ? 'Présences' : 'Frais'}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          {/* Recent grades */}
          <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Notes récentes</h3>
            {grades.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 24 }}>Aucune note</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grades.slice(0, 5).map((grade) => (
                  <GradeRow key={grade.id} grade={grade} />
                ))}
              </div>
            )}
            {grades.length > 5 && (
              <button
                onClick={() => setActiveTab('grades')}
                style={{ width: '100%', marginTop: 12, padding: 10, background: 'var(--color-background-secondary)', border: 'none', borderRadius: 8, cursor: 'pointer' }}
              >
                Voir toutes les notes
              </button>
            )}
          </div>

          {/* Attendance summary */}
          <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Présences ce mois</h3>
            {attendanceStats ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
                  <div style={{ padding: 16, background: '#ecfdf5', borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 600, color: '#059669' }}>{attendanceStats.present_days}</div>
                    <div style={{ fontSize: 12, color: '#059669' }}>Jours présents</div>
                  </div>
                  <div style={{ padding: 16, background: '#fef2f2', borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 600, color: '#dc2626' }}>{attendanceStats.absent_days}</div>
                    <div style={{ fontSize: 12, color: '#dc2626' }}>Jours absents</div>
                  </div>
                  <div style={{ padding: 16, background: '#fffbeb', borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 600, color: '#f59e0b' }}>{attendanceStats.late_days}</div>
                    <div style={{ fontSize: 12, color: '#f59e0b' }}>Retards</div>
                  </div>
                  <div style={{ padding: 16, background: '#eff6ff', borderRadius: 8 }}>
                    <div style={{ fontSize: 24, fontWeight: 600, color: '#3b82f6' }}>{attendanceStats.excused_days}</div>
                    <div style={{ fontSize: 12, color: '#3b82f6' }}>Excusés</div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('attendance')}
                  style={{ width: '100%', padding: 10, background: 'var(--color-background-secondary)', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                >
                  Voir l'historique
                </button>
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 24 }}>Aucune donnée</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'grades' && (
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Toutes les notes</h3>
          {grades.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 24 }}>Aucune note disponible</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {grades.map((grade) => (
                <GradeRow key={grade.id} grade={grade} detailed />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'attendance' && (
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Statistiques de présence</h3>
          {attendanceStats ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div style={{ padding: 20, background: '#ecfdf5', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 600, color: '#059669' }}>{attendanceStats.present_days}</div>
                <div style={{ fontSize: 14, color: '#059669', marginTop: 4 }}>Présent</div>
              </div>
              <div style={{ padding: 20, background: '#fef2f2', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 600, color: '#dc2626' }}>{attendanceStats.absent_days}</div>
                <div style={{ fontSize: 14, color: '#dc2626', marginTop: 4 }}>Absent</div>
              </div>
              <div style={{ padding: 20, background: '#fffbeb', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 600, color: '#f59e0b' }}>{attendanceStats.late_days}</div>
                <div style={{ fontSize: 14, color: '#f59e0b', marginTop: 4 }}>Retard</div>
              </div>
              <div style={{ padding: 20, background: '#eff6ff', borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 600, color: '#3b82f6' }}>{attendanceStats.excused_days}</div>
                <div style={{ fontSize: 14, color: '#3b82f6', marginTop: 4 }}>Excusé</div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 24 }}>Aucune donnée de présence</p>
          )}
        </div>
      )}

      {activeTab === 'fees' && (
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Factures de scolarité</h3>
          {feeInvoices.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 24 }}>Aucune facture</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {feeInvoices.map((fee) => (
                <FeeRow key={fee.id} fee={fee} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatBox({ icon: Icon, label, value, suffix, trend, color }: { icon: any; label: string; value: string; suffix?: string; trend: 'up' | 'down' | 'neutral'; color: string }) {
  return (
    <div style={{ padding: 16, background: 'var(--color-background-secondary)', borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon size={16} style={{ color }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{label}</span>
        {trend === 'up' && <TrendingUp size={14} style={{ color: '#059669', marginLeft: 'auto' }} />}
        {trend === 'down' && <TrendingDown size={14} style={{ color: '#dc2626', marginLeft: 'auto' }} />}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>
        {value}{suffix && <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{suffix}</span>}
      </div>
    </div>
  )
}

function GradeRow({ grade, detailed }: { grade: any; detailed?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'var(--color-background-secondary)', borderRadius: 8 }}>
      <div>
        <div style={{ fontWeight: 500 }}>{grade.subject_name}</div>
        {detailed && (
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            {grade.term_name} • Coef. {grade.subject_coefficient}
          </div>
        )}
      </div>
      <div style={{
        padding: '6px 16px',
        borderRadius: 20,
        background: grade.score >= 10 ? '#ecfdf5' : '#fef2f2',
        color: grade.score >= 10 ? '#059669' : '#dc2626',
        fontWeight: 600
      }}>
        {grade.score}/{grade.max_score}
      </div>
    </div>
  )
}

function FeeRow({ fee }: { fee: any }) {
  const statusColors: Record<string, { bg: string; color: string }> = {
    PAID: { bg: '#ecfdf5', color: '#059669' },
    PENDING: { bg: '#fffbeb', color: '#f59e0b' },
    OVERDUE: { bg: '#fef2f2', color: '#dc2626' }
  }

  const statusLabels: Record<string, string> = {
    PAID: 'Payé',
    PENDING: 'En attente',
    OVERDUE: 'En retard'
  }

  const style = statusColors[fee.status] || statusColors.PENDING

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--color-background-secondary)', borderRadius: 8 }}>
      <div>
        <div style={{ fontWeight: 500 }}>{fee.description}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {fee.invoice_number} • {fee.term_name || 'Annuelle'}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 600 }}>{fee.amount_remaining.toLocaleString()} FCFA</div>
        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: style.bg, color: style.color }}>
          {statusLabels[fee.status]}
        </span>
      </div>
    </div>
  )
}
