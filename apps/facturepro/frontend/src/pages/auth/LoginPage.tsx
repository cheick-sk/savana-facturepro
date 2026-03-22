import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import {
  Receipt,
  Shield,
  TrendingUp,
  Globe,
  CheckCircle,
  ArrowRight,
  Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

const FEATURES = [
  { icon: Receipt, title: 'Facturation Pro', desc: 'Créez des factures professionnelles en quelques clics' },
  { icon: TrendingUp, title: 'Analytiques', desc: 'Suivez votre chiffre d\'affaires en temps réel' },
  { icon: Shield, title: 'Sécurisé', desc: 'Vos données sont chiffrées et sauvegardées' },
  { icon: Globe, title: 'Multi-devises', desc: 'XOF, XAF, NGN, KES, GHS et plus encore' },
]

const TESTIMONIALS = [
  { name: 'Amadou K.', company: 'Tech Solutions, Dakar', text: 'FacturePro a révolutionné notre gestion commerciale.' },
  { name: 'Fatou M.', company: 'Boutique Élégance, Abidjan', text: 'Simple, efficace et adapté à nos besoins.' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('admin@facturepro.africa')
  const [password, setPassword] = useState('Admin1234!')
  const { login, loading } = useAuthStore()
  const navigate = useNavigate()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      toast.success('Connexion réussie !')
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Identifiants invalides')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
    }}>
      {/* Left Side - Branding */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
                       radial-gradient(circle at 80% 20%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)`
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 560 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
            <div style={{
              width: 56,
              height: 56,
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)'
            }}>
              <Receipt size={28} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>
                FacturePro
              </div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                Africa
              </div>
            </div>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 42,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.2,
            marginBottom: 20,
            letterSpacing: '-0.5px'
          }}>
            Gérez votre facturation<br />
            <span style={{
              background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              comme un pro
            </span>
          </h1>

          <p style={{
            fontSize: 18,
            color: 'rgba(255,255,255,0.6)',
            marginBottom: 48,
            lineHeight: 1.6
          }}>
            La solution de facturation professionnelle conçue pour les entreprises africaines.
            Simple, puissante et adaptée à vos besoins.
          </p>

          {/* Features */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 20
          }}>
            {FEATURES.map(({ icon: Icon, title, desc }, idx) => (
              <div key={idx} style={{
                display: 'flex',
                gap: 12,
                padding: 16,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={20} color="#60a5fa" />
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                    {title}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, lineHeight: 1.4 }}>
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div style={{
            marginTop: 48,
            padding: 24,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, fontStyle: 'italic', marginBottom: 16 }}>
              "FacturePro a transformé notre façon de gérer la facturation. Notre équipe gagne un temps précieux."
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                color: '#fff'
              }}>
                A
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 500, fontSize: 14 }}>Amadou K.</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>CEO, Tech Solutions Dakar</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: 60,
          color: 'rgba(255,255,255,0.4)',
          fontSize: 13
        }}>
          © 2024 FacturePro Africa. Tous droits réservés.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div style={{
        width: 480,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px',
        position: 'relative'
      }}>
        <div style={{ maxWidth: 360, margin: '0 auto', width: '100%' }}>
          {/* Header */}
          <div style={{ marginBottom: 40 }}>
            <h2 style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 8
            }}>
              Bienvenue
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
              Connectez-vous à votre espace FacturePro
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: 8
              }}>
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="votre@email.com"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: 15,
                  borderRadius: 10,
                  border: '1px solid var(--border-light)'
                }}
              />
            </div>

            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8
              }}>
                <label style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-secondary)'
                }}>
                  Mot de passe
                </label>
                <a href="#" style={{
                  fontSize: 13,
                  color: 'var(--primary-600)',
                  textDecoration: 'none'
                }}>
                  Mot de passe oublié ?
                </a>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: 15,
                  borderRadius: 10,
                  border: '1px solid var(--border-light)'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <input
                type="checkbox"
                id="remember"
                style={{ width: 18, height: 18, borderRadius: 4 }}
              />
              <label htmlFor="remember" style={{
                fontSize: 14,
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}>
                Se souvenir de moi
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 24px',
                fontSize: 15,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div style={{
            marginTop: 24,
            padding: 16,
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            border: '1px solid var(--border-light)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <CheckCircle size={14} color="var(--success-500)" />
              Identifiants de démonstration
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              fontSize: 13
            }}>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Email:</span>
                <br />
                <code style={{
                  background: 'var(--bg-tertiary)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 12
                }}>
                  admin@facturepro.africa
                </code>
              </div>
              <div>
                <span style={{ color: 'var(--text-tertiary)' }}>Mot de passe:</span>
                <br />
                <code style={{
                  background: 'var(--bg-tertiary)',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 12
                }}>
                  Admin1234!
                </code>
              </div>
            </div>
          </div>

          {/* Sign Up Link */}
          <div style={{
            marginTop: 32,
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: 14
          }}>
            Pas encore de compte ?{' '}
            <a href="#" style={{
              color: 'var(--primary-600)',
              fontWeight: 500,
              textDecoration: 'none'
            }}>
              Créer un compte
            </a>
          </div>
        </div>

        {/* Bottom Info */}
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 12
        }}>
          En vous connectant, vous acceptez nos{' '}
          <a href="#" style={{ color: 'var(--text-secondary)' }}>Conditions d'utilisation</a>
          {' '}et notre{' '}
          <a href="#" style={{ color: 'var(--text-secondary)' }}>Politique de confidentialité</a>
        </div>
      </div>
    </div>
  )
}
