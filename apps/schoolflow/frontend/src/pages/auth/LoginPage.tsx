import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import toast from 'react-hot-toast'
export default function LoginPage() {
  const [email, setEmail] = useState('admin@schoolflow.africa')
  const [password, setPassword] = useState('Admin1234!')
  const { login, loading } = useAuthStore()
  const navigate = useNavigate()
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try { await login(email, password); navigate('/dashboard') }
    catch { toast.error('Identifiants invalides') }
  }
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background-tertiary)' }}>
      <div style={{ width: 380, background: 'var(--color-background-primary)', borderRadius: 'var(--border-radius-lg)', border: '0.5px solid var(--color-border-tertiary)', padding: '32px 28px' }}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>SchoolFlow Africa</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Connectez-vous</div>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={{ fontSize: 12, display: 'block', marginBottom: 6, color: 'var(--color-text-secondary)' }}>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box' }} /></div>
          <div><label style={{ fontSize: 12, display: 'block', marginBottom: 6, color: 'var(--color-text-secondary)' }}>Mot de passe</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box' }} /></div>
          <button type="submit" disabled={loading} style={{ marginTop: 8, padding: '10px' }}>{loading ? 'Connexion...' : 'Se connecter'}</button>
        </form>
        <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', fontSize: 11, color: 'var(--color-text-secondary)' }}>Demo: admin@schoolflow.africa / Admin1234!</div>
      </div>
    </div>
  )
}
