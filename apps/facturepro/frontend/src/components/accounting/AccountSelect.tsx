import { useState, useEffect } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import { Account } from '../../store/accounting'

interface AccountSelectProps {
  accounts: Account[]
  value: number | null
  onChange: (accountId: number | null) => void
  accountType?: 'asset' | 'liability' | 'equity' | 'income' | 'expense'
  placeholder?: string
  disabled?: boolean
}

export default function AccountSelect({
  accounts,
  value,
  onChange,
  accountType,
  placeholder = 'Sélectionner un compte',
  disabled = false
}: AccountSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  
  // Find selected account
  useEffect(() => {
    if (value) {
      const findAccount = (accounts: Account[]): Account | null => {
        for (const acc of accounts) {
          if (acc.id === value) return acc
          if (acc.children) {
            const found = findAccount(acc.children)
            if (found) return found
          }
        }
        return null
      }
      setSelectedAccount(findAccount(accounts))
    } else {
      setSelectedAccount(null)
    }
  }, [value, accounts])
  
  // Filter accounts
  const filteredAccounts = accounts.filter(acc => {
    if (accountType && acc.account_type !== accountType) return false
    if (!acc.allow_manual_entry) return false
    if (!acc.is_active) return false
    
    if (search) {
      const searchLower = search.toLowerCase()
      return (
        acc.number.toLowerCase().includes(searchLower) ||
        acc.name.toLowerCase().includes(searchLower)
      )
    }
    return true
  })
  
  // Flatten accounts for display
  const flatAccounts: Account[] = []
  const flattenAccounts = (accounts: Account[], level: number = 0) => {
    for (const acc of accounts) {
      if (
        (!accountType || acc.account_type === accountType) &&
        acc.allow_manual_entry &&
        acc.is_active
      ) {
        flatAccounts.push({ ...acc, name: `${'  '.repeat(level)}${acc.name}` })
      }
      if (acc.children) {
        flattenAccounts(acc.children, level + 1)
      }
    }
  }
  flattenAccounts(filteredAccounts)
  
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'classe_1': '#6366f1',
      'classe_2': '#8b5cf6',
      'classe_3': '#d946ef',
      'classe_4': '#ec4899',
      'classe_5': '#f43f5e',
      'classe_6': '#f97316',
      'classe_7': '#22c55e',
      'classe_8': '#3b82f6',
    }
    return colors[category] || '#6b7280'
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 12px',
          background: disabled ? 'var(--bg-secondary)' : 'var(--bg-primary)',
          border: `1px solid ${isOpen ? 'var(--primary-500)' : 'var(--border-light)'}`,
          borderRadius: 8,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.7 : 1,
        }}
      >
        {selectedAccount ? (
          <>
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 600,
                color: getCategoryColor(selectedAccount.category),
                marginRight: 8,
                fontSize: 13,
              }}
            >
              {selectedAccount.number}
            </span>
            <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)' }}>
              {selectedAccount.name}
            </span>
          </>
        ) : (
          <span style={{ flex: 1, color: 'var(--text-tertiary)', fontSize: 14 }}>
            {placeholder}
          </span>
        )}
        <ChevronDown
          size={16}
          style={{
            color: 'var(--text-tertiary)',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
      </div>
      
      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-light)',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 50,
            maxHeight: 300,
            overflow: 'hidden',
          }}
        >
          {/* Search */}
          <div style={{ padding: 8, borderBottom: '1px solid var(--border-light)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 10px',
                background: 'var(--bg-secondary)',
                borderRadius: 6,
              }}
            >
              <Search size={14} style={{ color: 'var(--text-tertiary)', marginRight: 8 }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher..."
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 13,
                  width: '100%',
                  color: 'var(--text-primary)',
                }}
                autoFocus
              />
            </div>
          </div>
          
          {/* Account list */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {flatAccounts.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                Aucun compte trouvé
              </div>
            ) : (
              flatAccounts.map(account => (
                <div
                  key={account.id}
                  onClick={() => {
                    onChange(account.id)
                    setIsOpen(false)
                    setSearch('')
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: account.id === value ? 'var(--bg-secondary)' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (account.id !== value) {
                      e.currentTarget.style.background = 'var(--bg-hover)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (account.id !== value) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: getCategoryColor(account.category),
                      width: 50,
                      fontSize: 12,
                    }}
                  >
                    {account.number}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 13,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {account.name}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
