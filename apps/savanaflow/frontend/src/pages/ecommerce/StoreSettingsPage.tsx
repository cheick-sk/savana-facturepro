import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  Save, Store, Globe, Palette, Phone, Mail, MapPin,
  Facebook, Instagram, CreditCard, Truck, Shield
} from 'lucide-react'
import { useEcommerceStore } from '../../store/ecommerce'
import toast from 'react-hot-toast'

export default function StoreSettingsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentStore, fetchStore, createStore, updateStore, loading, error } = useEcommerceStore()
  const isNew = id === 'new'

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    store_id: 1,
    custom_domain: '',
    // Branding
    logo_url: '',
    banner_url: '',
    primary_color: '#2563eb',
    secondary_color: '#1e40af',
    // Contact
    contact_email: '',
    contact_phone: '',
    address: '',
    // Social
    facebook_url: '',
    instagram_url: '',
    whatsapp_number: '',
    // Configuration
    currency: 'XOF',
    language: 'fr',
    timezone: 'Africa/Abidjan',
    // Features
    delivery_enabled: false,
    pickup_enabled: true,
    guest_checkout: true,
    // Payment
    cinetpay_enabled: false,
    cinetpay_site_id: '',
    cinetpay_api_key: '',
    paystack_enabled: false,
    paystack_public_key: '',
    paystack_secret_key: '',
    mpesa_enabled: false,
    mpesa_shortcode: '',
    cash_on_delivery: false,
    // SEO
    meta_title: '',
    meta_description: '',
    is_active: true,
  })

  useEffect(() => {
    if (!isNew && id) {
      fetchStore(Number(id))
    }
  }, [id, isNew, fetchStore])

  useEffect(() => {
    if (currentStore && !isNew) {
      setFormData({
        name: currentStore.name || '',
        slug: currentStore.slug || '',
        store_id: currentStore.store_id || 1,
        custom_domain: currentStore.custom_domain || '',
        logo_url: currentStore.logo_url || '',
        banner_url: currentStore.banner_url || '',
        primary_color: currentStore.primary_color || '#2563eb',
        secondary_color: currentStore.secondary_color || '#1e40af',
        contact_email: currentStore.contact_email || '',
        contact_phone: currentStore.contact_phone || '',
        address: currentStore.address || '',
        facebook_url: currentStore.facebook_url || '',
        instagram_url: currentStore.instagram_url || '',
        whatsapp_number: currentStore.whatsapp_number || '',
        currency: currentStore.currency || 'XOF',
        language: currentStore.language || 'fr',
        timezone: currentStore.timezone || 'Africa/Abidjan',
        delivery_enabled: currentStore.delivery_enabled || false,
        pickup_enabled: currentStore.pickup_enabled ?? true,
        guest_checkout: currentStore.guest_checkout ?? true,
        cinetpay_enabled: currentStore.cinetpay_enabled || false,
        cinetpay_site_id: '',
        cinetpay_api_key: '',
        paystack_enabled: currentStore.paystack_enabled || false,
        paystack_public_key: '',
        paystack_secret_key: '',
        mpesa_enabled: currentStore.mpesa_enabled || false,
        mpesa_shortcode: '',
        cash_on_delivery: currentStore.cash_on_delivery || false,
        meta_title: currentStore.meta_title || '',
        meta_description: currentStore.meta_description || '',
        is_active: currentStore.is_active ?? true,
      })
    }
  }, [currentStore, isNew])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isNew) {
        const store = await createStore(formData)
        toast.success('Boutique créée avec succès')
        navigate(`/ecommerce/stores/${store.id}`)
      } else {
        await updateStore(Number(id), formData)
        toast.success('Boutique mise à jour')
      }
    } catch (err) {
      toast.error(error || 'Erreur lors de la sauvegarde')
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            {isNew ? 'Nouvelle boutique' : 'Paramètres de la boutique'}
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {isNew ? 'Créez votre boutique en ligne' : 'Configurez votre boutique en ligne'}
          </p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary flex items-center gap-2"
        >
          <Save size={16} />
          Sauvegarder
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Store className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold text-[var(--text-primary)]">Informations générales</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Nom de la boutique *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Slug (URL) *
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="ma-boutique"
                required
                disabled={!isNew}
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                URL: /store/{formData.slug || '...'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Domaine personnalisé
              </label>
              <input
                type="text"
                value={formData.custom_domain}
                onChange={(e) => handleChange('custom_domain', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="maboutique.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Statut
              </label>
              <select
                value={formData.is_active ? 'active' : 'inactive'}
                onChange={(e) => handleChange('is_active', e.target.value === 'active')}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold text-[var(--text-primary)]">Image de marque</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                URL du logo
              </label>
              <input
                type="url"
                value={formData.logo_url}
                onChange={(e) => handleChange('logo_url', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                URL de la bannière
              </label>
              <input
                type="url"
                value={formData.banner_url}
                onChange={(e) => handleChange('banner_url', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Couleur principale
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  className="w-10 h-10 border border-[var(--border-light)] rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  className="flex-1 px-3 py-2 border border-[var(--border-light)] rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Couleur secondaire
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => handleChange('secondary_color', e.target.value)}
                  className="w-10 h-10 border border-[var(--border-light)] rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.secondary_color}
                  onChange={(e) => handleChange('secondary_color', e.target.value)}
                  className="flex-1 px-3 py-2 border border-[var(--border-light)] rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Phone className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold text-[var(--text-primary)]">Contact</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Email de contact
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Adresse
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Social */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold text-[var(--text-primary)]">Réseaux sociaux</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                <Facebook size={14} className="inline mr-1" />
                Facebook
              </label>
              <input
                type="url"
                value={formData.facebook_url}
                onChange={(e) => handleChange('facebook_url', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                placeholder="https://facebook.com/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                <Instagram size={14} className="inline mr-1" />
                Instagram
              </label>
              <input
                type="url"
                value={formData.instagram_url}
                onChange={(e) => handleChange('instagram_url', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                placeholder="https://instagram.com/..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                WhatsApp
              </label>
              <input
                type="tel"
                value={formData.whatsapp_number}
                onChange={(e) => handleChange('whatsapp_number', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                placeholder="+225..."
              />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Truck className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold text-[var(--text-primary)]">Options</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-3 border border-[var(--border-light)] rounded-lg cursor-pointer hover:bg-[var(--bg-secondary)]">
              <input
                type="checkbox"
                checked={formData.delivery_enabled}
                onChange={(e) => handleChange('delivery_enabled', e.target.checked)}
                className="w-4 h-4 text-emerald-500 rounded"
              />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Livraison</p>
                <p className="text-xs text-[var(--text-tertiary)]">Livrer les commandes</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-[var(--border-light)] rounded-lg cursor-pointer hover:bg-[var(--bg-secondary)]">
              <input
                type="checkbox"
                checked={formData.pickup_enabled}
                onChange={(e) => handleChange('pickup_enabled', e.target.checked)}
                className="w-4 h-4 text-emerald-500 rounded"
              />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Retrait en magasin</p>
                <p className="text-xs text-[var(--text-tertiary)]">Click & collect</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-[var(--border-light)] rounded-lg cursor-pointer hover:bg-[var(--bg-secondary)]">
              <input
                type="checkbox"
                checked={formData.guest_checkout}
                onChange={(e) => handleChange('guest_checkout', e.target.checked)}
                className="w-4 h-4 text-emerald-500 rounded"
              />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Invités</p>
                <p className="text-xs text-[var(--text-tertiary)]">Achats sans compte</p>
              </div>
            </label>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold text-[var(--text-primary)]">Paiement</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 border border-[var(--border-light)] rounded-lg cursor-pointer hover:bg-[var(--bg-secondary)]">
              <input
                type="checkbox"
                checked={formData.cinetpay_enabled}
                onChange={(e) => handleChange('cinetpay_enabled', e.target.checked)}
                className="w-4 h-4 text-emerald-500 rounded"
              />
              <div>
                <p className="font-medium text-[var(--text-primary)]">CinetPay</p>
                <p className="text-xs text-[var(--text-tertiary)]">Mobile Money (Afrique de l'Ouest)</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-[var(--border-light)] rounded-lg cursor-pointer hover:bg-[var(--bg-secondary)]">
              <input
                type="checkbox"
                checked={formData.paystack_enabled}
                onChange={(e) => handleChange('paystack_enabled', e.target.checked)}
                className="w-4 h-4 text-emerald-500 rounded"
              />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Paystack</p>
                <p className="text-xs text-[var(--text-tertiary)]">Cartes & Mobile Money</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-[var(--border-light)] rounded-lg cursor-pointer hover:bg-[var(--bg-secondary)]">
              <input
                type="checkbox"
                checked={formData.mpesa_enabled}
                onChange={(e) => handleChange('mpesa_enabled', e.target.checked)}
                className="w-4 h-4 text-emerald-500 rounded"
              />
              <div>
                <p className="font-medium text-[var(--text-primary)]">M-Pesa</p>
                <p className="text-xs text-[var(--text-tertiary)]">Mobile Money (Afrique de l'Est)</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border border-[var(--border-light)] rounded-lg cursor-pointer hover:bg-[var(--bg-secondary)]">
              <input
                type="checkbox"
                checked={formData.cash_on_delivery}
                onChange={(e) => handleChange('cash_on_delivery', e.target.checked)}
                className="w-4 h-4 text-emerald-500 rounded"
              />
              <div>
                <p className="font-medium text-[var(--text-primary)]">Paiement à la livraison</p>
                <p className="text-xs text-[var(--text-tertiary)]">Cash on delivery</p>
              </div>
            </label>
          </div>
        </div>

        {/* SEO */}
        <div className="bg-[var(--bg-primary)] rounded-xl border border-[var(--border-light)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold text-[var(--text-primary)]">SEO</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Titre meta
              </label>
              <input
                type="text"
                value={formData.meta_title}
                onChange={(e) => handleChange('meta_title', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                maxLength={200}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Description meta
              </label>
              <textarea
                value={formData.meta_description}
                onChange={(e) => handleChange('meta_description', e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-light)] rounded-lg"
                rows={2}
                maxLength={500}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
