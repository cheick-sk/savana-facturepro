import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Plus, ChevronRight, GraduationCap, Award, Calendar, DollarSign, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useParentPortalStore } from '../../store/parentPortal'

export default function ChildrenPage() {
  const { children, fetchChildren, linkStudent, loading } = useParentPortalStore()
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [studentNumber, setStudentNumber] = useState('')
  const [relationship, setRelationship] = useState('parent')
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    fetchChildren()
  }, [fetchChildren])

  const handleLink = async () => {
    if (!studentNumber.trim()) {
      toast.error('Veuillez entrer le numéro de l\'élève')
      return
    }

    setLinking(true)
    try {
      await linkStudent(studentNumber, relationship)
      toast.success('Élève associé avec succès!')
      setShowLinkModal(false)
      setStudentNumber('')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'association')
    } finally {
      setLinking(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)' }}>Mes enfants</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Gérez les enfants associés à votre compte
          </p>
        </div>
        <button
          onClick={() => setShowLinkModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: 'linear-gradient(135deg, #059669, #10b981)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          <Plus size={18} />
          Ajouter un enfant
        </button>
      </div>

      {/* Children list */}
      {children.length === 0 ? (
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <Users size={64} style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Aucun enfant associé</h3>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>
            Associez vos enfants pour suivre leur scolarité
          </p>
          <button
            onClick={() => setShowLinkModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            <Plus size={18} />
            Ajouter un enfant
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {children.map((child) => (
            <ChildCard key={child.id} child={child} />
          ))}
        </div>
      )}

      {/* Link modal */}
      {showLinkModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--color-background-primary)',
            borderRadius: 16,
            padding: 24,
            width: 400,
            maxWidth: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>Ajouter un enfant</h3>
              <button
                onClick={() => setShowLinkModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                Numéro de l'élève
              </label>
              <input
                type="text"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder="Ex: ELE-2024-001"
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--color-border-primary)',
                  fontSize: 14
                }}
              />
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Le numéro figure sur le carnet de l'élève
              </p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
                Relation
              </label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--color-border-primary)',
                  fontSize: 14
                }}
              >
                <option value="parent">Parent</option>
                <option value="guardian">Tuteur</option>
                <option value="other">Autre</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowLinkModal(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--color-border-primary)',
                  background: 'transparent',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleLink}
                disabled={linking}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  border: 'none',
                  background: '#059669',
                  color: 'white',
                  cursor: linking ? 'wait' : 'pointer',
                  fontWeight: 500
                }}
              >
                {linking ? 'Association...' : 'Associer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ChildCard({ child }: { child: any }) {
  return (
    <Link
      to={`/portal/children/${child.id}`}
      style={{
        display: 'block',
        background: 'var(--color-background-primary)',
        borderRadius: 12,
        padding: 20,
        textDecoration: 'none',
        transition: 'box-shadow 0.2s'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #059669, #10b981)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 600,
            fontSize: 20
          }}>
            {child.first_name[0]}{child.last_name[0]}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--color-text-primary)' }}>{child.full_name}</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              N° {child.student_number}
            </div>
          </div>
        </div>
        <ChevronRight size={20} style={{ color: 'var(--color-text-secondary)' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <GraduationCap size={16} style={{ color: 'var(--color-text-secondary)' }} />
        <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
          {child.class_name || 'Non assigné'} {child.class_level ? `• ${child.class_level}` : ''}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, padding: 12, background: 'var(--color-background-secondary)', borderRadius: 8, textAlign: 'center' }}>
          <Award size={16} style={{ color: '#059669', marginBottom: 4 }} />
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Moyenne</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>-</div>
        </div>
        <div style={{ flex: 1, padding: 12, background: 'var(--color-background-secondary)', borderRadius: 8, textAlign: 'center' }}>
          <Calendar size={16} style={{ color: '#3b82f6', marginBottom: 4 }} />
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Présence</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>-</div>
        </div>
        <div style={{ flex: 1, padding: 12, background: 'var(--color-background-secondary)', borderRadius: 8, textAlign: 'center' }}>
          <DollarSign size={16} style={{ color: '#f59e0b', marginBottom: 4 }} />
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Frais</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>-</div>
        </div>
      </div>

      {child.relationship && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border-tertiary)' }}>
          <span style={{
            fontSize: 12,
            padding: '4px 8px',
            background: child.is_primary ? '#ecfdf5' : 'var(--color-background-secondary)',
            color: child.is_primary ? '#059669' : 'var(--color-text-secondary)',
            borderRadius: 4
          }}>
            {child.relationship === 'parent' ? 'Parent' : child.relationship === 'guardian' ? 'Tuteur' : child.relationship}
            {child.is_primary && ' • Contact principal'}
          </span>
        </div>
      )}
    </Link>
  )
}
