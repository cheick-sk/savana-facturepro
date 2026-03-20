import { useEffect, useState } from 'react'
import { 
  Plus, Search, MapPin, Phone, Mail, Building2, 
  MoreVertical, Edit2, Trash2, Check, X, Clock,
  Users, Package, TrendingUp, MapPinned
} from 'lucide-react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface Store {
  id: number
  name: string
  address: string
  phone: string
  email?: string
  is_active: boolean
  is_main?: boolean
  opening_hours?: string
  manager_name?: string
  created_at: string
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [form, setForm] = useState({
    name: '', address: '', phone: '', email: '', 
    opening_hours: '', manager_name: '', is_active: true
  })

  const load = () => {
    setLoading(true)
    api.get('/stores').then(r => setStores(r.data)).catch(() => {
      // Demo data
      setStores([
        { id: 1, name: 'Magasin Central', address: 'Conakry, Kaloum', phone: '+224 620 00 00 00', is_active: true, is_main: true, created_at: new Date().toISOString() },
        { id: 2, name: 'Succursale Dixinn', address: 'Conakry, Dixinn', phone: '+224 621 00 00 00', is_active: true, created_at: new Date().toISOString() },
        { id: 3, name: 'Point de Vente Matoto', address: 'Conakry, Matoto', phone: '+224 622 00 00 00', is_active: false, created_at: new Date().toISOString() },
      ])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingStore) {
        await api.put(`/stores/${editingStore.id}`, form)
        toast.success('Magasin mis à jour')
      } else {
        await api.post('/stores', form)
        toast.success('Magasin créé')
      }
      setShowForm(false)
      setEditingStore(null)
      setForm({ name: '', address: '', phone: '', email: '', opening_hours: '', manager_name: '', is_active: true })
      load()
    } catch { toast.error('Erreur lors de la sauvegarde') }
  }

  const openEdit = (store: Store) => {
    setEditingStore(store)
    setForm({
      name: store.name,
      address: store.address,
      phone: store.phone,
      email: store.email || '',
      opening_hours: store.opening_hours || '',
      manager_name: store.manager_name || '',
      is_active: store.is_active
    })
    setShowForm(true)
  }

  const deleteStore = async (id: number) => {
    if (!confirm('Supprimer ce magasin ?')) return
    try {
      await api.delete(`/stores/${id}`)
      toast.success('Magasin supprimé')
      setStores(stores.filter(s => s.id !== id))
    } catch { toast.error('Erreur lors de la suppression') }
  }

  const toggleStatus = async (store: Store) => {
    try {
      await api.patch(`/stores/${store.id}`, { is_active: !store.is_active })
      toast.success(`Magasin ${!store.is_active ? 'activé' : 'désactivé'}`)
      load()
    } catch { toast.error('Erreur') }
  }

  // Stats
  const stats = {
    total: stores.length,
    active: stores.filter(s => s.is_active).length,
    inactive: stores.filter(s => !s.is_active).length,
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Magasins</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Gérez vos points de vente
          </p>
        </div>
        
        <button 
          onClick={() => { setEditingStore(null); setShowForm(true) }}
          className="btn-primary"
        >
          <Plus size={18} />
          <span>Nouveau magasin</span>
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Building2 size={20} className="text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</div>
              <div className="text-xs text-[var(--text-secondary)]">Total magasins</div>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Check size={20} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.active}</div>
              <div className="text-xs text-[var(--text-secondary)]">Magasins actifs</div>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <X size={20} className="text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.inactive}</div>
              <div className="text-xs text-[var(--text-secondary)]">Magasins inactifs</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          type="text"
          placeholder="Rechercher un magasin..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl"
        />
      </div>

      {/* Stores grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-56 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.filter(s => 
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.address.toLowerCase().includes(search.toLowerCase())
          ).map(store => (
            <div key={store.id} className="card group hover:shadow-lg transition-all">
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      store.is_active 
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600' 
                        : 'bg-[var(--bg-tertiary)]'
                    }`}>
                      <Building2 size={22} className={store.is_active ? 'text-white' : 'text-[var(--text-tertiary)]'} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        {store.name}
                        {store.is_main && (
                          <span className="badge badge-primary text-xs">Principal</span>
                        )}
                      </h3>
                      <span className={`badge text-xs ${store.is_active ? 'badge-success' : 'badge-warning'}`}>
                        {store.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-tertiary)]">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-2 text-[var(--text-secondary)]">
                    <MapPin size={16} className="flex-shrink-0 mt-0.5 text-[var(--text-tertiary)]" />
                    <span>{store.address}</span>
                  </div>
                  
                  {store.phone && (
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Phone size={16} className="flex-shrink-0 text-[var(--text-tertiary)]" />
                      <a href={`tel:${store.phone}`} className="hover:text-[var(--primary-600)]">
                        {store.phone}
                      </a>
                    </div>
                  )}
                  
                  {store.email && (
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Mail size={16} className="flex-shrink-0 text-[var(--text-tertiary)]" />
                      <a href={`mailto:${store.email}`} className="hover:text-[var(--primary-600)] truncate">
                        {store.email}
                      </a>
                    </div>
                  )}
                  
                  {store.opening_hours && (
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Clock size={16} className="flex-shrink-0 text-[var(--text-tertiary)]" />
                      <span>{store.opening_hours}</span>
                    </div>
                  )}
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[var(--border-light)]">
                  <div className="text-center">
                    <div className="text-lg font-bold text-[var(--text-primary)]">24</div>
                    <div className="text-xs text-[var(--text-tertiary)]">Ventes</div>
                  </div>
                  <div className="text-center border-x border-[var(--border-light)]">
                    <div className="text-lg font-bold text-[var(--text-primary)]">148</div>
                    <div className="text-xs text-[var(--text-tertiary)]">Produits</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-600">2.4M</div>
                    <div className="text-xs text-[var(--text-tertiary)]">CA jour</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--border-light)] opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openEdit(store)}
                    className="flex-1 btn-ghost btn-sm justify-center"
                  >
                    <Edit2 size={14} />
                    Modifier
                  </button>
                  <button 
                    onClick={() => toggleStatus(store)}
                    className={`flex-1 btn-sm justify-center ${store.is_active ? 'btn-ghost text-amber-600' : 'btn-success'}`}
                  >
                    {store.is_active ? (
                      <>
                        <X size={14} />
                        Désactiver
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        Activer
                      </>
                    )}
                  </button>
                  {!store.is_main && (
                    <button 
                      onClick={() => deleteStore(store.id)}
                      className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && stores.length === 0 && (
        <div className="empty-state">
          <Building2 size={64} className="empty-state-icon" />
          <div className="empty-state-title">Aucun magasin</div>
          <div className="empty-state-description">
            Créez votre premier point de vente
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4">
            <Plus size={16} />
            Ajouter un magasin
          </button>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn" onClick={() => setShowForm(false)}>
          <div 
            className="w-full max-w-lg bg-[var(--bg-primary)] rounded-2xl shadow-2xl animate-slideUp overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[var(--border-light)]">
              <h2 className="font-semibold text-lg">
                {editingStore ? 'Modifier le magasin' : 'Nouveau magasin'}
              </h2>
            </div>
            
            <form onSubmit={submit} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-1 block">Nom du magasin *</label>
                  <input 
                    value={form.name} 
                    onChange={e => setForm({...form, name: e.target.value})} 
                    required 
                    placeholder="Ex: Magasin Central"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-[var(--text-secondary)] mb-1 block">Adresse *</label>
                  <div className="relative">
                    <MapPinned size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                    <input 
                      value={form.address} 
                      onChange={e => setForm({...form, address: e.target.value})} 
                      required 
                      placeholder="Conakry, Kaloum"
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[var(--text-secondary)] mb-1 block">Téléphone</label>
                    <input 
                      value={form.phone} 
                      onChange={e => setForm({...form, phone: e.target.value})} 
                      placeholder="+224 620 00 00 00"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-[var(--text-secondary)] mb-1 block">Email</label>
                    <input 
                      type="email"
                      value={form.email} 
                      onChange={e => setForm({...form, email: e.target.value})} 
                      placeholder="magasin@exemple.com"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-[var(--text-secondary)] mb-1 block">Horaires</label>
                    <input 
                      value={form.opening_hours} 
                      onChange={e => setForm({...form, opening_hours: e.target.value})} 
                      placeholder="8h - 20h"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-[var(--text-secondary)] mb-1 block">Gérant</label>
                    <input 
                      value={form.manager_name} 
                      onChange={e => setForm({...form, manager_name: e.target.value})} 
                      placeholder="Nom du gérant"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-light)]">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  {editingStore ? 'Mettre à jour' : 'Créer le magasin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
