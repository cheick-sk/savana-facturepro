import { useState, useEffect } from 'react'
import { Plus, Trash2, AlertCircle, Check } from 'lucide-react'
import { Account, Journal, FiscalYear, JournalEntryLine } from '../../store/accounting'
import AccountSelect from './AccountSelect'

interface JournalEntryLineInput {
  account_id: number | null
  description: string
  debit: number
  credit: number
  third_party_type: 'customer' | 'supplier' | null
  third_party_id: number | null
}

interface JournalEntryFormProps {
  accounts: Account[]
  journals: Journal[]
  fiscalYears: FiscalYear[]
  initialData?: {
    id: number
    journal_id: number
    fiscal_year_id: number
    entry_date: string
    document_date: string | null
    document_ref: string
    description: string
    lines: JournalEntryLine[]
  }
  onSubmit: (data: {
    journal_id: number
    fiscal_year_id: number
    entry_date: string
    document_date?: string
    document_ref?: string
    description: string
    lines: JournalEntryLineInput[]
  }) => void
  onCancel: () => void
  loading?: boolean
}

export default function JournalEntryForm({
  accounts,
  journals,
  fiscalYears,
  initialData,
  onSubmit,
  onCancel,
  loading = false
}: JournalEntryFormProps) {
  const [journalId, setJournalId] = useState<number>(initialData?.journal_id || 0)
  const [fiscalYearId, setFiscalYearId] = useState<number>(initialData?.fiscal_year_id || 0)
  const [entryDate, setEntryDate] = useState(initialData?.entry_date || new Date().toISOString().split('T')[0])
  const [documentDate, setDocumentDate] = useState(initialData?.document_date || '')
  const [documentRef, setDocumentRef] = useState(initialData?.document_ref || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [lines, setLines] = useState<JournalEntryLineInput[]>(
    initialData?.lines?.map(l => ({
      account_id: l.account_id,
      description: l.description || '',
      debit: l.debit,
      credit: l.credit,
      third_party_type: l.third_party_type,
      third_party_id: l.third_party_id,
    })) || [
      { account_id: null, description: '', debit: 0, credit: 0, third_party_type: null, third_party_id: null },
      { account_id: null, description: '', debit: 0, credit: 0, third_party_type: null, third_party_id: null },
    ]
  )
  
  // Calculate totals
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0)
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01
  const canSubmit = journalId && fiscalYearId && entryDate && description && lines.length >= 2 && isBalanced
  
  // Add line
  const addLine = () => {
    setLines([...lines, {
      account_id: null,
      description: '',
      debit: 0,
      credit: 0,
      third_party_type: null,
      third_party_id: null,
    }])
  }
  
  // Remove line
  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index))
    }
  }
  
  // Update line
  const updateLine = (index: number, field: keyof JournalEntryLineInput, value: any) => {
    const newLines = [...lines]
    newLines[index] = { ...newLines[index], [field]: value }
    setLines(newLines)
  }
  
  // Handle submit
  const handleSubmit = () => {
    if (!canSubmit) return
    
    onSubmit({
      journal_id: journalId,
      fiscal_year_id: fiscalYearId,
      entry_date: entryDate,
      document_date: documentDate || undefined,
      document_ref: documentRef || undefined,
      description,
      lines: lines.filter(l => l.account_id),
    })
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>
        {initialData ? 'Modifier l\'écriture' : 'Nouvelle écriture comptable'}
      </h2>
      
      {/* Header fields */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {/* Journal */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
            Journal *
          </label>
          <select
            value={journalId}
            onChange={(e) => setJournalId(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border-light)',
              borderRadius: 8,
              fontSize: 14,
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          >
            <option value={0}>Sélectionner un journal</option>
            {journals.filter(j => j.is_active).map(j => (
              <option key={j.id} value={j.id}>
                {j.code} - {j.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Fiscal Year */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
            Exercice *
          </label>
          <select
            value={fiscalYearId}
            onChange={(e) => setFiscalYearId(Number(e.target.value))}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border-light)',
              borderRadius: 8,
              fontSize: 14,
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          >
            <option value={0}>Sélectionner un exercice</option>
            {fiscalYears.filter(fy => !fy.is_closed).map(fy => (
              <option key={fy.id} value={fy.id}>
                {fy.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Entry Date */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
            Date d'écriture *
          </label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border-light)',
              borderRadius: 8,
              fontSize: 14,
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        
        {/* Document Date */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
            Date de document
          </label>
          <input
            type="date"
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border-light)',
              borderRadius: 8,
              fontSize: 14,
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        
        {/* Document Ref */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
            Référence document
          </label>
          <input
            type="text"
            value={documentRef}
            onChange={(e) => setDocumentRef(e.target.value)}
            placeholder="Ex: FAC-2024-0001"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border-light)',
              borderRadius: 8,
              fontSize: 14,
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        
        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
            Libellé *
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description de l'écriture"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border-light)',
              borderRadius: 8,
              fontSize: 14,
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>
      
      {/* Lines */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Lignes d'écriture</h3>
          <button
            onClick={addLine}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              background: 'var(--primary-500)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            Ajouter une ligne
          </button>
        </div>
        
        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr 120px 120px 40px',
            gap: 8,
            padding: '8px 12px',
            background: 'var(--bg-secondary)',
            borderRadius: '8px 8px 0 0',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          <div>Compte</div>
          <div>Description</div>
          <div style={{ textAlign: 'right' }}>Débit</div>
          <div style={{ textAlign: 'right' }}>Crédit</div>
          <div></div>
        </div>
        
        {/* Lines */}
        <div style={{ border: '1px solid var(--border-light)', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
          {lines.map((line, index) => (
            <div
              key={index}
              style={{
                display: 'grid',
                gridTemplateColumns: '200px 1fr 120px 120px 40px',
                gap: 8,
                padding: 12,
                borderBottom: index < lines.length - 1 ? '1px solid var(--border-light)' : 'none',
              }}
            >
              {/* Account */}
              <AccountSelect
                accounts={accounts}
                value={line.account_id}
                onChange={(id) => updateLine(index, 'account_id', id)}
                placeholder="Compte..."
              />
              
              {/* Description */}
              <input
                type="text"
                value={line.description}
                onChange={(e) => updateLine(index, 'description', e.target.value)}
                placeholder="Description..."
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--border-light)',
                  borderRadius: 6,
                  fontSize: 13,
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
              
              {/* Debit */}
              <input
                type="number"
                value={line.debit || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0
                  updateLine(index, 'debit', val)
                  if (val > 0) updateLine(index, 'credit', 0)
                }}
                placeholder="0.00"
                step="0.01"
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--border-light)',
                  borderRadius: 6,
                  fontSize: 13,
                  textAlign: 'right',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
              
              {/* Credit */}
              <input
                type="number"
                value={line.credit || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0
                  updateLine(index, 'credit', val)
                  if (val > 0) updateLine(index, 'debit', 0)
                }}
                placeholder="0.00"
                step="0.01"
                style={{
                  padding: '8px 12px',
                  border: '1px solid var(--border-light)',
                  borderRadius: 6,
                  fontSize: 13,
                  textAlign: 'right',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
              
              {/* Delete */}
              <button
                onClick={() => removeLine(index)}
                disabled={lines.length <= 2}
                style={{
                  padding: 6,
                  border: 'none',
                  background: 'transparent',
                  cursor: lines.length <= 2 ? 'not-allowed' : 'pointer',
                  color: lines.length <= 2 ? 'var(--text-tertiary)' : 'var(--danger-500)',
                  opacity: lines.length <= 2 ? 0.5 : 1,
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      {/* Totals */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 24,
          padding: 16,
          background: 'var(--bg-secondary)',
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total Débit</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {totalDebit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total Crédit</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {totalCredit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Statut</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 14,
              fontWeight: 500,
              color: isBalanced ? 'var(--success-600)' : 'var(--danger-500)',
            }}
          >
            {isBalanced ? <Check size={16} /> : <AlertCircle size={16} />}
            {isBalanced ? 'Équilibré' : 'Non équilibré'}
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button
          onClick={onCancel}
          disabled={loading}
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
          disabled={!canSubmit || loading}
          style={{
            padding: '10px 20px',
            background: canSubmit ? 'var(--primary-500)' : 'var(--text-tertiary)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Enregistrement...' : (initialData ? 'Modifier' : 'Créer l\'écriture')}
        </button>
      </div>
    </div>
  )
}
