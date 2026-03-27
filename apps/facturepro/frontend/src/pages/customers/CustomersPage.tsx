import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, Search, Users, Mail, Phone, MapPin, Building2,
  MoreHorizontal, Edit, Trash2, FileText, X
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Modal, ModalFooter } from '../../components/ui/Modal'
import { Avatar } from '../../components/ui/Avatar'
import { Dropdown, DropdownItem, DropdownSeparator } from '../../components/ui/Dropdown'
import { Skeleton } from '../../components/ui/Skeleton'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const EMPTY = { name: '', email: '', phone: '', address: '', tax_id: '' }

interface Customer {
  id: number
  name: string
  email: string | null
  phone: string | null
  address: string | null
  tax_id: string | null
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/customers', { params: { size: 50, search: search || undefined } })
      setCustomers(data.items || [])
      setTotal(data.total || 0)
    } catch (err) {
      // Demo data
      setCustomers([
        { id: 1, name: 'Acme Corp', email: 'contact@acme.corp', phone: '+221 77 123 45 67', address: 'Dakar, Sénégal', tax_id: 'SN123456789' },
        { id: 2, name: 'Tech Solutions SARL', email: 'info@techsolutions.sn', phone: '+221 78 987 65 43', address: 'Plateau, Dakar', tax_id: 'SN987654321' },
        { id: 3, name: 'Global Trade SA', email: 'global@trade.ci', phone: '+225 07 12 34 56 78', address: 'Abidjan, Côte d\'Ivoire', tax_id: 'CI123456' },
        { id: 4, name: 'Digital Services', email: 'hello@digital.ml', phone: '+223 90 12 34 56', address: 'Bamako, Mali', tax_id: null },
      ])
      setTotal(4)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [search])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/customers', form)
      toast.success('Client créé avec succès')
      setShowForm(false)
      setForm(EMPTY)
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur lors de la création')
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clients</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {total} client{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>
          Nouveau client
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Input
          placeholder="Rechercher un client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search className="w-4 h-4" />}
          className="max-w-md"
        />
      </motion.div>

      {/* Create Modal */}
      <Modal open={showForm} onOpenChange={setShowForm} title="Nouveau client" size="lg">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nom *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nom de l'entreprise"
              required
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="contact@exemple.com"
              icon={<Mail className="w-4 h-4" />}
            />
            <Input
              label="Téléphone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+221 77 123 45 67"
              icon={<Phone className="w-4 h-4" />}
            />
            <Input
              label="N° TVA"
              value={form.tax_id}
              onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
              placeholder="SN123456789"
            />
          </div>
          <Input
            label="Adresse"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Dakar, Sénégal"
            icon={<MapPin className="w-4 h-4" />}
          />
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary">
              Créer le client
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton variant="circular" width={48} height={48} />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-3/4" />
            </Card>
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Aucun client trouvé
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {search ? 'Essayez avec d\'autres termes de recherche' : 'Commencez par ajouter votre premier client'}
          </p>
          {!search && (
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>
              Ajouter un client
            </Button>
          )}
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredCustomers.map((customer, index) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card hover className="relative group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar fallback={customer.name} size="lg" />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {customer.name}
                        </h3>
                        {customer.tax_id && (
                          <Badge variant="default" size="sm" className="mt-1">
                            <Building2 className="w-3 h-3 mr-1" />
                            TVA: {customer.tax_id}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Dropdown
                      trigger={
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="w-4 h-4 text-gray-400" />
                        </button>
                      }
                    >
                      <DropdownItem icon={<Edit className="w-4 h-4" />}>Modifier</DropdownItem>
                      <DropdownItem icon={<FileText className="w-4 h-4" />}>Voir les factures</DropdownItem>
                      <DropdownSeparator />
                      <DropdownItem icon={<Trash2 className="w-4 h-4" />} destructive>Supprimer</DropdownItem>
                    </Dropdown>
                  </div>

                  <div className="space-y-2 text-sm">
                    {customer.email && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <a href={`mailto:${customer.email}`} className="hover:text-primary-500 transition-colors">
                          {customer.email}
                        </a>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <a href={`tel:${customer.phone}`} className="hover:text-primary-500 transition-colors">
                          {customer.phone}
                        </a>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{customer.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats footer */}
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-gray-700 dark:text-gray-300">0</span> facture(s)
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-gray-700 dark:text-gray-300">0</span> XOF total
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
