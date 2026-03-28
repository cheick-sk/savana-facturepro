import { useEffect, useState, useMemo } from 'react'
import { Award, ChevronDown, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useParentPortalStore } from '../../store/parentPortal'

export default function GradesPage() {
  const { children, grades, fetchChildren, fetchGrades } = useParentPortalStore()
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'subject'>('list')

  useEffect(() => {
    fetchChildren()
  }, [fetchChildren])

  // Auto-select first child when children are loaded
  const defaultChildId = useMemo(() => children[0]?.id ?? null, [children])
  const activeChildId = selectedChildId ?? defaultChildId

  useEffect(() => {
    if (activeChildId) {
      fetchGrades(activeChildId)
    }
  }, [activeChildId, fetchGrades])

  const selectedChild = children.find(c => c.id === activeChildId)

  // Group grades by subject
  const gradesBySubject = grades.reduce((acc, grade) => {
    const subjectId = grade.subject_id
    if (!acc[subjectId]) {
      acc[subjectId] = {
        subject_name: grade.subject_name,
        coefficient: grade.subject_coefficient,
        grades: []
      }
    }
    acc[subjectId].grades.push(grade)
    return acc
  }, {} as Record<number, { subject_name: string; coefficient: number; grades: typeof grades }>)

  // Calculate subject averages
  const subjectAverages = Object.entries(gradesBySubject).map(([id, data]) => {
    const avg = data.grades.reduce((sum, g) => sum + g.score, 0) / data.grades.length
    return {
      subject_id: parseInt(id),
      ...data,
      average: avg
    }
  })

  // Calculate overall average
  const overallAverage = subjectAverages.length > 0
    ? subjectAverages.reduce((sum, s) => sum + s.average * s.coefficient, 0) /
      subjectAverages.reduce((sum, s) => sum + s.coefficient, 0)
    : null

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)' }}>Notes</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Consultez les résultats de vos enfants
          </p>
        </div>

        {/* Child selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <select
              value={activeChildId || ''}
              onChange={(e) => setSelectedChildId(parseInt(e.target.value))}
              style={{
                padding: '10px 36px 10px 14px',
                borderRadius: 8,
                border: '1px solid var(--color-border-primary)',
                background: 'var(--color-background-primary)',
                fontSize: 14,
                appearance: 'none',
                cursor: 'pointer'
              }}
            >
              {children.map((child) => (
                <option key={child.id} value={child.id}>{child.full_name}</option>
              ))}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-secondary)' }} />
          </div>
        </div>
      </div>

      {/* Overall stats */}
      {selectedChild && (
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #059669, #10b981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 600,
              fontSize: 20
            }}>
              {overallAverage ? overallAverage.toFixed(2) : '-'}
            </div>
            <div>
              <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Moyenne générale de {selectedChild.full_name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                {overallAverage && overallAverage >= 10 ? (
                  <>
                    <TrendingUp size={16} style={{ color: '#059669' }} />
                    <span style={{ color: '#059669', fontWeight: 500 }}>Bonnes performances</span>
                  </>
                ) : overallAverage && overallAverage < 10 ? (
                  <>
                    <TrendingDown size={16} style={{ color: '#dc2626' }} />
                    <span style={{ color: '#dc2626', fontWeight: 500 }}>Des efforts sont nécessaires</span>
                  </>
                ) : (
                  <>
                    <Minus size={16} style={{ color: 'var(--color-text-secondary)' }} />
                    <span style={{ color: 'var(--color-text-secondary)' }}>Pas encore de notes</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setViewMode('list')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: viewMode === 'list' ? '#059669' : 'var(--color-background-primary)',
            color: viewMode === 'list' ? 'white' : 'var(--color-text-primary)',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Liste des notes
        </button>
        <button
          onClick={() => setViewMode('subject')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: viewMode === 'subject' ? '#059669' : 'var(--color-background-primary)',
            color: viewMode === 'subject' ? 'white' : 'var(--color-text-primary)',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Par matière
        </button>
      </div>

      {/* Content */}
      {grades.length === 0 ? (
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
          <Award size={48} style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }} />
          <p style={{ color: 'var(--color-text-secondary)' }}>Aucune note disponible pour le moment</p>
        </div>
      ) : viewMode === 'list' ? (
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-background-secondary)' }}>
                <th style={{ padding: 14, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Matière</th>
                <th style={{ padding: 14, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Trimestre</th>
                <th style={{ padding: 14, textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Note</th>
                <th style={{ padding: 14, textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Commentaire</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((grade) => (
                <tr key={grade.id} style={{ borderTop: '1px solid var(--color-border-tertiary)' }}>
                  <td style={{ padding: 14 }}>
                    <div style={{ fontWeight: 500 }}>{grade.subject_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Coef. {grade.subject_coefficient}</div>
                  </td>
                  <td style={{ padding: 14, color: 'var(--color-text-secondary)' }}>{grade.term_name}</td>
                  <td style={{ padding: 14, textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      background: grade.score >= 10 ? '#ecfdf5' : '#fef2f2',
                      color: grade.score >= 10 ? '#059669' : '#dc2626',
                      fontWeight: 600
                    }}>
                      {grade.score}/{grade.max_score}
                    </span>
                  </td>
                  <td style={{ padding: 14, color: 'var(--color-text-secondary)', fontSize: 13 }}>
                    {grade.comment || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {subjectAverages.map((subject) => (
            <div key={subject.subject_id} style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{subject.subject_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Coef. {subject.coefficient} • {subject.grades.length} note(s)</div>
                </div>
                <div style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  background: subject.average >= 10 ? '#ecfdf5' : '#fef2f2',
                  color: subject.average >= 10 ? '#059669' : '#dc2626',
                  fontWeight: 600
                }}>
                  {subject.average.toFixed(2)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {subject.grades.map((grade) => (
                  <span
                    key={grade.id}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: 'var(--color-background-secondary)',
                      fontSize: 12
                    }}
                  >
                    {grade.score}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
