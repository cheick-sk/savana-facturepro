import { useEffect, useState } from 'react'
import { Plus, Store, MapPin, Phone, Check } from 'lucide-react'
import api from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardContent } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Modal, ModalFooter } from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

export default function StoresPage() {
  const [stores, setStores] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', phone: '' })
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/stores')
      .then(r => setStores(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/stores', form)
      toast.success('Magasin créé')
      setShowForm(false)
      setForm({ name: '', address: '', phone: '' })
      load()
    } catch {
      toast.error('Erreur lors de la création')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
            Magasins
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gérez vos points de vente
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} icon={<Plus className="w-4 h-4" />}>
          Nouveau magasin
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total magasins</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stores.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Actifs</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stores.filter(s => s.is_active).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Inactifs</p>
            <p className="text-2xl font-bold text-gray-400">
              {stores.filter(s => !s.is_active).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Ce mois</p>
            <p className="text-2xl font-bold text-secondary-600 dark:text-secondary-400">
              +{stores.filter(s => {
                const created = new Date(s.created_at)
                const now = new Date()
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
              }).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stores Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {stores.map((store, index) => (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card hover className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary-500 to-green-600 flex items-center justify-center shadow-lg">
                        <Store className="w-6 h-6 text-white" />
                      </div>
                      <Badge variant={store.is_active ? 'success' : 'default'} dot>
                        {store.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {store.name}
                    </h3>

                    <div className="mt-4 space-y-2">
                      {store.address && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{store.address}</span>
                        </div>
                      )}
                      {store.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span>{store.phone}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {!loading && stores.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Store className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg text-gray-500 dark:text-gray-400">Aucun magasin</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Créez votre premier point de vente pour commencer
            </p>
          </CardContent>
        </Card>
      )}

      {/* Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)}>
        <form onSubmit={submit}>
          <div className="px-6 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Nouveau magasin
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <Input
              label="Nom *"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Mon Magasin"
            />
            <Input
              label="Adresse"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="Adresse du magasin"
            />
            <Input
              label="Téléphone"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="+221 77..."
            />
          </div>
          <ModalFooter>
            <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
            <Button type="submit">
              Créer le magasin
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
