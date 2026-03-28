import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Filter, ChevronLeft, ChevronRight,
  Eye, CheckCircle, XCircle, FileText, Calendar, Building2
} from 'lucide-react'
import { useAccountingStore, JournalEntry } from '../../store/accounting'

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', color: '#f59e0b', bg: '#fef3c7' },
  posted: { label: 'Validé', color: '#22c55e', bg: '#dcfce7' },
  cancelled: { label: 'Annulé', color: '#ef4444', bg: '#fee2e2' },
}

export default function JournalEntriesPage() {
  const navigate = useNavigate()
  const {
    entries,
    entriesTotal,
    journals,
    fiscalYears,
    loading,
    fetchEntries,
    fetchJournals,
    fetchFiscalYears,
    postEntry,
    cancelEntry,
  } = useAccountingStore()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedJournal, setSelectedJournal] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)

  const pageSize = 20

  useEffect(() => {
    fetchJournals()
    fetchFiscalYears()
  }, [fetchJournals, fetchFiscalYears])

  useEffect(() => {
    fetchEntries({
      page,
      size: pageSize,
      search: search || undefined,
      journal_id: selectedJournal ? parseInt(selectedJournal) : undefined,
      status: selectedStatus || undefined,
      fiscal_year_id: selectedFiscalYear ? parseInt(selectedFiscalYear) : undefined,
    })
  }, [fetchEntries, page, search, selectedJournal, selectedStatus, selectedFiscalYear])

  const totalPages = Math.ceil(entriesTotal / pageSize)

  const handlePost = async (id: number) => {
    if (confirm('Valider cette écriture ?')) {
      await postEntry(id)
    }
  }

  const handleCancel = async (id: number) => {
    const reason = prompt('Raison de l\'annulation:')
    if (reason) {
      await cancelEntry(id, reason)
    }
  }

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Écritures comptables</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            Gérez vos écritures comptables OHADA
          </p>
        </div>
        <button
          onClick={() => navigate('/accounting/entries/new')}
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
          Nouvelle écriture
        </button>
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une écriture..."
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              border: '1px solid var(--border-light)',
              borderRadius: 8,
              fontSize: 14,
            }}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: showFilters ? 'var(--primary-50)' : 'var(--bg-secondary)',
            border: '1px solid var(--border-light)',
            borderRadius: 8,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          <Filter size={16} />
          Filtres
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            padding: 16,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 12,
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
              Journal
            </label>
            <select
              value={selectedJournal}
              onChange={(e) => setSelectedJournal(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-light)',
                borderRadius: 8,
                fontSize: 14,
              }}
            >
              <option value="">Tous les journaux</option>
              {journals.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.code} - {j.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
              Exercice
            </label>
            <select
              value={selectedFiscalYear}
              onChange={(e) => setSelectedFiscalYear(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-light)',
                borderRadius: 8,
                fontSize: 14,
              }}
            >
              <option value="">Tous les exercices</option>
              {fiscalYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6 }}>
              Statut
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border-light)',
                borderRadius: 8,
                fontSize: 14,
              }}
            >
              <option value="">Tous les statuts</option>
              <option value="draft">Brouillon</option>
              <option value="posted">Validé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Entries List */}
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
              gridTemplateColumns: '120px 100px 1fr 100px 120px 100px 80px',
              gap: 8,
              padding: '12px 16px',
              background: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-light)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
            }}
          >
            <div>N° Écriture</div>
            <div>Date</div>
            <div>Libellé</div>
            <div style={{ textAlign: 'right' }}>Débit</div>
            <div style={{ textAlign: 'right' }}>Crédit</div>
            <div style={{ textAlign: 'center' }}>Statut</div>
            <div style={{ textAlign: 'center' }}>Actions</div>
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
              Chargement...
            </div>
          ) : entries.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)' }}>
              <FileText size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
              <p>Aucune écriture trouvée</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 100px 1fr 100px 120px 100px 80px',
                  gap: 8,
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-light)',
                  fontSize: 13,
                  cursor: 'pointer',
                  background: selectedEntry?.id === entry.id ? 'var(--primary-50)' : 'transparent',
                }}
              >
                <div style={{ fontFamily: 'monospace', fontWeight: 500 }}>
                  {entry.entry_number}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  {new Date(entry.entry_date).toLocaleDateString('fr-FR')}
                </div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.description}
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                  {formatAmount(entry.total_debit)}
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                  {formatAmount(entry.total_credit)}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 500,
                      background: STATUS_CONFIG[entry.status].bg,
                      color: STATUS_CONFIG[entry.status].color,
                    }}
                  >
                    {STATUS_CONFIG[entry.status].label}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedEntry(entry)
                    }}
                    style={{
                      padding: 4,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-tertiary)',
                    }}
                    title="Voir détails"
                  >
                    <Eye size={16} />
                  </button>
                  {entry.status === 'draft' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePost(entry.id)
                      }}
                      style={{
                        padding: 4,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#22c55e',
                      }}
                      title="Valider"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                  {entry.status === 'posted' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCancel(entry.id)
                      }}
                      style={{
                        padding: 4,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ef4444',
                      }}
                      title="Annuler"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderTop: '1px solid var(--border-light)',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {entriesTotal} écritures
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: '6px 12px',
                    background: page === 1 ? 'var(--bg-secondary)' : 'var(--primary-500)',
                    color: page === 1 ? 'var(--text-tertiary)' : '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ padding: '6px 12px', fontSize: 13 }}>
                  Page {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: '6px 12px',
                    background: page === totalPages ? 'var(--bg-secondary)' : 'var(--primary-500)',
                    color: page === totalPages ? 'var(--text-tertiary)' : '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Entry Details */}
        <div
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 12,
            padding: 16,
            height: 'fit-content',
          }}
        >
          {selectedEntry ? (
            <>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginTop: 0, marginBottom: 16 }}>
                Détails de l'écriture
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>N° Écriture</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {selectedEntry.entry_number}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Date</span>
                  <span>{new Date(selectedEntry.entry_date).toLocaleDateString('fr-FR')}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Journal</span>
                  <span>{selectedEntry.journal?.code} - {selectedEntry.journal?.name}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Exercice</span>
                  <span>{selectedEntry.fiscal_year?.name}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>Statut</span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 500,
                      background: STATUS_CONFIG[selectedEntry.status].bg,
                      color: STATUS_CONFIG[selectedEntry.status].color,
                    }}
                  >
                    {STATUS_CONFIG[selectedEntry.status].label}
                  </span>
                </div>

                <div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 12, marginBottom: 4 }}>Libellé</div>
                  <div style={{ fontSize: 14 }}>{selectedEntry.description}</div>
                </div>

                {/* Lines */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: 12, marginBottom: 8 }}>
                    Lignes de l'écriture
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedEntry.lines?.map((line, idx) => (
                      <div
                        key={line.id}
                        style={{
                          padding: 8,
                          background: 'var(--bg-secondary)',
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 500 }}>{line.account?.number}</span>
                          <span style={{ color: 'var(--text-tertiary)' }}>{line.account?.name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#22c55e' }}>
                            D: {formatAmount(line.debit)}
                          </span>
                          <span style={{ color: '#ef4444' }}>
                            C: {formatAmount(line.credit)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-light)',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Total Débit</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                      {formatAmount(selectedEntry.total_debit)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Total Crédit</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                      {formatAmount(selectedEntry.total_credit)}
                    </div>
                  </div>
                </div>

                {/* Balance indicator */}
                <div
                  style={{
                    padding: 8,
                    background: selectedEntry.is_balanced ? '#dcfce7' : '#fee2e2',
                    borderRadius: 6,
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: 500,
                    color: selectedEntry.is_balanced ? '#22c55e' : '#ef4444',
                  }}
                >
                  {selectedEntry.is_balanced ? 'Écriture équilibrée ✓' : 'Écriture non équilibrée ✗'}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 40 }}>
              <FileText size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
              <p>Sélectionnez une écriture pour voir les détails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
