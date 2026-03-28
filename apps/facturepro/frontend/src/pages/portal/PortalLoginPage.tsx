import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Mail, ArrowRight, Smartphone } from 'lucide-react'
import { API_BASE_URL } from '../../lib/api'

interface PortalLoginPageProps {
  onLogin: (token: string, client: any) => void
  invoiceToken?: string
}

export default function PortalLoginPage({ onLogin, invoiceToken }: PortalLoginPageProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'magic' | 'password'>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(false)

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('Veuillez entrer votre adresse email')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/portal/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        setMagicSent(true)
        toast.success('Lien de connexion envoyé ! Vérifiez votre boîte email.')
      } else {
        toast.error('Erreur lors de l\'envoi du lien')
      }
    } catch (error) {
      toast.error('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/portal/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('portal_token', data.access_token)
        localStorage.setItem('portal_refresh', data.refresh_token)
        onLogin(data.access_token, data.client)
        toast.success('Connexion réussie !')
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Identifiants incorrects')
      }
    } catch (error) {
      toast.error('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        maxWidth: '420px',
        width: '100%',
        padding: '40px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Mail size={32} color="white" />
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '8px',
          }}>
            Portail Client
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Accédez à vos factures et effectuez vos paiements
          </p>
        </div>

        {magicSent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Mail size={32} color="#10b981" />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              Vérifiez votre email
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
              Un lien de connexion a été envoyé à <strong>{email}</strong>
            </p>
            <button
              onClick={() => setMagicSent(false)}
              style={{
                color: '#6366f1',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Utiliser une autre méthode
            </button>
          </div>
        ) : (
          <>
            {/* Mode Toggle */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '24px',
              background: '#f3f4f6',
              padding: '4px',
              borderRadius: '8px',
            }}>
              <button
                onClick={() => setMode('magic')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: mode === 'magic' ? 'white' : 'transparent',
                  boxShadow: mode === 'magic' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: 500,
                  color: mode === 'magic' ? '#1f2937' : '#6b7280',
                  transition: 'all 0.2s',
                }}
              >
                <Smartphone size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Lien magique
              </button>
              <button
                onClick={() => setMode('password')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: mode === 'password' ? 'white' : 'transparent',
                  boxShadow: mode === 'password' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: 500,
                  color: mode === 'password' ? '#1f2937' : '#6b7280',
                  transition: 'all 0.2s',
                }}
              >
                Mot de passe
              </button>
            </div>

            {/* Form */}
            <form onSubmit={mode === 'magic' ? handleMagicLink : handlePasswordLogin}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: 500,
                  color: '#374151',
                  fontSize: '14px',
                }}>
                  Adresse email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              {mode === 'password' && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontWeight: 500,
                    color: '#374151',
                    fontSize: '14px',
                  }}>
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '15px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {loading ? (
                  'Chargement...'
                ) : mode === 'magic' ? (
                  <>
                    Envoyer le lien de connexion
                    <ArrowRight size={18} />
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          marginTop: '24px',
          color: '#9ca3af',
          fontSize: '12px',
        }}>
          Propulsé par <strong>FacturePro Africa</strong>
        </p>
      </div>
    </div>
  )
}
