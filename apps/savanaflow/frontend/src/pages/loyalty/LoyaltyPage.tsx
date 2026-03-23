import { useState, useEffect } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  loyalty_points: number;
  loyalty_tier: 'STANDARD' | 'SILVER' | 'GOLD' | 'PLATINUM';
  total_spent: number;
  visit_count: number;
  last_visit: string | null;
  created_at: string;
}

interface LoyaltyTransaction {
  id: number;
  customer_id: number;
  customer: { name: string; phone: string };
  points: number;
  balance_after: number;
  type: 'EARN' | 'REDEEM' | 'ADJUST' | 'EXPIRE';
  description: string | null;
  created_at: string;
}

const tierColors = {
  STANDARD: 'bg-gray-100 text-gray-800',
  SILVER: 'bg-gray-200 text-gray-700',
  GOLD: 'bg-yellow-100 text-yellow-800',
  PLATINUM: 'bg-purple-100 text-purple-800',
};

const tierLabels = {
  STANDARD: 'Standard',
  SILVER: 'Argent',
  GOLD: 'Or',
  PLATINUM: 'Platine',
};

const typeColors = {
  EARN: 'text-green-600',
  REDEEM: 'text-red-600',
  ADJUST: 'text-blue-600',
  EXPIRE: 'text-orange-600',
};

const typeLabels = {
  EARN: 'Gagnés',
  REDEEM: 'Utilisés',
  ADJUST: 'Ajustement',
  EXPIRE: 'Expirés',
};

export default function LoyaltyPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'customers' | 'transactions'>('customers');
  const [search, setSearch] = useState('');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, transactionsRes] = await Promise.all([
        api.get('/customers', { params: { loyalty: true } }),
        api.get('/loyalty-transactions', { params: { limit: 50 } }),
      ]);
      setCustomers(customersRes.data.items || []);
      setTransactions(transactionsRes.data.items || []);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const adjustCustomerPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      await api.post(`/customers/${selectedCustomer.id}/loyalty/adjust`, {
        points: parseInt(adjustPoints),
        reason: adjustReason,
      });
      toast.success('Points ajustés avec succès');
      setShowAdjustModal(false);
      setSelectedCustomer(null);
      setAdjustPoints('');
      setAdjustReason('');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de l\'ajustement');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  // Filter customers by search
  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  // Calculate stats
  const totalPoints = customers.reduce((sum, c) => sum + c.loyalty_points, 0);
  const tierDistribution = {
    STANDARD: customers.filter((c) => c.loyalty_tier === 'STANDARD').length,
    SILVER: customers.filter((c) => c.loyalty_tier === 'SILVER').length,
    GOLD: customers.filter((c) => c.loyalty_tier === 'GOLD').length,
    PLATINUM: customers.filter((c) => c.loyalty_tier === 'PLATINUM').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programme Fidélité</h1>
          <p className="text-gray-600">Gérez les points et récompenses de vos clients</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Clients fidèles</div>
          <div className="text-2xl font-bold text-gray-900">{customers.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Points en circulation</div>
          <div className="text-2xl font-bold text-blue-600">{totalPoints.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Standard</div>
          <div className="text-2xl font-bold text-gray-500">{tierDistribution.STANDARD}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Or</div>
          <div className="text-2xl font-bold text-yellow-600">{tierDistribution.GOLD}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Platine</div>
          <div className="text-2xl font-bold text-purple-600">{tierDistribution.PLATINUM}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-6 py-4 font-medium ${activeTab === 'customers' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            >
              Clients fidèles
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-6 py-4 font-medium ${activeTab === 'transactions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
            >
              Historique des points
            </button>
          </nav>
        </div>

        {activeTab === 'customers' && (
          <div className="p-4">
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Rechercher un client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Customers Table */}
            {loading ? (
              <div className="p-8 text-center text-gray-500">Chargement...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Aucun client trouvé</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Téléphone</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Palier</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Points</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total achats</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Visites</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Dernière visite</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{customer.name}</td>
                      <td className="px-6 py-4 text-gray-600">{customer.phone || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${tierColors[customer.loyalty_tier]}`}>
                          {tierLabels[customer.loyalty_tier]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-blue-600">{customer.loyalty_points.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(customer.total_spent)}</td>
                      <td className="px-6 py-4 text-center text-gray-600">{customer.visit_count}</td>
                      <td className="px-6 py-4 text-center text-gray-600">
                        {customer.last_visit ? formatDate(customer.last_visit) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowAdjustModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Ajuster
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="p-4">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Chargement...</div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Aucune transaction</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Points</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Solde après</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-600">{formatDate(tx.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{tx.customer?.name}</div>
                        <div className="text-sm text-gray-500">{tx.customer?.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-medium ${typeColors[tx.type]}`}>
                          {typeLabels[tx.type]}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-medium ${typeColors[tx.type]}`}>
                        {tx.points > 0 ? '+' : ''}{tx.points}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900">{tx.balance_after}</td>
                      <td className="px-6 py-4 text-gray-600">{tx.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Adjust Points Modal */}
      {showAdjustModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Ajuster les points</h2>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="font-medium text-gray-900">{selectedCustomer.name}</div>
              <div className="text-sm text-gray-600">Points actuels: {selectedCustomer.loyalty_points}</div>
            </div>
            <form onSubmit={adjustCustomerPoints} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points à ajouter/retirer
                </label>
                <input
                  type="number"
                  required
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(e.target.value)}
                  placeholder="Ex: 100 ou -50"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Utilisez un nombre négatif pour retirer des points</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raison</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ex: Compensation, erreur..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                  Valider
                </button>
                <button type="button" onClick={() => setShowAdjustModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
