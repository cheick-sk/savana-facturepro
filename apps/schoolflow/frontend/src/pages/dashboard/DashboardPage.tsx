import { useEffect, useState } from 'react'
import api from '../../lib/api'
export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  useEffect(() => { api.get('/dashboard/stats').then(r => setStats(r.data)).catch(() => {}) }, [])
  return (
    <div>
      <div style={{ marginBottom: 24 }}><h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Tableau de bord</h1><p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>Vue d'ensemble de l'établissement</p></div>
      {stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { label: 'Élèves actifs', value: stats.total_students },
            { label: 'Classes', value: stats.total_classes },
            { label: 'Enseignants', value: stats.total_teachers },
            { label: 'Frais perçus', value: `${new Intl.NumberFormat('fr-FR').format(Math.round(stats.fees_collected))} XOF` },
            { label: 'Frais en attente', value: `${new Intl.NumberFormat('fr-FR').format(Math.round(stats.fees_pending))} XOF` },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 500 }}>{value}</div>
            </div>
          ))}
        </div>
      ) : <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Chargement...</div>}
    </div>
  )
}
