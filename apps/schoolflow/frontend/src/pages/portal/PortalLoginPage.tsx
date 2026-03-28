import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Loader2, GraduationCap, Users, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { useParentPortalStore } from '../../store/parentPortal'

export default function PortalLoginPage() {
  const navigate = useNavigate()
  const { login, requestMagicLink, loading } = useParentPortalStore()

  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [magicSent, setMagicSent] = useState(false)

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      toast.success('Connexion réussie!')
      navigate('/portal')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur de connexion')
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await requestMagicLink(email)
      setMagicSent(true)
      toast.success('Lien de connexion envoyé!')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--color-background-secondary)' }}>
      {/* Left side - Branding */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px',
        color: 'white'
      }}>
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <GraduationCap size={64} style={{ marginBottom: 24, opacity: 0.9 }} />
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>Portail Parents</h1>
          <p style={{ fontSize: 18, opacity: 0.9, marginBottom: 32 }}>
            Suivez la scolarité de vos enfants en temps réel
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 12 }}>
              <Users size={24} />
              <div>
                <div style={{ fontWeight: 600 }}>Notes & Bulletins</div>
                <div style={{ fontSize: 14, opacity: 0.8 }}>Consultez les résultats de vos enfants</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 12 }}>
              <Shield size={24} />
              <div>
                <div style={{ fontWeight: 600 }}>Présences</div>
                <div style={{ fontSize: 14, opacity: 0.8 }}>Suivez les absences et retards</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 12 }}>
              <Mail size={24} />
              <div>
                <div style={{ fontWeight: 600 }}>Messages</div>
                <div style={{ fontSize: 14, opacity: 0.8 }}>Communiquez avec l'école</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div style={{
        width: 480,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '48px',
        background: 'var(--color-background-primary)'
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, color: 'var(--color-text-primary)' }}>
            Connexion
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 32 }}>
            Accédez à votre espace parent
          </p>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button
              onClick={() => setMode('password')}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: mode === 'password' ? 'var(--color-background-secondary)' : 'transparent',
                color: mode === 'password' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Mot de passe
            </button>
            <button
              onClick={() => setMode('magic')}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: mode === 'magic' ? 'var(--color-background-secondary)' : 'transparent',
                color: mode === 'magic' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Lien magique
            </button>
          </div>

          {mode === 'password' ? (
            <form onSubmit={handlePasswordLogin}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: 'var(--color-text-primary)' }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 40px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border-primary)',
                      background: 'var(--color-background-primary)',
                      fontSize: 14
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: 'var(--color-text-primary)' }}>
                  Mot de passe
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 40px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border-primary)',
                      background: 'var(--color-background-primary)',
                      fontSize: 14
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: loading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                Se connecter
              </button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink}>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6, color: 'var(--color-text-primary)' }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 12px 12px 40px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border-primary)',
                      background: 'var(--color-background-primary)',
                      fontSize: 14
                    }}
                  />
                </div>
              </div>

              {magicSent ? (
                <div style={{ padding: 16, background: '#ecfdf5', borderRadius: 8, textAlign: 'center', color: '#059669' }}>
                  <Mail size={24} style={{ marginBottom: 8 }} />
                  <p style={{ fontWeight: 500 }}>Lien envoyé!</p>
                  <p style={{ fontSize: 14, marginTop: 4 }}>Vérifiez votre boîte de réception</p>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: 14,
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: loading ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                  Envoyer le lien
                </button>
              )}
            </form>
          )}

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <a href="/" style={{ color: '#059669', fontSize: 14, textDecoration: 'none' }}>
              ← Retour à l'accueil
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
