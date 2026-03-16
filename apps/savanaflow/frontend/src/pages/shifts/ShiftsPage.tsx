import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

interface Shift {
  id: number;
  store_id: number;
  store: { name: string };
  user_id: number;
  user: { first_name: string; last_name: string };
  opened_at: string;
  closed_at: string | null;
  opening_cash: number;
  closing_cash: number | null;
  expected_cash: number | null;
  cash_difference: number | null;
  total_sales: number;
  total_refunds: number;
  sales_count: number;
  status: 'OPEN' | 'CLOSED';
  notes: string | null;
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  
  const [openForm, setOpenForm] = useState({
    store_id: '',
    opening_cash: '0',
  });
  
  const [closeForm, setCloseForm] = useState({
    closing_cash: '0',
    notes: '',
  });

  useEffect(() => {
    fetchShifts();
    fetchStores();
  }, []);

  const fetchShifts = async () => {
    try {
      const response = await api.get('/shifts');
      setShifts(response.data.items || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des shifts');
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await api.get('/stores');
      setStores(response.data.items || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const openShift = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await api.post('/shifts/open', {
        store_id: parseInt(openForm.store_id),
        opening_cash: parseFloat(openForm.opening_cash),
      });
      toast.success('Shift ouvert avec succès');
      setShowOpenModal(false);
      setOpenForm({ store_id: '', opening_cash: '0' });
      fetchShifts();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ouverture du shift');
    }
  };

  const closeShift = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedShift) return;
    
    try {
      await api.post(`/shifts/${selectedShift.id}/close`, {
        closing_cash: parseFloat(closeForm.closing_cash),
        notes: closeForm.notes,
      });
      toast.success('Shift fermé avec succès');
      setShowCloseModal(false);
      setSelectedShift(null);
      setCloseForm({ closing_cash: '0', notes: '' });
      fetchShifts();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la fermeture du shift');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const activeShift = shifts.find((s) => s.status === 'OPEN');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caisses / Shifts</h1>
          <p className="text-gray-600">Gérez les ouvertures et fermetures de caisse</p>
        </div>
        {!activeShift && (
          <button
            onClick={() => setShowOpenModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Ouvrir une caisse
          </button>
        )}
      </div>

      {/* Active Shift Card */}
      {activeShift && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm opacity-80">Caisse active</div>
              <div className="text-2xl font-bold">{activeShift.store?.name}</div>
              <div className="text-sm opacity-80 mt-1">
                Ouverte par {activeShift.user?.first_name} {activeShift.user?.last_name}
              </div>
              <div className="text-sm opacity-80">
                Depuis {formatDateTime(activeShift.opened_at)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-80">Fonds de caisse</div>
              <div className="text-2xl font-bold">{formatCurrency(activeShift.opening_cash)}</div>
              <div className="mt-4 space-y-1">
                <div className="text-sm">
                  Ventes: {formatCurrency(activeShift.total_sales)} ({activeShift.sales_count})
                </div>
                {activeShift.total_refunds > 0 && (
                  <div className="text-sm">
                    Remboursements: {formatCurrency(activeShift.total_refunds)}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedShift(activeShift);
                  setShowCloseModal(true);
                }}
                className="mt-4 bg-white text-green-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100"
              >
                Fermer la caisse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shifts History */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Historique des shifts</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : shifts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucun shift enregistré</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Magasin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Caissier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ouvert le</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fermé le</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Fonds initial</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ventes</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Écart</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {shifts.map((shift) => (
                <tr key={shift.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{shift.store?.name}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {shift.user?.first_name} {shift.user?.last_name}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{formatDateTime(shift.opened_at)}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {shift.closed_at ? formatDateTime(shift.closed_at) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(shift.opening_cash)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-gray-900 font-medium">{formatCurrency(shift.total_sales)}</div>
                    <div className="text-sm text-gray-500">{shift.sales_count} ventes</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {shift.cash_difference !== null ? (
                      <span className={shift.cash_difference >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {shift.cash_difference >= 0 ? '+' : ''}{formatCurrency(shift.cash_difference)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      shift.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {shift.status === 'OPEN' ? 'Ouvert' : 'Fermé'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Open Shift Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Ouvrir une caisse</h2>
            <form onSubmit={openShift} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Magasin *</label>
                <select
                  required
                  value={openForm.store_id}
                  onChange={(e) => setOpenForm({...openForm, store_id: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Sélectionner un magasin</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fonds de caisse initial</label>
                <input
                  type="number"
                  step="1"
                  value={openForm.opening_cash}
                  onChange={(e) => setOpenForm({...openForm, opening_cash: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
                  Ouvrir
                </button>
                <button type="button" onClick={() => setShowOpenModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseModal && selectedShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Fermer la caisse</h2>
            
            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Fonds initial:</div>
                <div className="text-right font-medium">{formatCurrency(selectedShift.opening_cash)}</div>
                <div>Ventes:</div>
                <div className="text-right font-medium">{formatCurrency(selectedShift.total_sales)}</div>
                <div>Remboursements:</div>
                <div className="text-right font-medium">{formatCurrency(selectedShift.total_refunds)}</div>
                <div className="border-t pt-2 mt-2 font-medium">Attendu:</div>
                <div className="text-right font-medium border-t pt-2 mt-2">
                  {formatCurrency(selectedShift.opening_cash + selectedShift.total_sales - selectedShift.total_refunds)}
                </div>
              </div>
            </div>

            <form onSubmit={closeShift} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant réel en caisse *</label>
                <input
                  type="number"
                  required
                  step="1"
                  value={closeForm.closing_cash}
                  onChange={(e) => setCloseForm({...closeForm, closing_cash: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={closeForm.notes}
                  onChange={(e) => setCloseForm({...closeForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={2}
                  placeholder="Écart, incident..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700">
                  Fermer la caisse
                </button>
                <button type="button" onClick={() => setShowCloseModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200">
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
