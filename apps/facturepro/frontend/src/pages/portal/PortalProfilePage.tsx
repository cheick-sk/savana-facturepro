import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { User, Mail, Phone, Globe, Lock, CreditCard, Trash2 } from 'lucide-react'
import { API_BASE_URL } from '../../lib/api'

interface ClientAccount {
  id: number
  email: string
  phone: string | null
  preferred_language: string
  preferred_payment_method: string | null
  email_verified: boolean
  last_login: string | null
  created_at: string
  customer: {
    id: number
    name: string
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    country: string
  } | null
}

interface PaymentMethod {
  id: number
  provider: string
  method_type: string
  last_four: string | null
  phone_number: string | null
  card_brand: string | null
  is_default: boolean
  created_at: string
}

interface PortalProfilePageProps {
  token: string
}

export default function PortalProfilePage({ token }: PortalProfilePageProps) {
  const { t } = useTranslation()
  const [profile, setProfile] = useState<ClientAccount | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  // Form fields
  const [phone, setPhone] = useState('')
  const [language, setLanguage] = useState('fr')

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileRes, methodsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/portal/profile`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/portal/payments/methods`, {
            headers: { 'Authorization': `Bearer ${token}` },
          }),
        ])

        if (profileRes.ok) {
          const profileData = await profileRes.json()
          setProfile(profileData)
          setPhone(profileData.phone || '')
          setLanguage(profileData.preferred_language || 'fr')
        }

        if (methodsRes.ok) {
          setPaymentMethods(await methodsRes.json())
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [token])

  const handleSaveProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/portal/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone,
          preferred_language: language,
        }),
      })

      if (res.ok) {
        const updated = await res.json()
        setProfile(updated)
        setEditing(false)
        toast.success('Profil mis à jour')
      } else {
        toast.error('Erreur lors de la mise à jour')
      }
    } catch (error) {
      toast.error('Erreur de connexion')
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    try {
      const res = await fetch(`${API_BASE_URL}/portal/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword || null,
          new_password: newPassword,
        }),
      })

      if (res.ok) {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setShowPasswordForm(false)
        toast.success('Mot de passe modifié')
      } else {
        const err = await res.json()
        toast.error(err.detail || 'Erreur lors du changement')
      }
    } catch (error) {
      toast.error('Erreur de connexion')
    }
  }

  const handleDeletePaymentMethod = async (methodId: number) => {
    if (!confirm('Supprimer cette méthode de paiement ?')) return

    try {
      const res = await fetch(`${API_BASE_URL}/portal/payments/methods/${methodId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (res.ok) {
        setPaymentMethods(methods => methods.filter(m => m.id !== methodId))
        toast.success('Méthode de paiement supprimée')
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Chargement...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#6b7280' }}>Profil non trouvé</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{
        fontSize: '24px',
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: '24px',
      }}>
        <User size={28} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
        Mon profil
      </h1>

      {/* Profile Info */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #f3f4f6',
        marginBottom: '24px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
            Informations personnelles
          </h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: 'white',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Modifier
            </button>
          )}
        </div>

        <div style={{ padding: '24px' }}>
          {editing ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  <Mail size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    color: '#6b7280',
                  }}
                />
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                  L'email ne peut pas être modifié
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  <Phone size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+225 07 00 00 00 00"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  <Globe size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                  Langue préférée
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                  }}
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="sw">Kiswahili</option>
                  <option value="wo">Wolof</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={() => setEditing(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveProfile}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Enregistrer
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#eef2ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Mail size={18} color="#4f46e5" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Email</div>
                  <div style={{ fontWeight: '500', color: '#1f2937' }}>{profile.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#eef2ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Phone size={18} color="#4f46e5" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Téléphone</div>
                  <div style={{ fontWeight: '500', color: '#1f2937' }}>{profile.phone || 'Non renseigné'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#eef2ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Globe size={18} color="#4f46e5" />
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Langue</div>
                  <div style={{ fontWeight: '500', color: '#1f2937' }}>
                    {language === 'fr' ? 'Français' : language === 'en' ? 'English' : language}
                  </div>
                </div>
              </div>

              {profile.customer && (
                <div style={{
                  marginTop: '16px',
                  padding: '16px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                    Compte client
                  </div>
                  <div style={{ fontWeight: '600', color: '#1f2937' }}>{profile.customer.name}</div>
                  {profile.customer.address && (
                    <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                      {profile.customer.address}
                      {profile.customer.city && `, ${profile.customer.city}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Password */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #f3f4f6',
        marginBottom: '24px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
            <Lock size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Mot de passe
          </h2>
        </div>

        <div style={{ padding: '24px' }}>
          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              Changer le mot de passe
            </button>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {profile.password_hash !== null && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                    Mot de passe actuel
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowPasswordForm(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleChangePassword}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Changer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Methods */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #f3f4f6',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #f3f4f6',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
            <CreditCard size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Méthodes de paiement sauvegardées
          </h2>
        </div>

        <div style={{ padding: '24px' }}>
          {paymentMethods.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              <CreditCard size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p>Aucune méthode de paiement sauvegardée</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: method.method_type === 'card' ? '#dbeafe' : '#dcfce7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <CreditCard size={18} color={method.method_type === 'card' ? '#2563eb' : '#16a34a'} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '500', color: '#1f2937' }}>
                        {method.method_type === 'card'
                          ? `${method.card_brand || 'Carte'} •••• ${method.last_four}`
                          : method.phone_number || method.provider}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {method.provider}
                        {method.is_default && ' • Par défaut'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeletePaymentMethod(method.id)}
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#fee2e2',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={16} color="#dc2626" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
