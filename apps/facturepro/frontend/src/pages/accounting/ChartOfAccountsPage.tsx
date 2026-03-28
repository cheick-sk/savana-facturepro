import { useState, useEffect } from 'react'
import { Plus, Upload, Search, FileText, X } from 'lucide-react'
import { useAccountingStore, Account } from '../../store/accounting'
import AccountTree from '../../components/accounting/AccountTree'

export default function ChartOfAccountsPage() {
  const {
    accountsTree,
    journals,
    loading,
    fetchAccountsTree,
    fetchJournals,
    importOhadaAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
  } = useAccountingStore()
  
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    number: '',
    name: '',
    account_type: 'asset' as 'asset' | 'liability' | 'equity' | 'income' | 'expense',
    category: 'classe_1',
    parent_id: null as number | null,
    allow_manual_entry: true,
  })
  
  useEffect(() => {
    fetchAccountsTree()
    fetchJournals()
  }, [fetchAccountsTree, fetchJournals])
  
  // Filter accounts by search
  const filterAccounts = (accounts: Account[], search: string): Account[] => {
    if (!search) return accounts
    
    return accounts
      .map(acc => {
        const matchesSearch = 
          acc.number.toLowerCase().includes(search.toLowerCase()) ||
          acc.name.toLowerCase().includes(search.toLowerCase())
        
        if (acc.children && acc.children.length > 0) {
          const filteredChildren = filterAccounts(acc.children, search)
          if (filteredChildren.length > 0 || matchesSearch) {
            return { ...acc, children: filteredChildren }
          }
        }
        
        return matchesSearch ? acc : null
      })
      .filter((acc): acc is Account => acc !== null)
  }
  
  const filteredAccounts = search
    ? filterAccounts(accountsTree, search)
    : selectedCategory
      ? accountsTree.filter(acc => acc.category === selectedCategory || (acc.children && acc.children.some(c => c.category === selectedCategory)))
      : accountsTree
  
  // Category info
  const categories = [
    { id: 'classe_1', name: 'Capitaux', color: '#6366f1', count: 0 },
    { id: 'classe_2', name: 'Immobilisations', color: '#8b5cf6', count: 0 },
    { id: 'classe_3', name: 'Stocks', color: '#d946ef', count: 0 },
    { id: 'classe_4', name: 'Tiers', color: '#ec4899', count: 0 },
    { id: 'classe_5', name: 'Trésorerie', color: '#f43f5e', count: 0 },
    { id: 'classe_6', name: 'Charges', color: '#f97316', count: 0 },
    { id: 'classe_7', name: 'Produits', color: '#22c55e', count: 0 },
    { id: 'classe_8', name: 'Comptes spéciaux', color: '#3b82f6', count: 0 },
  ]
  
  // Handle import OHADA
  const handleImport = async () => {
    setShowImportModal(false)
    await importOhadaAccounts()
  }
  
  // Handle create/update account
  const handleSubmit = async () => {
    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, formData)
      } else {
        await createAccount(formData)
      }
      setShowAccountModal(false)
      setEditingAccount(null)
      setFormData({
        number: '',
        name: '',
        account_type: 'asset',
        category: 'classe_1',
        parent_id: null,
        allow_manual_entry: true,
      })
    } catch (error) {
      console.error('Error saving account:', error)
    }
  }
  
  // Handle edit
  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setFormData({
      number: account.number,
      name: account.name,
      account_type: account.account_type,
      category: account.category,
      parent_id: account.parent_id,
      allow_manual_entry: account.allow_manual_entry,
    })
    setShowAccountModal(true)
  }
  
  // Handle delete
  const handleDelete = async (account: Account) => {
    if (confirm(`Supprimer le compte ${account.number} - ${account.name} ?`)) {
      try {
        await deleteAccount(account.id)
        if (selectedAccount?.id === account.id) {
          setSelectedAccount(null)
        }
      } catch (error) {
        console.error('Error deleting account:', error)
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Plan Comptable OHADA</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Gérez votre plan comptable conforme aux normes OHADA
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowImportModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <Upload size={16} />
            Importer OHADA
          </button>
          <button
            onClick={() => {
              setEditingAccount(null)
              setFormData({
                number: '',
                name: '',
                account_type: 'asset',
                category: 'classe_1',
                parent_id: null,
                allow_manual_entry: true,
              })
              setShowAccountModal(true)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              background: 'var(--primary-500)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            Nouveau Compte
          </button>
        </div>
      </div>
      
      {/* Search and filters */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un compte..."
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              border: '1px solid var(--border-light)',
              borderRadius: 8,
              fontSize: 14,
            }}
          />
        </div>
      </div>
      
      {/* Categories filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedCategory(null)}
          style={{
            padding: '6px 12px',
            background: selectedCategory === null ? 'var(--primary-500)' : 'var(--bg-secondary)',
            color: selectedCategory === null ? '#fff' : 'var(--text-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 6,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Tous
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            style={{
              padding: '6px 12px',
              background: selectedCategory === cat.id ? cat.color : 'var(--bg-secondary)',
              color: selectedCategory === cat.id ? '#fff' : 'var(--text-primary)',
              border: `1px solid ${selectedCategory === cat.id ? cat.color : 'var(--border-light)'}`,
              borderRadius: 6,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {cat.id.split('_')[1]}. {cat.name}
          </button>
        ))}
      </div>
      
      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
        {/* Account tree */}
        <div
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 120px 100px 120px',
              gap: 8,
              padding: '12px 16px',
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-light)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            <div>N°</div>
            <div>Libellé</div>
            <div style={{ textAlign: 'right' }}>Solde</div>
            <div style={{ textAlign: 'center' }}>Type</div>
            <div style={{ textAlign: 'center' }}>Actions</div>
          </div>
          
          {/* Tree */}
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
              Chargement...
            </div>
          ) : (
            <AccountTree
              accounts={filteredAccounts}
              selectedAccount={selectedAccount}
              onSelectAccount={setSelectedAccount}
              onEditAccount={handleEdit}
              onDeleteAccount={handleDelete}
            />
          )}
        </div>
        
        {/* Account details */}
        <div
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 12,
            padding: 16,
            height: 'fit-content',
          }}
        >
          {selectedAccount ? (
            <>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 0, marginBottom: 16 }}>
                Détails du compte
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Numéro</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 18, color: categories.find(c => c.id === selectedAccount.category)?.color }}>
                    {selectedAccount.number}
                  </div>
                </div>
                
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Libellé</div>
                  <div style={{ fontWeight: 500 }}>{selectedAccount.name}</div>
                </div>
                
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Type</div>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 12,
                      background: `${categories.find(c => c.id === selectedAccount.category)?.color}15`,
                      color: categories.find(c => c.id === selectedAccount.category)?.color,
                    }}
                  >
                    {selectedAccount.account_type === 'asset' ? 'Actif' :
                     selectedAccount.account_type === 'liability' ? 'Passif' :
                     selectedAccount.account_type === 'equity' ? 'Capitaux propres' :
                     selectedAccount.account_type === 'income' ? 'Produits' : 'Charges'}
                  </span>
                </div>
                
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Classe</div>
                  <div>{selectedAccount.category.replace('classe_', 'Classe ')}</div>
                </div>
                
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Solde</div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>
                    {selectedAccount.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Totaux</div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Débit: </span>
                      <span>{selectedAccount.debit_balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Crédit: </span>
                      <span>{selectedAccount.credit_balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  {!selectedAccount.is_system && (
                    <>
                      <button
                        onClick={() => handleEdit(selectedAccount)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 6,
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(selectedAccount)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: 'var(--danger-50)',
                          color: 'var(--danger-600)',
                          border: '1px solid var(--danger-200)',
                          borderRadius: 6,
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 40 }}>
              <FileText size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
              <p>Sélectionnez un compte pour voir les détails</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Import Modal */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setShowImportModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-primary)',
              borderRadius: 12,
              padding: 24,
              maxWidth: 500,
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Importer le Plan Comptable OHADA</h3>
              <button onClick={() => setShowImportModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              Cette action va importer le Plan Comptable Général OHADA complet avec toutes les 8 classes de comptes.
              Les comptes existants seront préservés.
            </p>
            
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 14, marginBottom: 8 }}>Classes de comptes incluses:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {categories.map(cat => (
                  <div key={cat.id} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    <span style={{ color: cat.color, fontWeight: 600 }}>{cat.id.split('_')[1]}.</span> {cat.name}
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowImportModal(false)}
                style={{
                  padding: '10px 20px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleImport}
                style={{
                  padding: '10px 20px',
                  background: 'var(--primary-500)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Importer
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Account Modal */}
      {showAccountModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setShowAccountModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-primary)',
              borderRadius: 12,
              padding: 24,
              maxWidth: 500,
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>
                {editingAccount ? 'Modifier le compte' : 'Nouveau compte'}
              </h3>
              <button onClick={() => setShowAccountModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                  Numéro de compte *
                </label>
                <input
                  type="text"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  placeholder="Ex: 707"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                  Libellé *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Ventes de marchandises"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                    Type de compte
                  </label>
                  <select
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border-light)',
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                  >
                    <option value="asset">Actif</option>
                    <option value="liability">Passif</option>
                    <option value="equity">Capitaux propres</option>
                    <option value="income">Produits</option>
                    <option value="expense">Charges</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
                    Classe
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border-light)',
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.id.split('_')[1]}. {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.allow_manual_entry}
                    onChange={(e) => setFormData({ ...formData, allow_manual_entry: e.target.checked })}
                  />
                  <span style={{ fontSize: 14 }}>Autoriser les écritures manuelles</span>
                </label>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                onClick={() => setShowAccountModal(false)}
                style={{
                  padding: '10px 20px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.number || !formData.name}
                style={{
                  padding: '10px 20px',
                  background: formData.number && formData.name ? 'var(--primary-500)' : 'var(--text-tertiary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: formData.number && formData.name ? 'pointer' : 'not-allowed',
                }}
              >
                {editingAccount ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
