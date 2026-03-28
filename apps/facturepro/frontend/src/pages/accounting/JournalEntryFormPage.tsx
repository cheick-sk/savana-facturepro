import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, Save, ArrowLeft, AlertCircle } from 'lucide-react'
import { useAccountingStore, Account } from '../../store/accounting'

interface EntryLine {
  account_id: number
  account: Account | null
  description: string
  debit: number
  credit: number
  third_party_type: 'customer' | 'supplier' | null
  third_party_id: number | null
}

export default function JournalEntryFormPage() {
  const navigate = useNavigate()
  const {
    journals,
    fiscalYears,
    activeFiscalYear,
    accounts,
    loading,
    fetchJournals,
    fetchFiscalYears,
    fetchActiveFiscalYear,
    fetchAccounts,
    createEntry,
  } = useAccountingStore()

  const [formData, setFormData] = useState({
    journal_id: '',
    fiscal_year_id: '',
    entry_date: new Date().toISOString().split('T')[0],
    document_ref: '',
    description: '',
  })

  const [lines, setLines] = useState<EntryLine[]>([
    { account_id: 0, account: null, description: '', debit: 0, credit: 0, third_party_type: null, third_party_id: null },
    { account_id: 0, account: null, description: '', debit: 0, credit: 0, third_party_type: null, third_party_id: null },
  ])

  const [errors, setErrors] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showAccountSearch, setShowAccountSearch] = useState<number | null>(null)

  useEffect(() => {
    fetchJournals()
    fetchFiscalYears()
    fetchActiveFiscalYear()
    fetchAccounts()
  }, [fetchJournals, fetchFiscalYears, fetchActiveFiscalYear, fetchAccounts])

  useEffect(() => {
    if (activeFiscalYear && !formData.fiscal_year_id) {
      setFormData(prev => ({ ...prev, fiscal_year_id: activeFiscalYear.id.toString() }))
    }
  }, [activeFiscalYear])

  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0)
  const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01

  const filteredAccounts = searchTerm
    ? accounts.filter(acc =>
        acc.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : accounts

  const addLine = () => {
    setLines([...lines, {
      account_id: 0,
      account: null,
      description: '',
      debit: 0,
      credit: 0,
      third_party_type: null,
      third_party_id: null,
    }])
  }

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index))
    }
  }

  const updateLine = (index: number, field: keyof EntryLine, value: any) => {
    const newLines = [...lines]
    newLines[index] = { ...newLines[index], [field]: value }
    setLines(newLines)
  }

  const selectAccount = (index: number, account: Account) => {
    updateLine(index, 'account_id', account.id)
    updateLine(index, 'account', account)
    setShowAccountSearch(null)
    setSearchTerm('')
  }

  const validate = (): string[] => {
    const errs: string[] = []
    
    if (!formData.journal_id) errs.push('Le journal est obligatoire')
    if (!formData.fiscal_year_id) errs.push('L\'exercice est obligatoire')
    if (!formData.entry_date) errs.push('La date est obligatoire')
    if (!formData.description) errs.push('La description est obligatoire')
    
    if (lines.some(line => !line.account_id)) {
      errs.push('Toutes les lignes doivent avoir un compte')
    }
    
    if (!isBalanced) {
      errs.push('L\'écriture doit être équilibrée (Débit = Crédit)')
    }
    
    if (totalDebit === 0 && totalCredit === 0) {
      errs.push('L\'écriture ne peut pas être vide')
    }

    return errs
  }

  const handleSubmit = async () => {
    const validationErrors = validate()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    try {
      await createEntry({
        journal_id: parseInt(formData.journal_id),
        fiscal_year_id: parseInt(formData.fiscal_year_id),
        entry_date: formData.entry_date,
        document_ref: formData.document_ref || null,
        description: formData.description,
        lines: lines.map(line => ({
          account_id: line.account_id,
          description: line.description || null,
          debit: line.debit,
          credit: line.credit,
          third_party_type: line.third_party_type,
          third_party_id: line.third_party_id,
        })),
      })
      navigate('/accounting/entries')
    } catch (error: any) {
      setErrors([error.response?.data?.detail || 'Erreur lors de la création de l\'écriture'])
    }
  }

  const formatAmount = (value: number) => {
    return value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={() => navigate('/accounting/entries')}
          style={{
            padding: 8,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-light)',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Nouvelle écriture comptable</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Créez une écriture manuelle dans le journal
          </p>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div
          style={{
            padding: 16,
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            color: '#dc2626',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertCircle size={18} />
            <span style={{ fontWeight: 600 }}>Erreurs de validation</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 24 }}>
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Form */}
      <div
        style={{
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-light)',
          borderRadius: 12,
          padding: 24,
        }}
      >
        {/* Header fields */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
              Journal *
            </label>
            <select
              value={formData.journal_id}
              onChange={(e) => setFormData({ ...formData, journal_id: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-light)',
                borderRadius: 8,
                fontSize: 14,
              }}
            >
              <option value="">Sélectionner un journal</option>
              {journals.filter(j => j.is_active).map((j) => (
                <option key={j.id} value={j.id}>
                  {j.code} - {j.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
              Exercice *
            </label>
            <select
              value={formData.fiscal_year_id}
              onChange={(e) => setFormData({ ...formData, fiscal_year_id: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-light)',
                borderRadius: 8,
                fontSize: 14,
              }}
            >
              <option value="">Sélectionner un exercice</option>
              {fiscalYears.filter(fy => !fy.is_closed).map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
              Date *
            </label>
            <input
              type="date"
              value={formData.entry_date}
              onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
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
              Référence document
            </label>
            <input
              type="text"
              value={formData.document_ref}
              onChange={(e) => setFormData({ ...formData, document_ref: e.target.value })}
              placeholder="N° de facture, pièce..."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-light)',
                borderRadius: 8,
                fontSize: 14,
              }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
              Description *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description de l'écriture..."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-light)',
                borderRadius: 8,
                fontSize: 14,
              }}
            />
          </div>
        </div>

        {/* Lines */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Lignes de l'écriture</h3>
            <button
              onClick={addLine}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                background: 'var(--primary-50)',
                color: 'var(--primary-600)',
                border: '1px solid var(--primary-200)',
                borderRadius: 6,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              Ajouter une ligne
            </button>
          </div>

          {/* Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr 150px 150px 40px',
              gap: 8,
              padding: '8px 12px',
              background: 'var(--bg-secondary)',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: 8,
            }}
          >
            <div>Compte</div>
            <div>Libellé</div>
            <div style={{ textAlign: 'right' }}>Débit</div>
            <div style={{ textAlign: 'right' }}>Crédit</div>
            <div></div>
          </div>

          {/* Rows */}
          {lines.map((line, index) => (
            <div
              key={index}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr 150px 150px 40px',
                gap: 8,
                padding: '8px 0',
                alignItems: 'center',
              }}
            >
              {/* Account selector */}
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={line.account ? `${line.account.number}` : ''}
                  onClick={() => setShowAccountSearch(showAccountSearch === index ? null : index)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setShowAccountSearch(index)
                  }}
                  placeholder="Rechercher..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 6,
                    fontSize: 13,
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                  }}
                />
                {showAccountSearch === index && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 6,
                      maxHeight: 200,
                      overflowY: 'auto',
                      zIndex: 10,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  >
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Rechercher un compte..."
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: 'none',
                        borderBottom: '1px solid var(--border-light)',
                        fontSize: 13,
                      }}
                    />
                    {filteredAccounts.slice(0, 20).map((acc) => (
                      <div
                        key={acc.id}
                        onClick={() => selectAccount(index, acc)}
                        style={{
                          padding: '8px 10px',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border-light)',
                          fontSize: 12,
                        }}
                      >
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{acc.number}</span>
                        <span style={{ marginLeft: 8, color: 'var(--text-secondary)' }}>{acc.name}</span>
                      </div>
                    ))}
                    {filteredAccounts.length === 0 && (
                      <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
                        Aucun compte trouvé
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <input
                type="text"
                value={line.description}
                onChange={(e) => updateLine(index, 'description', e.target.value)}
                placeholder="Libellé..."
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--border-light)',
                  borderRadius: 6,
                  fontSize: 13,
                }}
              />

              {/* Debit */}
              <input
                type="number"
                value={line.debit || ''}
                onChange={(e) => updateLine(index, 'debit', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                step="0.01"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--border-light)',
                  borderRadius: 6,
                  fontSize: 13,
                  textAlign: 'right',
                  fontFamily: 'monospace',
                }}
              />

              {/* Credit */}
              <input
                type="number"
                value={line.credit || ''}
                onChange={(e) => updateLine(index, 'credit', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                step="0.01"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--border-light)',
                  borderRadius: 6,
                  fontSize: 13,
                  textAlign: 'right',
                  fontFamily: 'monospace',
                }}
              />

              {/* Delete */}
              <button
                onClick={() => removeLine(index)}
                disabled={lines.length <= 2}
                style={{
                  padding: 6,
                  background: lines.length <= 2 ? 'var(--bg-secondary)' : '#fee2e2',
                  border: 'none',
                  borderRadius: 6,
                  cursor: lines.length <= 2 ? 'not-allowed' : 'pointer',
                  opacity: lines.length <= 2 ? 0.5 : 1,
                }}
              >
                <Trash2 size={14} color="#dc2626" />
              </button>
            </div>
          ))}

          {/* Totals */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr 150px 150px 40px',
              gap: 8,
              padding: '12px 0',
              borderTop: '1px solid var(--border-light)',
              marginTop: 8,
              fontWeight: 600,
            }}
          >
            <div></div>
            <div style={{ textAlign: 'right', fontSize: 13 }}>Totaux:</div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 14, color: '#22c55e' }}>
              {formatAmount(totalDebit)}
            </div>
            <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 14, color: '#ef4444' }}>
              {formatAmount(totalCredit)}
            </div>
            <div></div>
          </div>

          {/* Balance indicator */}
          <div
            style={{
              padding: 12,
              background: isBalanced ? '#dcfce7' : '#fee2e2',
              borderRadius: 8,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            <span style={{ fontWeight: 500, color: isBalanced ? '#22c55e' : '#dc2626' }}>
              {isBalanced ? 'Écriture équilibrée ✓' : 'Écriture non équilibrée ✗'}
            </span>
            <span style={{ color: isBalanced ? '#22c55e' : '#dc2626' }}>
              Différence: {formatAmount(Math.abs(totalDebit - totalCredit))}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
          <button
            onClick={() => navigate('/accounting/entries')}
            style={{
              padding: '10px 20px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !isBalanced}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              background: isBalanced ? 'var(--primary-500)' : 'var(--text-tertiary)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: isBalanced ? 'pointer' : 'not-allowed',
            }}
          >
            <Save size={16} />
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  )
}
