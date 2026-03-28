import { useState } from 'react'
import { Settings, User, Lock, Bell, Globe, Save, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useParentPortalStore } from '../../store/parentPortal'

export default function ProfilePage() {
  const { account, updateProfile, changePassword } = useParentPortalStore()
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile')
  const [saving, setSaving] = useState(false)

  // Profile form
  const [firstName, setFirstName] = useState(account?.parent.first_name || '')
  const [lastName, setLastName] = useState(account?.parent.last_name || '')
  const [phone, setPhone] = useState(account?.parent.phone || '')
  const [address, setAddress] = useState(account?.parent.address || '')

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // Notification settings
  const [receiveSms, setReceiveSms] = useState(account?.receive_sms_notifications ?? true)
  const [receiveEmail, setReceiveEmail] = useState(account?.receive_email_notifications ?? true)
  const [preferredLanguage, setPreferredLanguage] = useState(account?.preferred_language || 'fr')

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        phone,
        address
      })
      toast.success('Profil mis à jour!')
    } catch (error) {
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setChangingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      toast.success('Mot de passe modifié!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors du changement')
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)' }}>Paramètres</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
          Gérez votre compte et vos préférences
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'profile' ? '#059669' : 'var(--color-background-primary)',
            color: activeTab === 'profile' ? 'white' : 'var(--color-text-primary)',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <User size={18} />
          Profil
        </button>
        <button
          onClick={() => setActiveTab('security')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'security' ? '#059669' : 'var(--color-background-primary)',
            color: activeTab === 'security' ? 'white' : 'var(--color-text-primary)',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <Lock size={18} />
          Sécurité
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: activeTab === 'notifications' ? '#059669' : 'var(--color-background-primary)',
            color: activeTab === 'notifications' ? 'white' : 'var(--color-text-primary)',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <Bell size={18} />
          Notifications
        </button>
      </div>

      {/* Content */}
      <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 24 }}>
        {activeTab === 'profile' && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Informations personnelles</h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Prénom</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid var(--color-border-primary)',
                    fontSize: 14
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Nom</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid var(--color-border-primary)',
                    fontSize: 14
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Email</label>
              <input
                type="email"
                value={account?.email || ''}
                disabled
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--color-border-primary)',
                  fontSize: 14,
                  background: 'var(--color-background-secondary)',
                  color: 'var(--color-text-secondary)'
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Téléphone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: +221 77 000 00 00"
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--color-border-primary)',
                  fontSize: 14
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Adresse</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Votre adresse"
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--color-border-primary)',
                  fontSize: 14,
                  minHeight: 80,
                  resize: 'vertical'
                }}
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: saving ? 'wait' : 'pointer',
                fontWeight: 500
              }}
            >
              <Save size={18} />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        )}

        {activeTab === 'security' && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Changer le mot de passe</h3>

            <div style={{ maxWidth: 400 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Mot de passe actuel</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 40px 12px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border-primary)',
                      fontSize: 14
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Nouveau mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 40px 12px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--color-border-primary)',
                      fontSize: 14
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-text-secondary)'
                    }}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid var(--color-border-primary)',
                    fontSize: 14
                  }}
                />
              </div>

              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: changingPassword ? 'wait' : 'pointer',
                  fontWeight: 500
                }}
              >
                <Lock size={18} />
                {changingPassword ? 'Modification...' : 'Modifier le mot de passe'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Préférences de notification</h3>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Langue préférée</label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--color-border-primary)',
                  fontSize: 14,
                  width: 200
                }}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="sw">Kiswahili</option>
                <option value="wo">Wolof</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                background: 'var(--color-background-secondary)',
                borderRadius: 8
              }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Notifications SMS</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Recevoir les notifications par SMS</div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 26 }}>
                  <input
                    type="checkbox"
                    checked={receiveSms}
                    onChange={(e) => setReceiveSms(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: receiveSms ? '#059669' : '#d1d5db',
                    borderRadius: 26,
                    transition: '0.2s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: 20,
                      width: 20,
                      left: receiveSms ? 26 : 3,
                      bottom: 3,
                      background: 'white',
                      borderRadius: '50%',
                      transition: '0.2s'
                    }} />
                  </span>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                background: 'var(--color-background-secondary)',
                borderRadius: 8
              }}>
                <div>
                  <div style={{ fontWeight: 500 }}>Notifications Email</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Recevoir les notifications par email</div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 26 }}>
                  <input
                    type="checkbox"
                    checked={receiveEmail}
                    onChange={(e) => setReceiveEmail(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: receiveEmail ? '#059669' : '#d1d5db',
                    borderRadius: 26,
                    transition: '0.2s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      content: '""',
                      height: 20,
                      width: 20,
                      left: receiveEmail ? 26 : 3,
                      bottom: 3,
                      background: 'white',
                      borderRadius: '50%',
                      transition: '0.2s'
                    }} />
                  </span>
                </label>
              </div>
            </div>

            <button
              onClick={() => toast.success('Préférences enregistrées!')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #059669, #10b981)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              <Save size={18} />
              Enregistrer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
