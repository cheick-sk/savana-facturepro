import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Filter, Download, Eye, Send, MoreHorizontal,
  FileText, Calendar, ChevronLeft, ChevronRight, X, Trash2,
  Printer, Mail, Copy, CheckCircle, Clock, AlertTriangle, FileCheck
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Modal, ModalFooter } from '../../components/ui/Modal'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table'
import { Skeleton } from '../../components/ui/Skeleton'
import { Dropdown, DropdownItem, DropdownSeparator } from '../../components/ui/Dropdown'
import { Select, SelectItem } from '../../components/ui/Select'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n))
const fmtCurrency = (n: number, currency: string = 'XOF') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; icon: React.ReactNode }> = {
  DRAFT:   { label: 'Brouillon', variant: 'default', icon: <FileText className="w-3.5 h-3.5" /> },
  SENT:    { label: 'Envoyée', variant: 'info', icon: <Mail className="w-3.5 h-3.5" /> },
  PAID:    { label: 'Payée', variant: 'success', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  OVERDUE: { label: 'En retard', variant: 'danger', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
}

interface Invoice {
  id: number
  invoice_number: string
  customer: { id: number; name: string }
  status: string
  total_amount: number
  currency: string
  due_date: string | null
  created_at: string
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [form, setForm] = useState({ customer_id: '', currency: 'XOF', notes: '', due_date: '' })
  const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: 0, tax_rate: 0, product_id: null as number | null }])
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/invoices', { params: { page, size: 20, status: statusFilter || undefined } })
      setInvoices(data.items || [])
      setTotal(data.total || 0)
    } catch (err) {
      // Demo data if API fails
      setInvoices([
        { id: 1, invoice_number: 'INV-2024-001', customer: { id: 1, name: 'Acme Corp' }, status: 'PAID', total_amount: 1500000, currency: 'XOF', due_date: '2024-02-15', created_at: '2024-01-15' },
        { id: 2, invoice_number: 'INV-2024-002', customer: { id: 2, name: 'Tech Solutions SARL' }, status: 'SENT', total_amount: 750000, currency: 'XOF', due_date: '2024-02-20', created_at: '2024-01-18' },
        { id: 3, invoice_number: 'INV-2024-003', customer: { id: 3, name: 'Global Trade SA' }, status: 'OVERDUE', total_amount: 2300000, currency: 'XOF', due_date: '2024-01-10', created_at: '2024-01-01' },
        { id: 4, invoice_number: 'INV-2024-004', customer: { id: 4, name: 'Digital Services' }, status: 'DRAFT', total_amount: 450000, currency: 'XOF', due_date: null, created_at: '2024-01-20' },
      ])
      setTotal(4)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, statusFilter])

  useEffect(() => {
    api.get('/customers', { params: { size: 100 } }).then(r => setCustomers(r.data.items || [])).catch(() => {})
    api.get('/products', { params: { size: 100 } }).then(r => setProducts(r.data.items || [])).catch(() => {})
  }, [])

  const addItem = () => setItems(i => [...i, { description: '', quantity: 1, unit_price: 0, tax_rate: 0, product_id: null }])
  const updateItem = (idx: number, field: string, val: any) => setItems(items.map((it, i) => i === idx ? { ...it, [field]: val } : it))
  const removeItem = (idx: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)) }

  const selectProduct = (idx: number, pid: number) => {
    const p = products.find(p => p.id === pid)
    if (p) {
      updateItem(idx, 'product_id', pid)
      updateItem(idx, 'description', p.name)
      updateItem(idx, 'unit_price', p.unit_price)
      updateItem(idx, 'tax_rate', p.tax_rate)
    }
  }

  const createInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        customer_id: +form.customer_id,
        currency: form.currency,
        notes: form.notes || undefined,
        due_date: form.due_date || undefined,
        items: items.map(it => ({ ...it, quantity: +it.quantity, unit_price: +it.unit_price, tax_rate: +it.tax_rate })),
      }
      const { data } = await api.post('/invoices', payload)
      toast.success(`Facture ${data.invoice_number} créée`)
      setShowCreate(false)
      setItems([{ description: '', quantity: 1, unit_price: 0, tax_rate: 0, product_id: null }])
      setForm({ customer_id: '', currency: 'XOF', notes: '', due_date: '' })
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur lors de la création')
    }
  }

  const sendInvoice = async (id: number) => {
    try {
      await api.post(`/invoices/${id}/send`)
      toast.success('Facture envoyée par email')
      load()
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Erreur envoi')
    }
  }

  const downloadPdf = (id: number) => window.open(`/api/v1/invoices/${id}/pdf`, '_blank')

  const subtotal = items.reduce((s, i) => s + (+i.quantity) * (+i.unit_price), 0)
  const tax = items.reduce((s, i) => s + (+i.quantity) * (+i.unit_price) * (+i.tax_rate) / 100, 0)

  const filteredInvoices = invoices.filter(inv =>
    !searchQuery ||
    inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Factures</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{total} facture(s) au total</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreate(true)}>
          Nouvelle facture
        </Button>
      </motion.div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Rechercher par numéro ou client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>

            {/* Status filter tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {['', 'DRAFT', 'SENT', 'PAID', 'OVERDUE'].map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1) }}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    statusFilter === s
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {s === '' ? 'Toutes' : STATUS_CONFIG[s]?.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal open={showCreate} onOpenChange={setShowCreate} title="Nouvelle facture" size="xl">
        <form onSubmit={createInvoice} className="space-y-6">
          {/* Customer & Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Client *
              </label>
              <select
                value={form.customer_id}
                onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                required
                className="w-full px-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              >
                <option value="">-- Sélectionner --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Input label="Devise" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            <Input label="Échéance" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>

          {/* Invoice Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lignes de facturation</label>
              <Button type="button" variant="ghost" size="sm" onClick={addItem} icon={<Plus className="w-4 h-4" />}>
                Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-12 gap-3 items-end"
                >
                  <div className="col-span-4">
                    {idx === 0 && <label className="block text-xs text-gray-500 mb-1">Description</label>}
                    <input
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      placeholder="Description"
                      required
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="block text-xs text-gray-500 mb-1">Qté</label>}
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="block text-xs text-gray-500 mb-1">Prix unit.</label>}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    />
                  </div>
                  <div className="col-span-1">
                    {idx === 0 && <label className="block text-xs text-gray-500 mb-1">TVA %</label>}
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={item.tax_rate}
                      onChange={(e) => updateItem(idx, 'tax_rate', e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="block text-xs text-gray-500 mb-1">Total</label>}
                    <div className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {fmt((+item.quantity) * (+item.unit_price))}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <div className="text-sm space-y-1">
                <div className="flex justify-between gap-8">
                  <span className="text-gray-500">Sous-total:</span>
                  <span className="font-medium">{fmt(subtotal)} {form.currency}</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span className="text-gray-500">TVA:</span>
                  <span className="font-medium">{fmt(tax)} {form.currency}</span>
                </div>
                <div className="flex justify-between gap-8 text-lg font-bold text-gray-900 dark:text-gray-100">
                  <span>Total:</span>
                  <span>{fmt(subtotal + tax)} {form.currency}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes optionnelles..." />

          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Annuler</Button>
            <Button type="submit" variant="primary">Créer la facture</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(7)].map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">Aucune facture trouvée</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((inv, index) => {
                const status = STATUS_CONFIG[inv.status] || STATUS_CONFIG.DRAFT
                return (
                  <motion.tr
                    key={inv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <TableCell>
                      <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100">
                        {inv.invoice_number}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-700 dark:text-gray-300">{inv.customer?.name || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant} dot>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {fmtCurrency(inv.total_amount, inv.currency)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-500 dark:text-gray-400">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('fr-FR') : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-gray-500 dark:text-gray-400">
                        {new Date(inv.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          icon={<Eye className="w-4 h-4" />}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadPdf(inv.id)}
                          icon={<Download className="w-4 h-4" />}
                        />
                        {inv.status === 'DRAFT' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => sendInvoice(inv.id)}
                            icon={<Send className="w-4 h-4" />}
                            className="text-primary-500 hover:text-primary-600"
                          />
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                )
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {page} sur {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                icon={<ChevronLeft className="w-4 h-4" />}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
